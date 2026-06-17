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
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-do-not-use-in-production');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@vincentit.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10) : null;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

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

// Email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

function sendEmailAlert({ subject, html, to }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    const recipients = to || ADMIN_EMAIL;
    const prefix = to ? '' : '[Vincent IT] ';
    transporter.sendMail({
        from: `"Vincent IT" <${process.env.SMTP_USER}>`,
        to: recipients,
        subject: `${prefix}${subject}`,
        html
    }).catch(err => console.error('Email alert failed:', err.message));
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "cdn.tailwindcss.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "www.payfast.co.za", "sandbox.payfast.co.za", "cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "cdn.tailwindcss.com", "www.payfast.co.za", "sandbox.payfast.co.za"],
            formAction: ["'self'", "https://www.payfast.co.za", "https://sandbox.payfast.co.za"],
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

// CSRF origin check for state-changing requests
app.use((req, res, next) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !req.path.startsWith('/api/payfast/') && !req.path.startsWith('/api/clients/')) {
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
    max: 100,
    message: { error: 'Too many requests, please try again later' }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts, please try again later' }
});
app.use('/api/', apiLimiter);

// ===== Visitor Tracking =====
app.post('/api/visit', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    const referrer = req.headers['referer'] || '';
    const path = req.body.path || '/';
    db.insert('visitors', {
        id: uuidv4(),
        ip,
        user_agent: ua.substring(0, 300),
        referrer: referrer.substring(0, 500),
        path: path.substring(0, 200),
        created_at: new Date().toISOString()
    });
    res.json({ success: true });
});

app.get('/api/visitors', authenticateToken, (req, res) => {
    const visitors = db.query('visitors', null);
    const unique = new Set(visitors.map(v => v.ip));
    res.json({
        total: visitors.length,
        unique: unique.size,
        today: visitors.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length,
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
    res.json({ success: true, order_id: id, download_token: token, price, message: 'Template order created! Share the order ID with admin on WhatsApp to get your download link after payment.' });
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
    res.json({ success: true, download_token: updated.download_token, message: 'Payment confirmed. Download link is now active.' });
});

// Admin: confirm deposit paid for service orders
app.post('/api/admin/orders/confirm-deposit', authenticateToken, (req, res) => {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });
    const updated = db.update('orders', order_id, { deposit_paid: 1, payment_status: 'deposit_paid', status: 'in_progress', updated_at: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    notifyClient(order_id, 'in_progress');
    res.json({ success: true, message: 'Deposit confirmed. Order is now in progress.' });
});

// Admin: mark service order as completed
app.post('/api/admin/orders/complete', authenticateToken, (req, res) => {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });
    const updated = db.update('orders', order_id, { status: 'completed', payment_status: 'paid', updated_at: new Date().toISOString() });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    notifyClient(order_id, 'completed');
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
    res.json({ success: true, message: 'Appointment booked! We will confirm shortly.' });
});

app.get('/api/appointments', authenticateToken, (req, res) => {
    const appointments = db.query('appointments', null);
    res.json(appointments.reverse());
});

app.patch('/api/appointments/:id', authenticateToken, (req, res) => {
    const { status } = req.body;
    db.update('appointments', req.params.id, { status });
    res.json({ success: true });
});

