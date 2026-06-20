require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const http = require('http');
const { WebSocketServer } = require('ws');
const PDFDocument = require('pdfkit');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-do-not-use-in-production');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vincentit.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10) : null;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

let broadcastChat = null;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
}

// Multer file upload config
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
    dest: uploadsDir,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.pptx', '.ppt'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext) || !ext);
    }
});

// Database backup
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function backupDatabase() {
    try {
        if (!fs.existsSync(DB_PATH)) return;
        const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = path.join(BACKUP_DIR, `data-backup-${date}.db`);
        fs.copyFileSync(DB_PATH, backupPath);
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('data-backup-'))
            .sort()
            .reverse();
        if (backups.length > 48) {
            backups.slice(48).forEach(f => {
                try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
            });
        }
        console.log('DB backup created:', backupPath);
    } catch (e) {
        console.error('Backup failed:', e.message);
    }
}

// Email sending via Brevo API (uses HTTPS — never blocked by hosts)
function sendEmailViaAPI({ to, subject, html, attachment } = {}) {
    const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;
    if (!apiKey) return;
    const recipients = Array.isArray(to) ? to : [{ email: to || ADMIN_EMAIL }];
    const payload = {
        sender: { name: 'Vincent IT', email: 'codingpredators@gmail.com' },
        to: typeof recipients === 'string' ? [{ email: recipients }] : recipients,
        subject,
        htmlContent: html
    };
    if (attachment) {
        payload.attachment = [{
            name: attachment.filename,
            content: attachment.content.toString('base64')
        }];
    }
    const https = require('https');
    const data = JSON.stringify(payload);
    const req = https.request({
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    });
    req.on('error', err => console.error('Email send failed:', err.message));
    req.on('response', res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Email sent successfully via Brevo');
            } else {
                console.error('Brevo API error [' + res.statusCode + ']:', body.substring(0, 500));
            }
        });
    });
    req.write(data);
    req.end();
}

function sendEmailAlert({ subject, html, to }) {
    if (!process.env.BREVO_API_KEY && !process.env.SMTP_PASS) return;
    const recipients = to || ADMIN_EMAIL;
    const prefix = to ? '' : '[Vincent IT] ';
    sendEmailViaAPI({ to: recipients, subject: `${prefix}${subject}`, html });
}

function sendEmailWithAttachment({ to, subject, html, attachment }) {
    if (!process.env.BREVO_API_KEY && !process.env.SMTP_PASS) return;
    sendEmailViaAPI({ to, subject, html, attachment });
}

function generateInvoicePDF(order, items) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        
        doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Vincent IT Freelancer', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text('Invoice: INV-' + Date.now().toString(36).toUpperCase());
        doc.text('Date: ' + new Date().toLocaleDateString('en-ZA'));
        doc.text('Client: ' + (order.client_name || 'N/A'));
        doc.text('Email: ' + (order.client_email || 'N/A'));
        doc.moveDown();
        doc.fontSize(10).text('Service: ' + (order.service || 'N/A'));
        doc.text('Price: ' + (order.price || 'N/A'));
        if (items && items.length) {
            doc.moveDown().fontSize(11).font('Helvetica-Bold').text('Items:');
            doc.fontSize(10).font('Helvetica');
            items.forEach(item => {
                doc.text('  - ' + (item.title || 'Item') + ' x' + (item.qty || 1) + ' @ R' + (item.price || 0));
            });
        }
        doc.moveDown().moveDown();
        doc.fontSize(9).fillColor('#666').text('Thank you for your business!', { align: 'center' });
        doc.text('Payment: TymeBank a/c 51135445245 or PayShap 0677834591', { align: 'center' });
        doc.end();
    });
}

// WhatsApp notification via UltraMsg (free, no template approval needed)
function sendWhatsApp({ to, message }) {
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    if (!instanceId || !token) return;
    const https = require('https');
    const data = `token=${encodeURIComponent(token)}&to=${encodeURIComponent(to)}&body=${encodeURIComponent(message)}`;
    const req = https.request({
        hostname: 'api.ultramsg.com',
        port: 443,
        path: `/${instanceId}/messages/chat`,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
    });
    req.on('error', err => console.error('WhatsApp send failed:', err.message));
    req.write(data);
    req.end();
}

function notifyCustomer({ name, email, phone, message }) {
    if (phone) sendWhatsApp({ to: phone.replace(/[^0-9]/g, ''), message });
    if (email) sendEmailAlert({ to: email, subject: 'Vincent IT Freelancer', html: `<p>${message.replace(/\n/g, '<br>')}</p>` });
}

function notifyAdminWhatsApp(message) {
    const adminPhone = process.env.WHATSAPP_NUMBER;
    if (adminPhone) sendWhatsApp({ to: adminPhone.replace(/[^0-9]/g, ''), message });
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.tailwindcss.com", "cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "cdn.tailwindcss.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "cdn.tailwindcss.com"],
            formAction: ["'self'"],
            frameSrc: ["'self'", "https://www.google.com"],
            frameAncestors: ["'self'"]
        }
    }
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

// Health check (MUST be first route — Render uses this before any middleware)
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/health', (req, res) => res.status(200).send('ok'));

// ===== SMS via Africa's Talking (free tier) =====
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY || '';
function sendSMS({ to, message }) {
    if (!AT_API_KEY || AT_USERNAME === 'sandbox' && process.env.NODE_ENV === 'production') return;
    const https = require('https');
    const data = JSON.stringify({ username: AT_USERNAME, to: to.replace(/[^0-9]/g, ''), message: message.substring(0, 160) });
    const req = https.request({
        hostname: 'api.africastalking.com',
        port: 443,
        path: '/version1/messaging',
        method: 'POST',
        headers: { 'ApiKey': AT_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    req.on('error', err => console.error('SMS send failed:', err.message));
    req.write(data);
    req.end();
}

// ===== Admin Audit Log =====
function addAuditLog({ action, details, admin }) {
    db.insert('audit_logs', {
        id: uuidv4(),
        action: action.substring(0, 200),
        details: (details || '').substring(0, 1000),
        admin: admin || 'system',
        ip: '',
        created_at: new Date().toISOString()
    });
}

app.get('/api/admin/audit-logs', authenticateToken, (req, res) => {
    const logs = db.query('audit_logs', null);
    res.json(logs.reverse());
});

// ===== Blog Categories & Tags =====
app.get('/api/blog/paginated', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const category = req.query.category || '';
    const tag = req.query.tag || '';
    let posts = db.query('blog_posts', p => p.published !== 0);
    if (category) posts = posts.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
    if (tag) posts = posts.filter(p => (p.tags || '').toLowerCase().split(',').map(t => t.trim()).includes(tag.toLowerCase()));
    posts = posts.reverse();
    const total = posts.length;
    const totalPages = Math.ceil(total / limit);
    const paged = posts.slice((page - 1) * limit, page * limit);
    res.json({ posts: paged, total, totalPages, page, limit });
});

app.get('/api/blog/tags', (req, res) => {
    const posts = db.query('blog_posts', p => p.published !== 0);
    const tagCount = {};
    posts.forEach(p => {
        (p.tags || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
            tagCount[t] = (tagCount[t] || 0) + 1;
        });
    });
    const tags = Object.entries(tagCount).map(([tag, count]) => ({ tag, count }));
    res.json(tags);
});

app.get('/api/blog/categories', (req, res) => {
    const posts = db.query('blog_posts', p => p.published !== 0);
    const catCount = {};
    posts.forEach(p => {
        const cat = (p.category || 'Uncategorized').trim();
        catCount[cat] = (catCount[cat] || 0) + 1;
    });
    res.json(Object.entries(catCount).map(([category, count]) => ({ category, count })));
});

// ===== File Vault (Admin uploads files for clients) =====
const vaultDir = path.join(__dirname, '..', 'vault');
if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

app.post('/api/admin/vault/upload', authenticateToken, upload.array('files', 10), (req, res) => {
    const { client_email, client_name, notes } = req.body;
    if (!client_email) return res.status(400).json({ error: 'Client email required' });
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
    const files = req.files.map(f => ({
        original: f.originalname,
        size: f.size,
        path: f.filename,
        uploaded_at: new Date().toISOString()
    }));
    const vaultEntry = db.insert('vault_files', {
        id: uuidv4(),
        client_email: client_email.trim().toLowerCase(),
        client_name: (client_name || '').trim(),
        notes: (notes || '').trim(),
        files,
        created_at: new Date().toISOString()
    });
    addAuditLog({ action: 'Vault upload', details: `${files.length} file(s) vaulted for ${client_email}`, admin: req.user.email });
    res.json({ success: true, vaultEntry });
});

app.get('/api/client/vault', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const entries = db.query('vault_files', v => v.client_email.toLowerCase() === email.toLowerCase());
    entries.forEach(e => {
        e.files = (e.files || []).map(f => ({
            ...f,
            download_url: `/api/client/vault/download/${e.id}/${encodeURIComponent(f.path)}?name=${encodeURIComponent(f.original)}`
        }));
    });
    res.json(entries.reverse());
});

app.get('/api/client/vault/download/:entryId/:filePath', (req, res) => {
    const { entryId, filePath } = req.params;
    const entries = db.query('vault_files', v => v.id === entryId);
    if (!entries.length) return res.status(404).json({ error: 'Entry not found' });
    const entry = entries[0];
    const file = entry.files.find(f => f.path === filePath);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const absPath = path.join(uploadsDir, file.path);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found on server' });
    res.download(absPath, req.query.name || file.original);
});

