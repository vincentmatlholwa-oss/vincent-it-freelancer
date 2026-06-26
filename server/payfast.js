const crypto = require('crypto');
const https = require('https');

const SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';
const LIVE_URL = 'https://www.payfast.co.za/eng/process';
const SANDBOX_QUERY = 'sandbox.payfast.co.za';
const LIVE_QUERY = 'www.payfast.co.za';

function isSandbox() {
    return process.env.PAYFAST_SANDBOX === 'true' || process.env.PAYFAST_SANDBOX === '1';
}

function getMerchantId() {
    return process.env.PAYFAST_MERCHANT_ID || (isSandbox() ? '10000100' : '');
}

function getMerchantKey() {
    return process.env.PAYFAST_MERCHANT_KEY || (isSandbox() ? '46f0cd694581a' : '');
}

function getPassphrase() {
    return process.env.PAYFAST_PASSPHRASE || '';
}

function getProcessUrl() {
    return isSandbox() ? SANDBOX_URL : LIVE_URL;
}

function generateSignature(params) {
    const keys = Object.keys(params).sort();
    const str = keys.map(k => `${k}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`).join('&');
    const pfOutput = getPassphrase() ? `${str}&passphrase=${encodeURIComponent(getPassphrase()).replace(/%20/g, '+')}` : str;
    return crypto.createHash('md5').update(pfOutput).digest('hex');
}

function buildPaymentData({ orderId, amount, itemName, itemDescription, nameFirst, nameLast, email, cell, returnUrl, cancelUrl, notifyUrl }) {
    const data = {
        merchant_id: getMerchantId(),
        merchant_key: getMerchantKey(),
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        name_first: (nameFirst || '').substring(0, 100),
        name_last: (nameLast || '').substring(0, 100),
        email_address: (email || '').substring(0, 100),
        cell_number: (cell || '').substring(0, 20),
        m_payment_id: orderId,
        amount: parseFloat(amount).toFixed(2),
        item_name: (itemName || 'Service').substring(0, 100),
        item_description: (itemDescription || '').substring(0, 255)
    };
    data.signature = generateSignature(data);
    return data;
}

function verifyITN(pfData) {
    return new Promise((resolve) => {
        const pfHost = isSandbox() ? SANDBOX_QUERY : LIVE_QUERY;
        const body = Object.keys(pfData).map(k => `${k}=${encodeURIComponent(String(pfData[k])).replace(/%20/g, '+')}`).join('&');
        const options = {
            hostname: pfHost,
            port: 443,
            path: '/eng/query/validate',
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const valid = data.trim() === 'VALID';
                resolve(valid);
            });
        });
        req.on('error', () => resolve(false));
        req.write(body);
        req.end();
    });
}

module.exports = { generateSignature, buildPaymentData, verifyITN, getProcessUrl, isSandbox };