// ===== Orders =====
app.post('/api/orders', validate([
    { name: 'client_name', label: 'Client name', required: true, maxLength: 100 },
    { name: 'client_email', label: 'Email', required: true, type: 'email', maxLength: 200 },
    { name: 'service', label: 'Service', required: true, maxLength: 500 }
]), (req, res) => {
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
    db.insert('orders', {
        id,
        client_name: client_name.trim().replace(/<[^>]*>/g, ''),
        client_email: client_email.trim().toLowerCase(),
        client_phone: (client_phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
        service: service.trim(),
        price: (price || '').trim(),
        cart_items: items.length ? JSON.stringify(items) : '',
        status: 'pending',
        payment_status: 'unpaid',
        deposit_paid: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
    sendEmailAlert({
        subject: `New Order from ${client_name}`,
        html: `<h2>New Service Order</h2><p><strong>Client:</strong> ${client_name}</p><p><strong>Email:</strong> ${client_email}</p><p><strong>Phone:</strong> ${client_phone || 'N/A'}</p><p><strong>Service:</strong> ${service}</p><p><strong>Price:</strong> ${price || 'N/A'}</p><p><strong>Order ID:</strong> ${id}</p>${items.length ? '<h3>Items:</h3><ul>' + items.map(function(i) { return '<li>' + (i.title || 'Item') + ' x' + (i.qty || 1) + (i.price ? ' @ R' + i.price : ''); }).join('') + '</ul>' : ''}`
    });
    if (client_email) {
        sendEmailAlert({
            to: client_email,
            subject: `Order Confirmation – ${id}`,
            html: `<h2>Thank you for your order, ${client_name}!</h2><p>Your order <strong>${id}</strong> has been received.</p><p><strong>Service:</strong> ${service}</p><p><strong>Price:</strong> ${price || 'N/A'}</p><p>We will contact you shortly via WhatsApp.</p><p>– Vincent IT Freelancer</p>`
        });
    }
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

app.patch('/api/orders/:id', authenticateToken, (req, res) => {
    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.payment_status) updates.payment_status = req.body.payment_status;
    if (req.body.deposit_paid !== undefined) updates.deposit_paid = req.body.deposit_paid ? 1 : 0;
    if (req.body.pf_payment_id) updates.pf_payment_id = req.body.pf_payment_id;
    if (req.body.payment_method) updates.payment_method = req.body.payment_method;
    updates.updated_at = new Date().toISOString();
    db.update('orders', req.params.id, updates);
    // Notify client via push if status changed
    if (updates.status || updates.payment_status) {
        notifyClient(req.params.id, updates.status || updates.payment_status);
    }
    res.json({ success: true });
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
    blogPosts.forEach(p => { xml += `<url><loc>${siteUrl}/blog/?slug=${p.slug}</loc><lastmod>${p.updated_at || p.created_at}</lastmod><priority>0.6</priority></url>`; });
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

// ===== PayFast Automated Payments =====
const payfast = require('./payfast');

app.post('/api/payfast/pay', (req, res) => {
    const { order_id, deposit_only } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Order ID required' });

    let order = null;
    const serviceOrders = db.query('orders', o => o.id === order_id);
    if (serviceOrders.length) order = serviceOrders[0];

    if (!order) {
        const templateOrders = db.query('template_orders', o => o.id === order_id);
        if (templateOrders.length) order = templateOrders[0];
    }

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') return res.json({ success: true, message: 'Already paid', paid: true });

    let priceNum = parseFloat(String(order.price || '0').replace(/[^0-9.]/g, ''));
    if (!priceNum || priceNum <= 0) return res.status(400).json({ error: 'Invalid price' });

    if (deposit_only) {
        priceNum = Math.round((priceNum / 2) * 100) / 100;
    }

    const pfOrder = {
        id: order.id,
        client_name: order.client_name,
        client_email: order.client_email,
        amount: priceNum,
        description: (deposit_only ? '50% Deposit — ' : '') + (order.service || order.template_id || 'Vincent IT Service'),
        type: order.template_id ? 'template' : 'service'
    };

    if (payfast.isSandbox()) {
        res.json({ success: true, pay_url: payfast.getPaymentUrl(pfOrder), sandbox: true, deposit_only });
    } else {
        res.json({ success: true, form_html: payfast.getPaymentFormHtml(pfOrder), pay_url: payfast.getPaymentUrl(pfOrder), deposit_only });
    }
});

app.post('/api/payfast/itn', (req, res) => {
    const data = req.body;
    payfast.validateItn(data).then(result => {
        if (result.valid && (result.paymentStatus === 'COMPLETE' || result.paymentStatus === 'SUCCESS')) {
            const itemName = data.item_name || '';
            const isDeposit = itemName.includes('50% Deposit') || itemName.includes('deposit');
            let updated = null;
            if (isDeposit) {
                updated = db.update('orders', result.orderId, {
                    payment_status: 'deposit_paid',
                    deposit_paid: 1,
                    status: 'in_progress',
                    pf_payment_id: result.pfPaymentId,
                    payment_method: 'payfast',
                    updated_at: new Date().toISOString()
                });
            } else {
                updated = db.update('orders', result.orderId, {
                    payment_status: 'paid',
                    status: 'processing',
                    pf_payment_id: result.pfPaymentId,
                    payment_method: 'payfast',
                    updated_at: new Date().toISOString()
                });
            }
            if (!updated) {
                db.update('template_orders', result.orderId, {
                    payment_status: 'paid',
                    status: 'completed',
                    pf_payment_id: result.pfPaymentId,
                    payment_method: 'payfast',
                    updated_at: new Date().toISOString()
                });
            }
            res.status(200).send('OK');
        } else {
            res.status(200).send('IGNORED');
        }
    }).catch(() => res.status(200).send('ERROR'));
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
        const token = jwt.sign({ email: emailLower, role: 'client', clientId: id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, client: { id, name: name.trim(), email: emailLower, referral_code: refCode } });
    } catch {
        res.status(500).json({ error: 'Registration failed' });
    }
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
        const token = jwt.sign({ email: client.email, role: 'client', clientId: client.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, client: { id: client.id, name: client.name, email: client.email, phone: client.phone, referral_code: client.referral_code } });
    } catch {
        res.status(500).json({ error: 'Login failed' });
    }
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
});

app.get('/api/chat', authenticateToken, (req, res) => {
    const messages = db.query('chat_messages', null);
    res.json(messages);
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
    res.json({
        contactCount: contacts.length, orderCount: orders.length,
        reviewCount: reviews.length, appointmentCount: appointments.length,
        pendingOrders, pendingReviews, recentContacts,
        visitorCount: visitors.length, uniqueVisitors: uniqueVisitors.size, todayVisits
    });
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
        app.listen(PORT, () => {
            console.log(`Vincent IT Server running on http://localhost:${PORT}`);
            console.log(`Admin dashboard: http://localhost:${PORT}/admin/`);
            console.log(`Client portal: http://localhost:${PORT}/client/portal.html`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }).catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
}

module.exports = app;