app.get('/api/admin/vault', authenticateToken, (req, res) => {
    const entries = db.query('vault_files', null);
    res.json(entries.reverse());
});

// ===== Invoice History =====
app.get('/api/client/invoices', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const orders = db.query('orders', o => o.client_email.toLowerCase() === email.toLowerCase());
    const templateOrders = db.query('template_orders', o => o.client_email.toLowerCase() === email.toLowerCase());
    const invoices = [...orders, ...templateOrders].map(o => ({
        id: o.id,
        client_name: o.client_name,
        client_email: o.client_email,
        service: o.service || o.template_id,
        price: o.price,
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.created_at,
        invoice_number: 'INV-' + o.id.slice(0, 8).toUpperCase()
    }));
    res.json(invoices.reverse());
});

app.get('/api/client/invoices/:id/pdf', async (req, res) => {
    const { id } = req.params;
    let order = null;
    let o = db.query('orders', o2 => o2.id === id);
    if (o.length) order = o[0];
    if (!order) { o = db.query('template_orders', o2 => o2.id === id); if (o.length) order = o[0]; }
    if (!order) return res.status(404).json({ error: 'Invoice not found' });
    let items = [];
    try { if (order.cart_items) items = typeof order.cart_items === 'string' ? JSON.parse(order.cart_items) : order.cart_items; } catch {}
    const pdfBuffer = await generateInvoicePDF(order, items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=INV-${id.slice(0, 8).toUpperCase()}.pdf`);
    res.send(pdfBuffer);
});

// ===== Appointment Availability (30-min slots) =====
const WORK_HOURS = { start: 8, end: 17 };
app.get('/api/appointments/available', (req, res) => {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'Date required' });
    const day = new Date(date + 'T00:00:00');
    if (day.getDay() === 0 || day.getDay() === 6) return res.json({ slots: [], message: 'No appointments on weekends' });
    const appointments = db.query('appointments', a => a.date === date && a.status !== 'cancelled');
    const booked = appointments.map(a => a.time);
    const slots = [];
    for (let h = WORK_HOURS.start; h < WORK_HOURS.end; h++) {
        for (let m = 0; m < 60; m += 30) {
            const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            if (!booked.includes(time)) slots.push(time);
        }
    }
    res.json({ slots, date });
});

// CSRF origin check for state-changing requests
app.use((req, res, next) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/api/clients/')) {
        const origin = req.headers['origin'] || '';
        const referer = req.headers['referer'] || '';
        if (origin || referer) {
            if (CORS_ORIGIN === '*') { next(); return; }
            const allowed = CORS_ORIGIN.split(',').map(s => s.trim());
            const source = origin || referer.replace(/\/+$/, '');
            const match = allowed.some(a => a && source.startsWith(a));
            if (!match) return res.status(403).json({ error: 'CSRF check failed' });
        }
    }
    next();
});

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests, please try again later' }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, please try again later' }
});
app.use('/api/', apiLimiter);

// ===== Visitor Tracking =====
function detectDeviceType(ua) {
    if (!ua) return 'desktop';
    const d = ua.toLowerCase();
    if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(d)) return 'tablet';
    if (/mobi|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop|android.*mobile/i.test(d)) return 'mobile';
    return 'desktop';
}

app.post('/api/visit', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] || '';
    const path = req.body.path || '/';
    db.insert('visitors', {
        id: uuidv4(),
        ip,
        user_agent: ua.substring(0, 300),
        device_type: detectDeviceType(ua),
        referrer: referrer.substring(0, 500),
        path: path.substring(0, 200),
        created_at: new Date().toISOString()
    });
    res.json({ success: true });
});

app.get('/api/visitors', authenticateToken, (req, res) => {
    const visitors = db.query('visitors', null);
    const unique = new Set(visitors.map(v => v.ip));
    const desktop = visitors.filter(v => (v.device_type || 'desktop') === 'desktop').length;
    const mobile = visitors.filter(v => v.device_type === 'mobile').length;
    const tablet = visitors.filter(v => v.device_type === 'tablet').length;
    res.json({
        total: visitors.length,
        unique: unique.size,
        today: visitors.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length,
        desktop, mobile, tablet,
        recent: visitors.slice(-100).reverse()
    });
});

// Static files
app.use(express.static(path.join(__dirname, '..')));

// Serve favicon.ico from SVG icon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'img', 'icon-192.svg'));
});

// JWT auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

// Input validation helpers
function validate(fields) {
    return (req, res, next) => {
        const errors = [];
        for (const field of fields) {
            const val = req.body[field.name];
            if (field.required && (!val || (typeof val === 'string' && !val.trim()))) {
                errors.push(`${field.label || field.name} is required`);
            }
            if (val && field.maxLength && typeof val === 'string' && val.length > field.maxLength) {
                errors.push(`${field.label || field.name} exceeds maximum length of ${field.maxLength}`);
            }
            if (val && field.type === 'email' && typeof val === 'string') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(val)) errors.push(`Invalid email format for ${field.label || field.name}`);
            }
        }
        if (errors.length) return res.status(400).json({ error: errors.join('; ') });
        next();
    };
}

// ===== Admin Auth =====
app.post('/api/admin/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (email !== ADMIN_EMAIL) return res.status(401).json({ error: 'Invalid credentials' });
    try {
        if (!ADMIN_PASSWORD_HASH) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        notifyAdminWhatsApp(`Admin logged in: ${email}`);
        res.json({ success: true, token });
    } catch {
        res.status(500).json({ error: 'Login failed' });
    }
});

// ===== Contacts =====
app.post('/api/contact', validate([
    { name: 'name', label: 'Name', required: true, maxLength: 100 },
    { name: 'email', label: 'Email', required: true, type: 'email', maxLength: 200 },
    { name: 'message', label: 'Message', required: true, maxLength: 5000 }
]), (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    const sanitized = {
        name: name.trim().replace(/<[^>]*>/g, ''),
        email: email.trim().toLowerCase(),
        phone: (phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
        subject: (subject || '').trim().replace(/<[^>]*>/g, ''),
        message: message.trim().replace(/<[^>]*>/g, '')
    };
    db.insert('contacts', { id: uuidv4(), ...sanitized, created_at: new Date().toISOString() });
    sendEmailAlert({
        subject: `New Contact from ${sanitized.name}`,
        html: `<h2>New Contact Message</h2><p><strong>Name:</strong> ${sanitized.name}</p><p><strong>Email:</strong> ${sanitized.email}</p><p><strong>Phone:</strong> ${sanitized.phone || 'N/A'}</p><p><strong>Subject:</strong> ${sanitized.subject || 'N/A'}</p><p><strong>Message:</strong> ${sanitized.message}</p>`
    });
    notifyAdminWhatsApp(`New Contact!\n${sanitized.name}\n${sanitized.email}\n${sanitized.message.slice(0,100)}`);
    res.json({ success: true, message: 'Message received! We will get back to you shortly.' });
});

app.get('/api/contacts', authenticateToken, (req, res) => {
    const contacts = db.query('contacts', null);
    res.json(contacts.reverse());
});

// ===== Template Downloads =====
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Purchase a template - creates an order and generates download token
const templatePrices = { 'cv-classic': 'R150', 'cv-modern': 'R150', 'cv-executive': 'R200', 'cv-minimal': 'R100', 'pulse': 'R500', 'fitforge': 'R700', 'portfolio': 'R500' };

app.post('/api/templates/purchase', validate([
    { name: 'client_name', label: 'Client name', required: true, maxLength: 100 },
    { name: 'client_email', label: 'Email', required: true, type: 'email', maxLength: 200 },
    { name: 'template_id', label: 'Template ID', required: true, maxLength: 50 }
]), (req, res) => {
    const { client_name, client_email, client_phone, template_id } = req.body;
    const price = templatePrices[template_id];
    if (!price) return res.status(400).json({ error: 'Invalid template' });
    const token = generateToken();
    const id = uuidv4();
    const order = {
        id,
        client_name: client_name.trim().replace(/<[^>]*>/g, ''),
        client_email: client_email.trim().toLowerCase(),
        client_phone: (client_phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
        service: 'CV Template - ' + template_id,
        template_id,
        download_token: token,
        price,
        status: 'pending',
        payment_status: 'unpaid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    db.insert('template_orders', order);
    notifyAdminWhatsApp(`New Template Order!\n${order.client_name}\n${template_id}\n${price}\nOrder: ${id.slice(0,8)}...`);
    notifyCustomer({
        name: order.client_name, email: order.client_email, phone: order.client_phone,
        message: `Hi ${order.client_name},\n\nYour template order (${template_id}) for ${price} is received!\nOrder ID: ${id}\n\nPay via TymeBank a/c 51135445245 or PayShap 0677834591, then upload proof on the website.\n\n- Vincent IT Freelancer`
    });
    res.json({ success: true, order_id: id, download_token: token, price, message: 'Template order created! Pay via banking details shown and upload proof.' });
});

// Verify payment and get download link
app.get('/api/templates/download/:token', (req, res) => {
    const { token } = req.params;
    const orders = db.query('template_orders', o => o.download_token === token);
    if (!orders.length) return res.status(404).json({ error: 'Invalid or expired download link' });
    const order = orders[0];
    if (order.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not confirmed yet. Please complete payment and share your Order ID with us on WhatsApp.', order_id: order.id });
    const validFiles = {
        'cv-classic': { path: 'templates/cv/classic.html', name: 'classic-cv-template.html' },
        'cv-modern': { path: 'templates/cv/modern.html', name: 'modern-cv-template.html' },
        'cv-executive': { path: 'templates/cv/executive.html', name: 'executive-cv-template.html' },
        'cv-minimal': { path: 'templates/cv/minimal.html', name: 'minimal-cv-template.html' },
        'pulse': { path: 'templates/pulse.zip', name: 'pulse-saas-landing-page.zip' },
        'fitforge': { path: 'templates/fitforge.zip', name: 'fitforge-fitness-coach-template.zip' },
        'portfolio': { path: 'templates/portfolio.zip', name: 'interactive-portfolio-template.zip' }
    };
    const fileInfo = validFiles[order.template_id];
    if (!fileInfo) return res.status(404).json({ error: 'Template file not found' });
    const absPath = path.join(__dirname, '..', fileInfo.path);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'Template file not found on server' });
    res.download(absPath, fileInfo.name);
});

// Admin: confirm payment and mark template as paid
app.post('/api/admin/templates/confirm-payment', authenticateToken, (req, res) => {
    const { order_id } = req.body;
    const updated = db.update('template_orders', order_id, { payment_status: 'paid', status: 'completed', updated_at: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    notifyClient(order_id, 'paid');
    notifyCustomer({
        name: updated.client_name, email: updated.client_email, phone: updated.client_phone,
        message: `Hi ${updated.client_name},\n\nYour payment for template ${updated.template_id} has been confirmed!\nDownload link: ${process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com'}/api/templates/download/${updated.download_token}\n\nThank you for your business!\n- Vincent IT Freelancer`
    });
    sendEmailAlert({
        to: updated.client_email,
        subject: 'Payment Confirmed – Download Your Template',
        html: `<h2>Payment Confirmed!</h2><p>Hi ${updated.client_name},</p><p>Your payment for <strong>${updated.template_id}</strong> has been confirmed.</p><p>Download your template here: <a href="${process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com'}/api/templates/download/${updated.download_token}">Download Link</a></p><p>– Vincent IT Freelancer</p>`
    });
    res.json({ success: true, download_token: updated.download_token, message: 'Payment confirmed. Download link sent to client via email and WhatsApp.' });
});

