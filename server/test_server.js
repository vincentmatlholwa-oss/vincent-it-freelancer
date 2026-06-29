const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (e) {
        failed++;
        console.log(`  ✗ ${name}: ${e.message}`);
    }
}

console.log('\nServer tests\n');

// Verify critical server files exist
test('server.js exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, 'server.js')));
});

test('database.js exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, 'database.js')));
});

test('payfast.js exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, 'payfast.js')));
});

test('package.json exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, 'package.json')));
});

// Verify all required npm dependencies are listed
test('ai-chat.js exists', () => {
    assert.ok(fs.existsSync(path.join(__dirname, 'ai-chat.js')));
});

test('ai-chat module loads', () => {
    const aiChat = require('./ai-chat');
    assert.ok(typeof aiChat.generateResponse === 'function');
    assert.ok(typeof aiChat.isEnabled === 'function');
    assert.ok(typeof aiChat.getConfig === 'function');
    const cfg = aiChat.getConfig();
    assert.ok(typeof cfg.enabled === 'boolean');
});

test('required dependencies present', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const deps = Object.keys(pkg.dependencies);
    const required = ['express', 'sql.js', 'bcryptjs', 'jsonwebtoken', 'uuid', 'multer', 'pdfkit', 'ws', 'qrcode', 'svg-captcha', 'dotenv', 'cors', 'helmet', 'compression', 'morgan', 'express-rate-limit', 'web-push'];
    required.forEach(dep => {
        assert.ok(deps.includes(dep), `Missing dependency: ${dep}`);
    });
});

// Verify critical front-end files exist
const frontendFiles = [
    'index.html', 'services.html', 'portfolio.html', 'pricing.html',
    'templates.html', 'faq.html', 'contact.html', 'contract.html',
    'knowledge-base.html', 'privacy.html', 'qr.html', '404.html',
    'about.html', 'terms.html',
    'css/style.css', 'manifest.json', 'service-worker.js',
    'admin/index.html', 'blog/index.html', 'client/portal.html'
];

frontendFiles.forEach(file => {
    test(`frontend file exists: ${file}`, () => {
        assert.ok(fs.existsSync(path.join(__dirname, '..', file)), `Missing: ${file}`);
    });
});

// Verify JS files
const jsFiles = [
    'main.js', 'booking.js', 'chat.js', 'i18n.js', 'lazy-load.js',
    'portal.js', 'quiz.js', 'reviews.js', 'search-filter.js', 'three-background.js'
];

jsFiles.forEach(file => {
    test(`JS file exists: ${file}`, () => {
        assert.ok(fs.existsSync(path.join(__dirname, '..', 'js', file)), `Missing: js/${file}`);
    });
});

// Summary
console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
