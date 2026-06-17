const crypto = require('crypto');
const https = require('https');

const SANDBOX_URL = 'sandbox.payfast.co.za';
const LIVE_URL = 'www.payfast.co.za';

function isSandbox() {
    return process.env.PAYFAST_SANDBOX === 'true';
}

function getBaseUrl() {
    return isSandbox() ? SANDBOX_URL : LIVE_URL;
}

function getMerchantId() {
    return process.env.PAYFAST_MERCHANT_ID || '';
}

function getMerchantKey() {
    return process.env.PAYFAST_MERCHANT_KEY || '';
}

function generateSignature(data) {
    const keys = Object.keys(data).sort();
    const str = keys.map(k => `${k}=${encodeURIComponent(String(data[k])).replace(/%20/g, '+')}`).join('&');
    return crypto.createHash('md5').update(str).digest('hex');
}

function buildFormData(order) {
    const siteUrl = process.env.SITE_URL || 'https://vincent-it-freelancer.onrender.com';
    const data = {
        merchant_id: getMerchantId(),
        merchant_key: getMerchantKey(),
        return_url: `${siteUrl}/payment/success?order_id=${order.id}`,
        cancel_url: `${siteUrl}/payment/cancel?order_id=${order.id}`,
        notify_url: `${siteUrl}/api/payfast/itn`,
        name_first: order.client_name.split(' ')[0] || 'Customer',
        name_last: order.client_name.split(' ').slice(1).join(' ') || order.client_name,
        email_address: order.client_email,
        m_payment_id: order.id,
        amount: order.amount ? order.amount.toFixed(2) : '0.00',
        item_name: order.description || 'Vincent IT Service',
        custom_str1: order.type || 'service'
    };
    data.signature = generateSignature(data);
    return data;
}

function getPaymentFormHtml(order) {
    const data = buildFormData(order);
    const domain = `https://${getBaseUrl()}/eng/process`;
    let html = `<form id="payfast_form" action="${domain}" method="post">`;
    for (const [key, val] of Object.entries(data)) {
        html += `<input type="hidden" name="${key}" value="${val}">`;
    }
    html += `<button type="submit" style="width:100%;padding:1rem;background:linear-gradient(135deg,#00d4ff,#7b2ff7);border:none;border-radius:12px;color:#fff;font-size:1.1rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
        <i class="fas fa-lock"></i> Pay Now with PayFast
    </button></form>`;
    return html;
}

function getPaymentUrl(order) {
    const data = buildFormData(order);
    const domain = `https://${getBaseUrl()}/eng/process`;
    const params = Object.entries(data).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    return `${domain}?${params}`;
}

function validateItn(body) {
    return new Promise((resolve) => {
        if (!body || !body.payment_status) {
            return resolve({ valid: false, reason: 'Missing payment_status' });
        }
        const paymentStatus = body.payment_status;
        const orderId = body.m_payment_id || body.custom_str3 || '';
        const amount = body.amount_gross || body.amount;
        const pfPaymentId = body.pf_payment_id || '';
        const signature = body.signature;

        const expectedSig = generateSignature(body);
        let localValid = expectedSig === signature;

        if (!isSandbox() && localValid) {
            const itnUrl = `/eng/query/validate`;
            const data = Object.entries({ ...body, signature: undefined }).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
            const options = {
                hostname: getBaseUrl(),
                port: 443,
                path: itnUrl,
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
            };
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    const isValid = responseData.trim() === 'VALID';
                    resolve({
                        valid: isValid && localValid,
                        orderId,
                        paymentStatus,
                        pfPaymentId,
                        amount,
                        raw: responseData.trim()
                    });
                });
            });
            req.on('error', () => resolve({ valid: localValid, orderId, paymentStatus, pfPaymentId, amount, raw: 'CONNECTION_ERROR' }));
            req.write(data);
            req.end();
        } else {
            resolve({ valid: localValid, orderId, paymentStatus, pfPaymentId, amount, raw: 'SANDBOX_SKIP_VALIDATION' });
        }
    });
}

module.exports = { getPaymentFormHtml, getPaymentUrl, validateItn, buildFormData, isSandbox };