// Admin: confirm payment for service orders
app.post('/api/admin/orders/confirm-payment', authenticateToken, (req, res) => {
    backupDatabase();
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });
    const now = new Date().toISOString();
    const existing = db.query('orders', o => o.id === order_id);
    const history = existing.length ? (existing[0].status_history || []) : [];
    history.push({ from: existing[0].status, to: 'paid', at: now });
    const updated = db.update('orders', order_id, { payment_status: 'paid', status: 'paid', status_history: history, updated_at: now });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    notifyClient(order_id, 'paid');
    res.json({ success: true, message: 'Payment confirmed.' });
});

// ===== Automated Follow-ups =====
function scheduleFollowUp({ orderId, clientName, clientEmail, clientPhone, type, delayMs }) {
    const at = new Date(Date.now() + delayMs).toISOString();
    db.insert('followups', {
        id: uuidv4(),
        order_id: orderId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        type,
        status: 'pending',
        scheduled_at: at,
        created_at: new Date().toISOString()
    });
}

function processFollowUps() {
    const now = new Date().toISOString();
    const due = db.query('followups', f => f.status === 'pending' && f.scheduled_at <= now);
    due.forEach(f => {
        try {
            if (f.type === 'review_request') {
                const reviewUrl = (process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com') + '/#reviews';
                notifyCustomer({
                    name: f.client_name, email: f.client_email, phone: f.client_phone,
                    message: `Hi ${f.client_name},\n\nYour order was completed recently. We'd love to hear your feedback!\n\nLeave a review here: ${reviewUrl}\n\nYour review helps others trust us. Thank you!\n\n- Vincent IT Freelancer`
                });
                sendEmailAlert({
                    to: f.client_email,
                    subject: 'How was your experience? Leave a review!',
                    html: `<h2>We value your feedback!</h2><p>Hi ${f.client_name},</p><p>Your recent order was completed. We'd love to hear about your experience.</p><p><a href="${reviewUrl}" style="display:inline-block;padding:0.6rem 1.5rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-top:0.5rem">Leave a Review</a></p><p>– Vincent IT Freelancer</p>`
                });
            } else if (f.type === 'discount_offer') {
                const discountCode = 'VIN10-' + Math.random().toString(36).substr(2, 6).toUpperCase();
                notifyCustomer({
                    name: f.client_name, email: f.client_email, phone: f.client_phone,
                    message: `Hi ${f.client_name},\n\nAs a thank you for your recent order, here's a special 10% discount on your next service!\n\nDiscount Code: ${discountCode}\n\nUse this code when placing your next order to save 10%.\n\nValid for your next service within 90 days.\n\n- Vincent IT Freelancer`
                });
                sendEmailAlert({
                    to: f.client_email,
                    subject: '10% Discount – Thank you for your order!',
                    html: `<h2>Exclusive Discount Just for You!</h2><p>Hi ${f.client_name},</p><p>Thanks for choosing Vincent IT! As a token of appreciation, here's <strong>10% off</strong> your next service.</p><p><strong>Discount Code:</strong> <span style="font-size:1.2rem;background:#12122a;padding:0.3rem 0.8rem;border-radius:6px;border:1px dashed #00d4ff;color:#00d4ff;font-weight:700;letter-spacing:1px">${discountCode}</span></p><p>Valid for 90 days on any service.</p><p>– Vincent IT Freelancer</p>`
                });
            } else if (f.type === 'followup_check') {
                const orderInquiries = db.query('orders', o => o.id === f.order_id);
                if (orderInquiries.length && orderInquiries[0].status === 'completed') {
                    notifyCustomer({
                        name: f.client_name, email: f.client_email, phone: f.client_phone,
                        message: `Hi ${f.client_name},\n\nJust checking in! Hope everything is working well with your order.\n\nIf you have any questions or need further assistance, reply to this message or WhatsApp 067 783 4591.\n\n- Vincent IT Freelancer`
                    });
                }
            }
            db.update('followups', f.id, { status: 'sent', sent_at: new Date().toISOString() });
        } catch (e) {
            console.error('Follow-up send failed:', e.message);
            db.update('followups', f.id, { status: 'failed', error: e.message });
        }
    });
}

// Admin: mark service order as completed
app.post('/api/admin/orders/complete', authenticateToken, (req, res) => {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });
    const now = new Date().toISOString();
    const existing = db.query('orders', o => o.id === order_id);
    if (!existing.length) return res.status(404).json({ error: 'Order not found' });
    const order = existing[0];
    const history = order.status_history || [];
    history.push({ from: order.status, to: 'completed', at: now });
    const updated = db.update('orders', order_id, { status: 'completed', status_history: history, updated_at: now });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    notifyClient(order_id, 'completed');
    sendEmailAlert({
        to: updated.client_email,
        subject: 'Order Completed – ' + order_id.slice(0, 8),
        html: `<h2>Service Completed!</h2><p>Hi ${updated.client_name},</p><p>Your order <strong>${order_id.slice(0, 8)}</strong> has been marked as completed.</p><p>Your item/service is ready. Contact us on WhatsApp if you need anything else.</p><p>– Vincent IT Freelancer</p>`
    });
    scheduleFollowUp({ orderId: order_id, clientName: updated.client_name, clientEmail: updated.client_email, clientPhone: updated.client_phone || '', type: 'review_request', delayMs: 60 * 60 * 1000 });
    scheduleFollowUp({ orderId: order_id, clientName: updated.client_name, clientEmail: updated.client_email, clientPhone: updated.client_phone || '', type: 'discount_offer', delayMs: 3 * 24 * 60 * 60 * 1000 });
    scheduleFollowUp({ orderId: order_id, clientName: updated.client_name, clientEmail: updated.client_email, clientPhone: updated.client_phone || '', type: 'followup_check', delayMs: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, message: 'Order marked as completed.' });
});

// Admin: get all template orders
app.get('/api/admin/template-orders', authenticateToken, (req, res) => {
    const orders = db.query('template_orders', null);
    res.json((orders || []).reverse());
});

