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

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"]
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

// Health check (before rate limiter to avoid 429)
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/health', (req, res) => res.status(200).send('ok'));

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
    res.json({ success: true, message: 'Message received! We will get back to you shortly.' });
});

app.get('/api/contacts', authenticateToken, (req, res) => {
    const contacts = db.query('contacts', null);
    res.json(contacts.reverse());
});

// ===== Template Downloads =====
const crypto = require('crypto');

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
    res.json({ success: true, download_token: updated.download_token, message: 'Payment confirmed. Download link is now active.' });
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
    { name: 'service', label: 'Service', required: true, maxLength: 100 }
]), (req, res) => {
    const { client_name, client_email, client_phone, service, price } = req.body;
    const id = uuidv4();
    db.insert('orders', {
        id,
        client_name: client_name.trim().replace(/<[^>]*>/g, ''),
        client_email: client_email.trim().toLowerCase(),
        client_phone: (client_phone || '').trim().replace(/[^0-9+\-\s]/g, ''),
        service: service.trim(),
        price: (price || '').trim(),
        status: 'pending',
        payment_status: 'unpaid',
        deposit_paid: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });
    res.json({ success: true, order_id: id, message: 'Order created!' });
});

app.get('/api/orders', (req, res) => {
    const { email } = req.query;
    if (email) {
        const orders = db.query('orders', o => o.client_email.toLowerCase() === email.toLowerCase());
        return res.json(orders.reverse());
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
    updates.updated_at = new Date().toISOString();
    db.update('orders', req.params.id, updates);
    res.json({ success: true });
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
        res.json({ success: true, client: { id, name: name.trim(), email: emailLower, referral_code: refCode } });
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
        res.json({ success: true, client: { id: client.id, name: client.name, email: client.email, phone: client.phone, referral_code: client.referral_code } });
    } catch {
        res.status(500).json({ error: 'Login failed' });
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