// ===== Appointments =====
app.post('/api/appointments', validate([
    { name: 'client_name', label: 'Client name', required: true, maxLength: 100 },
    { name: 'client_email', label: 'Email', required: true, type: 'email', maxLength: 200 },
    { name: 'service', label: 'Service', required: true, maxLength: 100 },
    { name: 'date', label: 'Date', required: true, maxLength: 20 },
    { name: 'time', label: 'Time', required: true, maxLength: 20 }
]), (req, res) => {
    const { client_name, client_email, client_phone, service, date, time, notes } = req.body;
    db.insert('appointments', {
        id: uuidv4(),
        client_name: client_name.trim().replace(/<[^>]*>/g, ''),
        client_email: client_email.trim().toLowerCase(),
        client_phone: (client_phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
        service: service.trim(),
        date, time,
        notes: (notes || '').trim().replace(/<[^>]*>/g, ''),
        status: 'pending',
        created_at: new Date().toISOString()
    });
    sendEmailAlert({
        subject: `New Appointment: ${client_name}`,
        html: `<h2>New Appointment Booking</h2><p><strong>Client:</strong> ${client_name}</p><p><strong>Email:</strong> ${client_email}</p><p><strong>Phone:</strong> ${client_phone || 'N/A'}</p><p><strong>Service:</strong> ${service}</p><p><strong>Date:</strong> ${date}</p><p><strong>Time:</strong> ${time}</p><p><strong>Notes:</strong> ${notes || 'N/A'}</p>`
    });
    notifyAdminWhatsApp(`New Appointment!\n${client_name}\n${service}\n${date} at ${time}`);
    notifyCustomer({
        name: client_name, email: client_email, phone: client_phone,
        message: `Hi ${client_name},\n\nYour appointment is booked!\nService: ${service}\nDate: ${date}\nTime: ${time}\n\nWe will confirm shortly. Stay tuned!\n\n- Vincent IT Freelancer`
    });
    res.json({ success: true, message: 'Appointment booked! We will confirm shortly.' });
});

app.get('/api/appointments', authenticateToken, (req, res) => {
    const { email } = req.query;
    const appointments = db.query('appointments', email ? a => a.client_email.toLowerCase() === email.toLowerCase() : null);
    res.json(appointments.reverse());
});

app.patch('/api/appointments/:id', authenticateToken, (req, res) => {
    const { status } = req.body;
    const updated = db.update('appointments', req.params.id, { status });
    res.json({ success: true });
    if (updated && status) {
        notifyAdminWhatsApp(`Appointment ${status}: ${updated.client_name} - ${updated.service} on ${updated.date}`);
    }
});

// ===== Orders =====
app.post('/api/orders', validate([
    { name: 'client_name', label: 'Client name', required: true, maxLength: 100 },
    { name: 'client_email', label: 'Email', required: true, type: 'email', maxLength: 200 },
    { name: 'service', label: 'Service', required: true, maxLength: 500 }
]), (req, res) => {
    backupDatabase();
    const { client_name, client_email, client_phone, service, price, cart_items } = req.body;
    if (price) {
        const priceNum = parseFloat(String(price).replace(/[^0-9.]/g, ''));
        if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'Invalid price' });
        if (priceNum > 999999) return res.status(400).json({ error: 'Price exceeds maximum allowed (R999,999)' });
    }
    const id = uuidv4();
    let items = [];
    try { if (cart_items) items = typeof cart_items === 'string' ? JSON.parse(cart_items) : cart_items; } catch {}
    if (items.length) {
        for (const item of items) {
            if (!item.title || !item.price || item.price <= 0) return res.status(400).json({ error: 'Invalid cart item data' });
        }
    }
    const discountCode = req.body.discount_code || '';
    if (discountCode) {
        const used = db.query('discount_usage', d => d.code === discountCode);
        if (!used.length) {
            db.insert('discount_usage', { id: uuidv4(), code: discountCode, order_id: id, used_at: new Date().toISOString(), client_email: (client_email || '').trim().toLowerCase() });
        }
    }
    const now = new Date().toISOString();
    db.insert('orders', {
        id,
        client_name: client_name.trim().replace(/<[^>]*>/g, ''),
        client_email: client_email.trim().toLowerCase(),
        client_phone: (client_phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
        service: service.trim(),
        price: (price || '').trim(),
        cart_items: items.length ? JSON.stringify(items) : '',
        discount_code: discountCode,
        status: 'pending',
        payment_status: 'unpaid',
        deposit_paid: 0,
        status_history: [{ from: 'created', to: 'pending', at: now }],
        created_at: now,
        updated_at: now
    });
    sendEmailAlert({
        subject: `New Order from ${client_name}`,
        html: `<h2>New Service Order</h2><p><strong>Client:</strong> ${client_name}</p><p><strong>Email:</strong> ${client_email}</p><p><strong>Phone:</strong> ${client_phone || 'N/A'}</p><p><strong>Service:</strong> ${service}</p><p><strong>Price:</strong> ${price || 'N/A'}</p><p><strong>Order ID:</strong> ${id}</p>${items.length ? '<h3>Items:</h3><ul>' + items.map(function(i) { return '<li>' + (i.title || 'Item') + ' x' + (i.qty || 1) + (i.price ? ' @ R' + i.price : ''); }).join('') + '</ul>' : ''}`
    });
    notifyAdminWhatsApp(`New Order!\n${client_name}\n${service}\nR${price || 'N/A'}\nOrder: ${id.slice(0,8)}...`);
    if (client_email) {
        sendEmailAlert({
            to: client_email,
            subject: `Order Confirmation – ${id}`,
            html: `<h2>Thank you for your order, ${client_name}!</h2><p>Your order <strong>${id}</strong> has been received.</p><p><strong>Service:</strong> ${service}</p><p><strong>Price:</strong> ${price || 'N/A'}</p><p><strong>To pay:</strong> TymeBank a/c 51135445245 (branch 678910) or PayShap 0677834591</p><p>After payment, upload proof on the website and click "I Have Paid".</p><p>– Vincent IT Freelancer</p>`
        });
    }
    notifyCustomer({
        name: client_name, email: client_email, phone: client_phone,
        message: `Hi ${client_name},\n\nYour order is confirmed!\nOrder ID: ${id}\nService: ${service}\nPrice: ${price || 'N/A'}\n\nPay via TymeBank a/c 51135445245 or PayShap 0677834591. Upload proof on the website.\nTrack your order in the Client Portal.\n\n- Vincent IT Freelancer`
    });
    try {
        generateInvoicePDF({
            client_name: client_name.trim(),
            client_email: client_email.trim().toLowerCase(),
            service: service.trim(),
            price: (price || '').trim()
        }, items).then(pdfBuffer => {
            sendEmailWithAttachment({
                to: client_email.trim().toLowerCase(),
                subject: 'Invoice – ' + id,
                html: `<h2>Invoice for your order</h2><p>Hi ${client_name.trim()},</p><p>Your order <strong>${id}</strong> has been confirmed. Please find your invoice attached.</p><p>Pay via TymeBank a/c <strong>51135445245</strong> (branch 678910) or PayShap <strong>0677834591</strong>. Upload proof in your checkout page.</p><p>– Vincent IT Freelancer</p>`,
                attachment: { filename: 'Invoice-' + id.slice(0,8) + '.pdf', content: pdfBuffer, contentType: 'application/pdf' }
            });
        });
    } catch (e) { console.error('Invoice PDF error:', e.message); }
    res.json({ success: true, order_id: id, message: 'Order created!' });
});

app.get('/api/orders', (req, res) => {
    const { email } = req.query;
    if (email) {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
        const token = authHeader.split(' ')[1];
        return jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ error: 'Invalid token' });
            if (decoded.role !== 'admin' && decoded.email && decoded.email.toLowerCase() !== email.toLowerCase()) {
                return res.status(403).json({ error: 'Email mismatch' });
            }
            const orders = db.query('orders', o => o.client_email.toLowerCase() === email.toLowerCase());
            res.json(orders.reverse());
        });
    }
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authentication required for all orders' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        const orders = db.query('orders', null);
        res.json(orders.reverse());
    });
});

// Client-side order cancellation
app.post('/api/orders/:id/cancel', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const orders = db.query('orders', o => o.id === req.params.id);
    if (!orders.length) return res.status(404).json({ error: 'Order not found' });
    if (orders[0].client_email.toLowerCase() !== email.toLowerCase()) return res.status(403).json({ error: 'Email does not match this order' });
    if (orders[0].status === 'completed' || orders[0].status === 'cancelled') return res.status(400).json({ error: 'Cannot cancel a ' + orders[0].status + ' order' });
    db.update('orders', req.params.id, { status: 'cancelled', payment_status: 'cancelled', updated_at: new Date().toISOString() });
    res.json({ success: true, message: 'Order cancelled successfully.' });
});

// Client-side appointment cancellation
app.post('/api/appointments/:id/cancel', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const appointments = db.query('appointments', a => a.id === req.params.id);
    if (!appointments.length) return res.status(404).json({ error: 'Appointment not found' });
    if (appointments[0].client_email.toLowerCase() !== email.toLowerCase()) return res.status(403).json({ error: 'Email does not match this appointment' });
    if (appointments[0].status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });
    db.update('appointments', req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Appointment cancelled.' });
});

app.patch('/api/orders/:id', authenticateToken, (req, res) => {
    const now = new Date().toISOString();
    const existing = db.query('orders', o => o.id === req.params.id);
    const history = existing.length ? (existing[0].status_history || []) : [];
    const updates = {};
    if (req.body.status) {
        updates.status = req.body.status;
        history.push({ from: existing[0].status, to: req.body.status, at: now });
    }
    if (req.body.payment_status) updates.payment_status = req.body.payment_status;
    if (req.body.deposit_paid !== undefined) updates.deposit_paid = req.body.deposit_paid ? 1 : 0;
    if (req.body.client_message) updates.client_message = req.body.client_message;
    updates.status_history = history;
    updates.updated_at = now;
    db.update('orders', req.params.id, updates);
    // Notify client via push if status changed
    if (updates.status || updates.payment_status) {
        notifyClient(req.params.id, updates.status || updates.payment_status);
    }
    res.json({ success: true });
});

// ===== Project Board API =====
app.get('/api/project-board/:email', (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const orders = db.query('orders', o => o.client_email.toLowerCase() === email.toLowerCase());
    const timeline = [];
    orders.forEach(o => {
        const history = o.status_history || [];
        history.forEach(h => {
            timeline.push({
                order_id: o.id.slice(0, 8),
                service: o.service,
                from: h.from,
                to: h.to,
                at: h.at,
                client_name: o.client_name
            });
        });
    });
    timeline.sort((a, b) => new Date(a.at) - new Date(b.at));
    res.json({ orders: orders.reverse(), timeline: timeline.reverse() });
});

// ===== Discount Code Validation =====
app.post('/api/validate-discount', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const match = code.match(/^VIN10-([A-Z0-9]{6})$/);
    if (!match) return res.json({ valid: false, error: 'Invalid discount code' });
    const used = db.query('discount_usage', d => d.code === code);
    if (used.length) return res.json({ valid: false, error: 'Discount code already used' });
    const issued = db.query('followups', f => {
        try { return JSON.stringify(f).includes(code); } catch { return false; }
    });
    if (!issued.length) return res.json({ valid: false, error: 'Discount code not found' });
    res.json({ valid: true, discount: 10, message: '10% discount applied!' });
});

// ===== File Upload =====
app.post('/api/upload', authenticateToken, upload.array('files', 5), (req, res) => {
    const files = req.files.map(f => ({
        original: f.originalname,
        size: f.size,
        path: f.filename,
        uploaded_at: new Date().toISOString()
    }));
    db.insert('uploads', { id: uuidv4(), client_name: req.body.client_name || 'Unknown', files, created_at: new Date().toISOString() });
    res.json({ success: true, files: files.map(f => ({ name: f.original, size: f.size })) });
});

app.post('/api/client/upload', (req, res) => {
    const { client_name, client_email } = req.body;
    if (!client_name || !client_email) return res.status(400).json({ error: 'Name and email required' });
    const uploadMiddleware = upload.array('files', 5);
    uploadMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ error: 'Upload failed. Max 5 files, 20MB each.' });
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
        const files = req.files.map(f => ({
            original: f.originalname,
            size: f.size,
            path: f.filename,
            uploaded_at: new Date().toISOString()
        }));
        db.insert('uploads', { id: uuidv4(), client_name: client_name.trim(), client_email: client_email.trim(), files, created_at: new Date().toISOString() });
        sendEmailAlert({
            subject: `Files Uploaded by ${client_name}`,
            html: `<h2>New File Upload</h2><p><strong>Client:</strong> ${client_name}</p><p><strong>Email:</strong> ${client_email}</p><p><strong>Files:</strong><ul>${files.map(f => `<li>${f.original} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('')}</ul></p>`
        });
        res.json({ success: true, files: files.map(f => ({ name: f.original, size: f.size })) });
    });
});

app.get('/api/uploads', authenticateToken, (req, res) => {
    const uploads = db.query('uploads', null);
    res.json(uploads.reverse());
});

app.get('/api/client/uploads', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const uploads = db.query('uploads', null);
    const filtered = uploads.filter(u => u.client_email && u.client_email.toLowerCase() === email.toLowerCase());
    res.json(filtered.reverse());
});

// ===== Push Notifications =====
let webpush = null;
try {
    webpush = require('web-push');
    const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails('mailto:' + (process.env.ADMIN_EMAIL || 'admin@vincentit.com'), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    } else {
        console.log('VAPID keys not configured — push notifications disabled');
        webpush = null;
    }
} catch (e) {
    console.log('web-push not available — push notifications disabled');
    webpush = null;
}

function loadPushSubscriptions() {
    return db.query('push_subscriptions', null);
}

function savePushSubscription(sub) {
    const existing = db.query('push_subscriptions', s => s.endpoint === sub.endpoint);
    if (existing.length) return;
    db.insert('push_subscriptions', { id: sub.endpoint.replace(/[^a-zA-Z0-9_-]/g, ''), ...sub });
}

function removePushSubscription(endpoint) {
    const id = endpoint.replace(/[^a-zA-Z0-9_-]/g, '');
    db.run('DELETE FROM data WHERE collection = ? AND id = ?', ['push_subscriptions', id]);
    db.save();
}

app.post('/api/push/subscribe', (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    savePushSubscription(sub);
    res.json({ success: true });
});

const STATUS_LABELS = {
    pending: 'Order Received', in_progress: 'In Progress',
    completed: 'Completed', cancelled: 'Cancelled',
    paid: 'Payment Confirmed', unpaid: 'Payment Pending'
};

function notifyClient(orderId, status) {
    if (!webpush) return;
    const subs = loadPushSubscriptions();
    if (!subs.length) return;
    const title = 'Order Update';
    const body = `Order ${orderId.slice(0, 8)}… — ${STATUS_LABELS[status] || status}`;
    subs.forEach(sub => {
        webpush.sendNotification(sub, JSON.stringify({ title, body, icon: '/img/icon-192.png', vibrate: [200, 100, 200] }))
            .catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) removePushSubscription(sub.endpoint);
                else console.error('Push notification error:', err.message);
            });
    });
}

// ===== Sitemap =====
app.get('/sitemap.xml', (req, res) => {
    const siteUrl = process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com';
    const pages = ['/', '/client/portal.html', '/qr.html', '/privacy.html', '/payment-success.html', '/payment-cancel.html', '/blog/'];
    const blogPosts = db.query('blog_posts', p => p.published !== 0);
    let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    pages.forEach(p => { xml += `<url><loc>${siteUrl}${p}</loc><priority>0.8</priority></url>`; });
    blogPosts.forEach(p => { xml += `<url><loc>${siteUrl}/blog/${p.slug}</loc><lastmod>${p.updated_at || p.created_at}</lastmod><priority>0.6</priority></url>`; });
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

// ===== QR Code =====
const QRCode = require('qrcode');

app.get('/api/qr', (req, res) => {
    const url = req.query.url || 'https://vincent-it-freelancer.onrender.com';
    const size = parseInt(req.query.size) || 300;
    QRCode.toDataURL(url, { width: size, margin: 2, color: { dark: '#0a0a1a', light: '#ffffff' } })
        .then(dataUrl => {
            const base64 = dataUrl.split(',')[1];
            const img = Buffer.from(base64, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'Cache-Control': 'public, max-age=86400'
            });
            res.end(img);
        })
        .catch(() => res.status(500).json({ error: 'Failed to generate QR code' }));
});

app.get('/api/qr/svg', (req, res) => {
    const url = req.query.url || 'https://vincent-it-freelancer.onrender.com';
    QRCode.toString(url, { type: 'svg', width: 400, margin: 2, color: { dark: '#0a0a1a', light: '#ffffff' } })
        .then(svg => {
            const styled = svg.replace('<svg', '<svg style="display:block;margin:auto;max-width:100%;height:auto"');
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send(styled);
        })
        .catch(() => res.status(500).json({ error: 'Failed to generate QR code' }));
});

// Receipt: fetch order details by ID + email
app.get('/api/receipt', (req, res) => {
    const { order_id, email } = req.query;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });
    let order = null;
    const serviceOrders = db.query('orders', o => o.id === order_id);
    if (serviceOrders.length) order = serviceOrders[0];
    if (!order) {
        const templateOrders = db.query('template_orders', o => o.id === order_id);
        if (templateOrders.length) order = templateOrders[0];
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (email && order.client_email.toLowerCase() !== email.toLowerCase()) return res.status(403).json({ error: 'Email mismatch' });
    res.json({
        id: order.id, client_name: order.client_name, client_email: order.client_email,
        service: order.service || order.template_id, price: order.price,
        status: order.status, payment_status: order.payment_status,
        created_at: order.created_at, payment_method: order.payment_method || 'Pending'
    });
});

app.get('/payment/success', (req, res) => {
    const orderId = req.query.order_id || '';
    const filePath = path.join(__dirname, '..', 'payment-success.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.send(`
            <html><head><title>Payment Successful</title><style>
                body{font-family:Inter,sans-serif;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:2rem}
                .card{background:#12122a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:3rem;max-width:500px}
                h1{color:#00d4ff;margin-bottom:1rem}
                p{color:#b0b0d0;line-height:1.6}
                .btn{display:inline-block;margin-top:1.5rem;padding:0.8rem 2rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border:none;border-radius:8px;color:#fff;font-weight:600;text-decoration:none;font-family:inherit}
                .icon{font-size:4rem;margin-bottom:1rem}
            </style></head><body>
                <div class="card">
                    <div class="icon">&#10004;&#65039;</div>
                    <h1>Payment Successful!</h1>
                    <p>Thank you for your payment. Your order <strong>${orderId}</strong> is now being processed.</p>
                    <p>We will contact you shortly via WhatsApp with updates.</p>
                    <a href="/" class="btn">Return to Home</a>
                </div>
            </body></html>
        `);
    }
});

app.get('/payment/cancel', (req, res) => {
    const orderId = req.query.order_id || '';
    const filePath = path.join(__dirname, '..', 'payment-cancel.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.send(`
            <html><head><title>Payment Cancelled</title><style>
                body{font-family:Inter,sans-serif;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:2rem}
                .card{background:#12122a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:3rem;max-width:500px}
                h1{color:#ff6b35;margin-bottom:1rem}
                p{color:#b0b0d0;line-height:1.6}
                .btn{display:inline-block;margin-top:1.5rem;padding:0.8rem 2rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border:none;border-radius:8px;color:#fff;font-weight:600;text-decoration:none;font-family:inherit}
                .icon{font-size:4rem;margin-bottom:1rem}
            </style></head><body>
                <div class="card">
                    <div class="icon">&#10060;</div>
                    <h1>Payment Cancelled</h1>
                    <p>Your payment for order <strong>${orderId}</strong> was cancelled.</p>
                    <p>If you would like to try again, please contact us on WhatsApp.</p>
                    <a href="/" class="btn">Return to Home</a>
                </div>
            </body></html>
        `);
    }
});

// ===== Reviews =====
app.post('/api/reviews', validate([
    { name: 'client_name', label: 'Name', required: true, maxLength: 100 },
    { name: 'text', label: 'Review text', required: true, maxLength: 5000 }
]), (req, res) => {
    const { client_name, email, rating, text, service } = req.body;
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    db.insert('reviews', {
        id: uuidv4(),
        client_name: client_name.trim().replace(/<[^>]*>/g, ''),
        email: (email || '').trim().toLowerCase(),
        rating: ratingNum,
        text: text.trim().replace(/<[^>]*>/g, ''),
        service: (service || '').trim(),
        approved: 0,
        created_at: new Date().toISOString()
    });
    res.json({ success: true, message: 'Review submitted! Pending approval.' });
});

app.get('/api/reviews', (req, res) => {
    const { approved } = req.query;
    if (approved === '1') {
        const reviews = db.query('reviews', r => r.approved === 1);
        return res.json(reviews.reverse());
    }
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        const reviews = db.query('reviews', null);
        res.json(reviews.reverse());
    });
});

app.patch('/api/reviews/:id', authenticateToken, (req, res) => {
    db.update('reviews', req.params.id, { approved: req.body.approved ? 1 : 0 });
    res.json({ success: true });
});

// ===== Clients =====
app.post('/api/clients/register', validate([
    { name: 'name', label: 'Name', required: true, maxLength: 100 },
    { name: 'email', label: 'Email', required: true, type: 'email', maxLength: 200 },
    { name: 'password', label: 'Password', required: true, maxLength: 128 }
]), async (req, res) => {
    const { name, email, phone, password } = req.body;
    const emailLower = email.trim().toLowerCase();
    const existing = db.query('clients', c => c.email.toLowerCase() === emailLower);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();
        const refCode = 'VIN-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        db.insert('clients', {
            id, name: name.trim().replace(/<[^>]*>/g, ''),
            email: emailLower,
            phone: (phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
            password: hashedPassword,
            referral_code: refCode,
            created_at: new Date().toISOString()
        });
        const verificationToken = uuidv4() + '-' + Math.random().toString(36).substr(2, 8);
        db.update('clients', id, { verification_token: verificationToken, verified: 0 });
        const verifyUrl = (process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com') + '/api/clients/verify?token=' + verificationToken + '&email=' + encodeURIComponent(emailLower);
        sendEmailAlert({
            to: emailLower,
            subject: 'Verify your email – Vincent IT',
            html: `<h2>Welcome, ${name.trim()}!</h2><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p><p>– Vincent IT Freelancer</p>`
        });
        const token = jwt.sign({ email: emailLower, role: 'client', clientId: id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, client: { id, name: name.trim(), email: emailLower, referral_code: refCode, verified: false } });
    } catch {
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.get('/api/clients/verify', async (req, res) => {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).send('Invalid verification link');
    const clients = db.query('clients', c => c.email.toLowerCase() === email.toLowerCase());
    if (!clients.length) return res.status(404).send('Account not found');
    if (clients[0].verified) return res.send('<html><body style="font-family:Inter,sans-serif;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><h1 style="color:#00d4ff">Already Verified!</h1><p>Your email is already verified.</p><a href="/client/portal.html" style="color:#7b2ff7">Go to Portal</a></div></body></html>');
    if (clients[0].verification_token !== token) return res.status(400).send('Invalid or expired verification token');
    db.update('clients', clients[0].id, { verified: 1, verification_token: null });
    res.send('<html><body style="font-family:Inter,sans-serif;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="text-align:center"><h1 style="color:#00d4ff">Email Verified!</h1><p>Your email has been verified successfully.</p><a href="/client/portal.html" style="color:#7b2ff7">Go to Portal</a></div></body></html>');
});

app.post('/api/clients/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const clients = db.query('clients', c => c.email.toLowerCase() === email.toLowerCase());
    if (!clients.length) return res.status(401).json({ error: 'Invalid credentials' });
    try {
        const valid = await bcrypt.compare(password, clients[0].password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const client = clients[0];
        if (!client.verified) return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox (including spam) for the verification link.', needsVerification: true, email: client.email });
        const token = jwt.sign({ email: client.email, role: 'client', clientId: client.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, client: { id: client.id, name: client.name, email: client.email, phone: client.phone, referral_code: client.referral_code, verified: client.verified || 0 } });
    } catch {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Resend verification email
app.post('/api/clients/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const clients = db.query('clients', c => c.email.toLowerCase() === email.toLowerCase());
    if (!clients.length) return res.status(404).json({ error: 'Account not found' });
    if (clients[0].verified) return res.json({ success: true, message: 'Email already verified. You can log in.' });
    const verificationToken = uuidv4() + '-' + Math.random().toString(36).substr(2, 8);
    db.update('clients', clients[0].id, { verification_token: verificationToken });
    const verifyUrl = (process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com') + '/api/clients/verify?token=' + verificationToken + '&email=' + encodeURIComponent(email);
    sendEmailAlert({
        to: email,
        subject: 'Verify your email – Vincent IT',
        html: `<h2>Verify Your Email</h2><p>Click the link below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>– Vincent IT Freelancer</p>`
    });
    res.json({ success: true, message: 'Verification email resent. Check your inbox.' });
});

// ===== Password Reset =====
app.post('/api/clients/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const clients = db.query('clients', c => c.email.toLowerCase() === email.toLowerCase());
    if (!clients.length) return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    const token = uuidv4() + '-' + Math.random().toString(36).substr(2, 8);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.update('clients', clients[0].id, { reset_token: token, reset_token_expires: expires });
    const resetUrl = (process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com') + '/client/portal.html?reset_token=' + token + '&email=' + encodeURIComponent(email);
    sendEmailAlert({
        to: email,
        subject: 'Password Reset – Vincent IT',
        html: `<h2>Password Reset</h2><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email.</p><p>– Vincent IT Freelancer</p>`
    });
    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
});

app.post('/api/clients/reset-password', async (req, res) => {
    const { email, token, password } = req.body;
    if (!email || !token || !password) return res.status(400).json({ error: 'Email, token, and new password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const clients = db.query('clients', c => c.email.toLowerCase() === email.toLowerCase());
    if (!clients.length) return res.status(400).json({ error: 'Invalid request' });
    const client = clients[0];
    if (client.reset_token !== token) return res.status(400).json({ error: 'Invalid or expired reset token' });
    if (new Date(client.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset token has expired' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.update('clients', client.id, { password: hashedPassword, reset_token: null, reset_token_expires: null });
        res.json({ success: true, message: 'Password updated successfully' });
    } catch {
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ===== Client Heartbeat (Online Tracking) =====
app.post('/api/clients/heartbeat', authenticateToken, (req, res) => {
    if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can send heartbeat' });
    const clients = db.query('clients', c => c.id === req.user.clientId);
    if (!clients.length) return res.status(404).json({ error: 'Client not found' });
    db.update('clients', req.user.clientId, { last_seen: new Date().toISOString(), is_online: 1 });
    res.json({ success: true });
});

// Admin: get all clients with online status
app.get('/api/admin/clients', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const clients = db.query('clients', null);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = clients.map(c => ({
        id: c.id, name: c.name, email: c.email, phone: c.phone || '',
        referral_code: c.referral_code, created_at: c.created_at,
        last_seen: c.last_seen || null,
        is_online: c.last_seen && c.last_seen > fiveMinAgo ? 1 : 0,
        deleted: c.deleted || 0
    })).filter(c => !c.deleted).reverse();
    res.json(result);
});

// ===== Client Profile Update =====
app.patch('/api/clients/update', authenticateToken, async (req, res) => {
    if (req.user.role !== 'client') return res.status(403).json({ error: 'Only clients can update their profile' });
    const { name, phone, email, current_password, new_password } = req.body;
    const clients = db.query('clients', c => c.id === req.user.clientId);
    if (!clients.length) return res.status(404).json({ error: 'Client not found' });
    const client = clients[0];
    const updates = {};
    if (name) updates.name = name.trim().replace(/<[^>]*>/g, '');
    if (phone !== undefined) updates.phone = phone.trim().replace(/[^0-9+\-\s]/g, '');
    if (email) {
        const emailLower = email.trim().toLowerCase();
        const existing = db.query('clients', c => c.email.toLowerCase() === emailLower && c.id !== client.id);
        if (existing.length) return res.status(409).json({ error: 'Email already in use' });
        updates.email = emailLower;
    }
    if (new_password) {
        if (!current_password) return res.status(400).json({ error: 'Current password required to set new password' });
        try {
            const valid = await bcrypt.compare(current_password, client.password);
            if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
            if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
            updates.password = await bcrypt.hash(new_password, 10);
        } catch {
            return res.status(500).json({ error: 'Password update failed' });
        }
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });
    updates.updated_at = new Date().toISOString();
    const updated = db.update('clients', client.id, updates);
    res.json({ success: true, client: { id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, referral_code: updated.referral_code } });
});

// ===== Account Deletion Requests =====
app.post('/api/clients/delete-request', async (req, res) => {
    const { email, reason } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const clients = db.query('clients', c => c.email.toLowerCase() === email.toLowerCase());
    if (!clients.length) return res.status(404).json({ error: 'Account not found' });
    const existing = db.query('delete_requests', r => r.client_email.toLowerCase() === email.toLowerCase() && r.status === 'pending');
    if (existing.length) return res.json({ success: true, message: 'Deletion already requested. Admin will review it.' });
    db.insert('delete_requests', {
        id: uuidv4(),
        client_id: clients[0].id,
        client_name: clients[0].name,
        client_email: email.toLowerCase(),
        reason: (reason || '').trim(),
        status: 'pending',
        created_at: new Date().toISOString()
    });
    sendEmailAlert({
        subject: `Account Deletion Request from ${clients[0].name}`,
        html: `<h2>Deletion Request</h2><p><strong>Client:</strong> ${clients[0].name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Reason:</strong> ${reason || 'Not provided'}</p><p>Review in the admin dashboard.</p>`
    });
    res.json({ success: true, message: 'Deletion request submitted. Admin will review it.' });
});

app.get('/api/admin/delete-requests', authenticateToken, (req, res) => {
    const requests = db.query('delete_requests', r => r.status === 'pending');
    res.json(requests.reverse());
});

app.post('/api/admin/delete-client/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const requests = db.query('delete_requests', r => r.id === id);
    if (!requests.length) return res.status(404).json({ error: 'Request not found' });
    const reqData = requests[0];
    const action = req.body.action || 'approve';
    if (action === 'approve') {
        const clients = db.query('clients', c => c.id === reqData.client_id);
        if (clients.length) {
            db.update('clients', reqData.client_id, { deleted: 1, deleted_at: new Date().toISOString() });
            sendEmailAlert({
                to: reqData.client_email,
                subject: 'Account Deletion – Vincent IT',
                html: `<h2>Account Deletion Confirmed</h2><p>Your account and personal data have been deleted as requested.</p><p>If this was a mistake, contact us via WhatsApp.</p><p>– Vincent IT Freelancer</p>`
            });
        }
        db.update('delete_requests', id, { status: 'approved', reviewed_at: new Date().toISOString() });
        res.json({ success: true, message: 'Account deleted' });
    } else {
        db.update('delete_requests', id, { status: 'denied', reviewed_at: new Date().toISOString() });
        sendEmailAlert({
            to: reqData.client_email,
            subject: 'Account Deletion Request Denied – Vincent IT',
            html: `<h2>Deletion Request Denied</h2><p>Your request to delete your account has been denied. Contact us via WhatsApp for more information.</p><p>– Vincent IT Freelancer</p>`
        });
        res.json({ success: true, message: 'Request denied' });
    }
});

// ===== Chat =====
app.post('/api/chat', validate([
    { name: 'sender', label: 'Sender', required: true, maxLength: 100 },
    { name: 'message', label: 'Message', required: true, maxLength: 5000 }
]), (req, res) => {
    const { sender, message, is_admin } = req.body;
    db.insert('chat_messages', {
        id: uuidv4(),
        sender: sender.trim().replace(/<[^>]*>/g, ''),
        message: message.trim().replace(/<[^>]*>/g, ''),
        is_admin: is_admin ? 1 : 0,
        read: 0,
        created_at: new Date().toISOString()
    });
    res.json({ success: true });
    if (broadcastChat) broadcastChat({ type: 'new_message', sender, message, is_admin: is_admin ? 1 : 0, created_at: new Date().toISOString() });
});

app.get('/api/chat', authenticateToken, (req, res) => {
    const messages = db.query('chat_messages', null).map(m => {
        // Only include image for admin; strip for others
        const { image, ...rest } = m;
        return req.user.role === 'admin' ? m : rest;
    });
    // Mark all unread as read for admin
    if (req.user.role === 'admin') {
        messages.forEach(m => {
            if (!m.is_admin && !m.read) {
                db.update('chat_messages', m.id, { read: 1 });
            }
        });
    }
    res.json(messages);
});

// Chat image upload
app.post('/api/chat/upload', (req, res) => {
    const { sender, image, is_admin } = req.body;
    if (!image) return res.status(400).json({ error: 'Image required' });
    // Store image as base64 in chat_messages
    const id = uuidv4();
    db.insert('chat_messages', {
        id,
        sender: (sender || 'Website Visitor').trim().replace(/<[^>]*>/g, ''),
        message: '[Image]',
        image: image.substring(0, 500000),
        is_admin: is_admin ? 1 : 0,
        read: 0,
        created_at: new Date().toISOString()
    });
    res.json({ success: true, id });
    if (broadcastChat) broadcastChat({ type: 'chat_image', sender, url: image, is_admin: is_admin ? 1 : 0 });
});

// Public chat endpoint for visitor polling (last 50 admin messages)
app.get('/api/chat/public', (req, res) => {
    const messages = db.query('chat_messages', m => m.is_admin === 1);
    res.json(messages.slice(-50));
});

// ===== Blog =====
app.get('/api/blog', (req, res) => {
    const posts = db.query('blog_posts', p => p.published !== 0);
    res.json(posts.reverse());
});

app.get('/api/blog/:slug', (req, res) => {
    const posts = db.query('blog_posts', p => p.slug === req.params.slug && p.published !== 0);
    if (!posts.length) return res.status(404).json({ error: 'Post not found' });
    res.json(posts[0]);
});

app.post('/api/blog', authenticateToken, validate([
    { name: 'title', label: 'Title', required: true, maxLength: 200 },
    { name: 'slug', label: 'Slug', required: true, maxLength: 200 },
    { name: 'content', label: 'Content', required: true, maxLength: 100000 }
]), (req, res) => {
    const { title, slug, excerpt, content, author, tags } = req.body;
    db.insert('blog_posts', {
        id: uuidv4(),
        title: title.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
        excerpt: (excerpt || '').trim(),
        content,
        author: (author || 'Vincent IT').trim(),
        tags: (tags || '').trim(),
        published: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
    notifyAdminWhatsApp(`New Blog Post: "${title}" by ${author}`);
    res.json({ success: true, message: 'Post created!' });
});

app.put('/api/blog/:slug', authenticateToken, (req, res) => {
    const { slug } = req.params;
    const { title, excerpt, content, author, tags } = req.body;
    const posts = db.query('blog_posts', p => p.slug === slug);
    if (!posts.length) return res.status(404).json({ error: 'Post not found' });
    db.update('blog_posts', posts[0].id, {
        title: (title || posts[0].title).trim(),
        slug: slug,
        excerpt: (excerpt !== undefined ? excerpt : posts[0].excerpt || '').trim(),
        content: content || posts[0].content,
        author: (author || posts[0].author || 'Vincent IT').trim(),
        tags: (tags !== undefined ? tags : posts[0].tags || '').trim(),
        updated_at: new Date().toISOString()
    });
    res.json({ success: true, message: 'Post updated!' });
});

app.delete('/api/blog/:slug', authenticateToken, (req, res) => {
    const { slug } = req.params;
    const posts = db.query('blog_posts', p => p.slug === slug);
    if (!posts.length) return res.status(404).json({ error: 'Post not found' });
    db.update('blog_posts', posts[0].id, { published: 0, updated_at: new Date().toISOString() });
    res.json({ success: true, message: 'Post deleted!' });
});

// ===== Dashboard stats =====
app.get('/api/admin/stats', authenticateToken, (req, res) => {
    const contacts = db.query('contacts', null);
    const orders = db.query('orders', null);
    const reviews = db.query('reviews', null);
    const appointments = db.query('appointments', null);
    const visitors = db.query('visitors', null);
    const uniqueVisitors = new Set(visitors.map(v => v.ip));
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const pendingReviews = reviews.filter(r => !r.approved).length;
    const recentContacts = contacts.slice(-5).reverse();
    const todayVisits = visitors.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length;
    const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => {
        const match = String(o.price || '').match(/\d+/);
        return sum + (match ? parseInt(match[0]) : 0);
    }, 0);
    const templateRevenue = db.query('template_orders', o => o.payment_status === 'paid').reduce((sum, o) => {
        const match = String(o.price || '').match(/\d+/);
        return sum + (match ? parseInt(match[0]) : 0);
    }, 0);
    res.json({
        contactCount: contacts.length, orderCount: orders.length,
        reviewCount: reviews.length, appointmentCount: appointments.length,
        pendingOrders, pendingReviews, recentContacts,
        visitorCount: visitors.length, uniqueVisitors: uniqueVisitors.size, todayVisits,
        totalRevenue: totalRevenue + templateRevenue
    });
});

// ===== Analytics (charts data) =====
app.get('/api/admin/analytics', authenticateToken, (req, res) => {
    const visitors = db.query('visitors', null);
    const orders = db.query('orders', null);
    const templateOrders = db.query('template_orders', null);

    // Daily visitors for last 30 days
    const dailyVisitors = {};
    const dailyOrders = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyVisitors[key] = 0;
        dailyOrders[key] = 0;
    }
    visitors.forEach(v => {
        const key = new Date(v.created_at).toISOString().slice(0, 10);
        if (dailyVisitors[key] !== undefined) dailyVisitors[key]++;
    });
    const paidOrders = orders.filter(o => o.payment_status === 'paid');
    paidOrders.forEach(o => {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (dailyOrders[key] !== undefined) dailyOrders[key]++;
    });
    const labels = Object.keys(dailyVisitors);
    const visitorData = Object.values(dailyVisitors);
    const orderData = Object.values(dailyOrders);

    // Revenue breakdown
    const revenueByMonth = {};
    paidOrders.concat(templateOrders.filter(o => o.payment_status === 'paid')).forEach(o => {
        const key = new Date(o.created_at).toISOString().slice(0, 7);
        if (!revenueByMonth[key]) revenueByMonth[key] = 0;
        const match = String(o.price || '').match(/\d+/);
        revenueByMonth[key] += match ? parseInt(match[0]) : 0;
    });

    // Conversion rate (orders / visitors per day)
    const conversionRates = labels.map((k, i) => {
        const v = visitorData[i];
        return v > 0 ? +((orderData[i] / v) * 100).toFixed(1) : 0;
    });

    // Top services
    const serviceCounts = {};
    orders.forEach(o => {
        const svc = o.service || 'Unknown';
        serviceCounts[svc] = (serviceCounts[svc] || 0) + 1;
    });
    const topServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

    res.json({
        dailyVisitors: { labels, data: visitorData },
        dailyOrders: { labels, data: orderData },
        monthlyRevenue: Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount })),
        conversionRates: { labels, data: conversionRates },
        topServices
    });
});

// ===== Banking Details (replaces payment gateway) =====
app.get('/api/banking-details', (req, res) => {
    res.json({
        bank: 'TymeBank',
        account_holder: 'Mojalefa Vincent Matlholwa',
        account_type: 'Savings',
        account_number: '51135445245',
        branch_code: '678910',
        payshap: '0677834591',
        instructions: 'Pay the exact amount and upload your proof of payment below.'
    });
});

// ===== Proof of Payment Upload + Mark as Paid =====
const proofUpload = multer({
    dest: uploadsDir,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext) || !ext);
    }
});

app.post('/api/orders/:id/mark-paid', proofUpload.single('proof'), (req, res) => {
    const { id } = req.params;
    const { client_name, client_email, client_phone, message } = req.body;
    if (!client_name || !client_email) return res.status(400).json({ error: 'Name and email required' });
    if (!req.file) return res.status(400).json({ error: 'Proof of payment is required. Please upload a screenshot or PDF of your payment.' });
    const orders = db.query('orders', o => o.id === id);
    if (!orders.length) {
        const templateOrders = db.query('template_orders', o => o.id === id);
        if (!templateOrders.length) return res.status(404).json({ error: 'Order not found' });
        const order = templateOrders[0];
        db.update('template_orders', id, { payment_status: 'client_marked_paid', status: 'awaiting_confirmation', updated_at: new Date().toISOString(), client_message: message || '' });
        const proofInfo = req.file ? `Proof: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)` : 'No proof file attached';
        const waMsg = `PAID (Client Marked)\n\nName: ${client_name}\nEmail: ${client_email}\nPhone: ${client_phone || 'N/A'}\nOrder ID: ${id.slice(0, 8)}...\nTemplate: ${order.template_id}\nPrice: ${order.price}\nMessage: ${message || 'N/A'}\n${proofInfo}\n\nPlease confirm payment and send download link.`;
        notifyAdminWhatsApp(waMsg);
        notifyCustomer({
            name: client_name, email: client_email, phone: client_phone,
            message: `Hi ${client_name},\n\nThank you! Your payment notification for Order ${id.slice(0, 8)} has been sent to Vincent IT.\n\nWe will confirm your payment and deliver your item shortly.\n\n- Vincent IT Freelancer`
        });
        return res.json({ success: true, message: 'Payment notification sent! Admin will confirm shortly.' });
    }
    const order = orders[0];
    db.update('orders', id, { payment_status: 'client_marked_paid', status: 'awaiting_confirmation', updated_at: new Date().toISOString(), client_message: message || '' });
    const proofInfo = req.file ? `Proof: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)` : 'No proof file attached';
    let items = [];
    try { if (order.cart_items) items = typeof order.cart_items === 'string' ? JSON.parse(order.cart_items) : order.cart_items; } catch {}
    const itemDetail = items.length ? items.map(i => `- ${i.title} x${i.qty} @ R${i.price}`).join('\n') : order.service;
    const waMsg = `PAID (Client Marked)\n\nName: ${client_name}\nEmail: ${client_email}\nPhone: ${client_phone || 'N/A'}\nOrder ID: ${id.slice(0, 8)}...\nService: ${order.service}\nPrice: ${order.price}\nItems:\n${itemDetail}\nMessage: ${message || 'N/A'}\n${proofInfo}\n\nPlease confirm payment and deliver the item.`;
    notifyAdminWhatsApp(waMsg);
    notifyCustomer({
        name: client_name, email: client_email, phone: client_phone,
        message: `Hi ${client_name},\n\nThank you! Your payment notification for Order ${id.slice(0, 8)} has been sent to Vincent IT.\n\nWe will confirm your payment and start working on your service.\n\n- Vincent IT Freelancer`
    });
    res.json({ success: true, message: 'Payment notification sent! Admin will confirm shortly.' });
});

// Admin backup trigger
app.post('/api/admin/backup', authenticateToken, (req, res) => {
    backupDatabase();
    res.json({ success: true, message: 'Backup created' });
});

// SEO-friendly blog URLs
app.get('/blog/:slug', (req, res) => {
    const { slug } = req.params;
    if (slug === 'index.html' || slug.includes('.')) {
        return res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
    }
    res.sendFile(path.join(__dirname, '..', 'blog', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Custom 404 handler - serve static 404.html for unmatched HTML requests
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/') && req.accepts('html')) {
        return res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
    }
    next();
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
    db.load().then(() => {
        const server = http.createServer(app);
        
        // WebSocket server for chat
        const wss = new WebSocketServer({ server, path: '/ws' });
        const chatClients = new Set();
        
        wss.on('connection', (ws) => {
            chatClients.add(ws);
            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    if (msg.type === 'typing') {
                        broadcastChat({ type: 'typing', is_admin: msg.is_admin || false, sender: 'Visitor' });
                    } else if (msg.type === 'read_receipt') {
                        broadcastChat({ type: 'read_receipt', is_admin: msg.is_admin || false });
                    }
                } catch (e) {}
            });
            ws.on('close', () => chatClients.delete(ws));
            ws.on('error', () => chatClients.delete(ws));
        });
        
        broadcastChat = (message) => {
            const data = JSON.stringify(message);
            chatClients.forEach(client => {
                if (client.readyState === 1) {
                    try { client.send(data); } catch (e) { chatClients.delete(client); }
                }
            });
        };
        
        // Auto backup every hour
        setInterval(backupDatabase, 60 * 60 * 1000);
        // Process follow-ups every 30 minutes
        setInterval(processFollowUps, 30 * 60 * 1000);
        setTimeout(processFollowUps, 30000);
        // Initial backup after 10 seconds
        setTimeout(backupDatabase, 10000);

        // ===== Automated 24h Appointment Reminders =====
        function checkAndSendReminders() {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tomorrowStr = in24h.toISOString().slice(0, 10);
            const appointments = db.query('appointments', a =>
                a.status === 'confirmed' && a.date === tomorrowStr && !a.reminder_sent
            );
            appointments.forEach(a => {
                const reminderMsg = `Hi ${a.client_name},\n\nReminder: You have an appointment tomorrow!\nService: ${a.service}\nDate: ${a.date}\nTime: ${a.time}\n\nReply or WhatsApp 067 783 4591 if you need to reschedule.\n\n- Vincent IT Freelancer`;
                notifyCustomer({
                    name: a.client_name,
                    email: a.client_email,
                    phone: a.client_phone,
                    message: reminderMsg
                });
                sendEmailAlert({
                    to: a.client_email,
                    subject: 'Appointment Reminder – Tomorrow at ' + a.time,
                    html: `<h2>Appointment Reminder</h2><p>Hi ${a.client_name},</p><p>This is a reminder that you have an appointment <strong>tomorrow</strong>:</p><p><strong>Service:</strong> ${a.service}<br><strong>Date:</strong> ${a.date}<br><strong>Time:</strong> ${a.time}</p><p>Please be available at the scheduled time. Reply if you need to reschedule.</p><p>– Vincent IT Freelancer</p>`
                });
                notifyAdminWhatsApp(`Reminder sent: ${a.client_name}'s ${a.service} appointment is tomorrow at ${a.time}`);
                db.update('appointments', a.id, { reminder_sent: 1 });
                console.log('Reminder sent for appointment:', a.id.slice(0, 8));
            });
        }
        // Check reminders every 30 minutes
        setInterval(checkAndSendReminders, 30 * 60 * 1000);
        checkAndSendReminders();
        
        server.listen(PORT, () => {
            console.log(`Vincent IT Server running on http://localhost:${PORT}`);
            console.log(`Admin dashboard: http://${PORT}/admin/`);
            console.log(`Client portal: http://${PORT}/client/portal.html`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }).catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
}

module.exports = app;
