function initPortal() {
    const section = document.getElementById('contract');
    if (!section) return;
    const portalSection = document.createElement('div');
    portalSection.className = 'portal-section';
    portalSection.id = 'portalSection';
    portalSection.innerHTML = `
        <div class="section-header">
            <span class="section-badge" data-i18n="portal.title">Client Portal</span>
            <h2 data-i18n="portal.title">Client Portal</h2>
            <p class="section-desc">Track your orders, appointments, and more</p>
        </div>
        <div class="portal-body" id="portalBody">
            <div class="portal-auth" id="portalAuth">
                <div class="portal-tabs">
                    <button class="portal-tab active" data-tab="login" data-i18n="portal.login">Login</button>
                    <button class="portal-tab" data-tab="register" data-i18n="portal.register">Register</button>
                    <button class="portal-tab" data-tab="forgot" id="forgotTabBtn" style="display:none">Reset Password</button>
                </div>
                <div class="portal-form-container">
                    <form id="loginForm" class="portal-form active">
                        <div class="form-group">
                            <label data-i18n="portal.email">Email</label>
                            <input type="email" id="loginEmail" required>
                        </div>
                        <div class="form-group">
                            <label data-i18n="portal.password">Password</label>
                            <input type="password" id="loginPassword" required>
                        </div>
                        <button type="submit" class="btn btn-primary" data-i18n="portal.login"><i class="fas fa-sign-in-alt"></i> Login</button>
                        <div id="loginMsg" class="form-message"></div>
                        <p style="margin-top:0.5rem;font-size:0.8rem"><a href="#" id="showForgotPassword" style="color:var(--accent-1)">Forgot password?</a></p>
                    </form>
                    <form id="registerForm" class="portal-form">
                        <div class="form-group">
                            <label data-i18n="portal.name">Full Name</label>
                            <input type="text" id="regName" required>
                        </div>
                        <div class="form-group">
                            <label data-i18n="portal.email">Email</label>
                            <input type="email" id="regEmail" required>
                        </div>
                        <div class="form-group">
                            <label data-i18n="portal.phone">Phone</label>
                            <input type="tel" id="regPhone">
                        </div>
                        <div class="form-group">
                            <label data-i18n="portal.password">Password</label>
                            <input type="password" id="regPassword" required minlength="4">
                        </div>
                        <button type="submit" class="btn btn-primary" data-i18n="portal.register"><i class="fas fa-user-plus"></i> Register</button>
                        <div id="regMsg" class="form-message"></div>
                    </form>
                    <form id="forgotForm" class="portal-form">
                        <h4 style="margin-bottom:1rem;color:var(--accent-1)">Reset Password</h4>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="forgotEmail" required>
                        </div>
                        <div class="form-group" id="resetPasswordGroup" style="display:none">
                            <label>New Password</label>
                            <input type="password" id="resetPassword" required minlength="6">
                        </div>
                        <button type="submit" class="btn btn-primary" id="forgotBtn"><i class="fas fa-paper-plane"></i> Send Reset Link</button>
                        <div id="forgotMsg" class="form-message"></div>
                    </form>
                </div>
            </div>
            <div class="portal-dashboard" id="portalDashboard" style="display:none;">
                <div class="portal-welcome">
                    <h3 data-i18n="portal.welcome">Welcome</h3>
                    <p id="portalUserName"></p>
                    <span class="portal-ref" id="portalRef"></span>
                </div>
                <div class="portal-tabs">
                    <button class="portal-tab active" data-section="orders" data-i18n="portal.orders">My Orders</button>
                    <button class="portal-tab" data-section="appointments" data-i18n="portal.appointments">My Appointments</button>
                    <button class="portal-tab" data-section="referrals">Referrals</button>
                    <button class="portal-tab" data-section="account">Account</button>
                </div>
                <div id="portalOrders" class="portal-section-content"></div>
                <div id="portalAppointments" class="portal-section-content" style="display:none;"></div>
                <div id="portalReferrals" class="portal-section-content" style="display:none;"></div>
                <div id="portalAccount" class="portal-section-content" style="display:none;">
                    <p>Referral Code: <strong id="portalRefCode" style="color:var(--accent-1);letter-spacing:1px"></strong></p>
                    <p style="color:var(--text-muted);font-size:0.8rem">Share your code — earn R10 per referral!</p>
                    <p><a href="#" id="showForgotPasswordDash" style="color:var(--accent-1);font-size:0.85rem">Change Password</a></p>
                    <button class="btn btn-outline" id="portalLogout" data-i18n="portal.logout"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </div>
        </div>
    `;
    section.parentNode.insertBefore(portalSection, section.nextSibling);
    bindPortalEvents();
    checkPortalSession();
    checkResetToken();
}

let portalClient = null;

function bindPortalEvents() {
    document.querySelectorAll('.portal-tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.portal-tab[data-tab]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.portal-form').forEach(f => f.classList.remove('active'));
            const form = document.getElementById(tab.dataset.tab + 'Form');
            if (form) form.classList.add('active');
        });
    });

    document.querySelectorAll('.portal-tab[data-section]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.portal-tab[data-section]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.portal-section-content').forEach(s => s.style.display = 'none');
            const sec = document.getElementById('portal' + tab.dataset.section.charAt(0).toUpperCase() + tab.dataset.section.slice(1));
            if (sec) sec.style.display = 'block';
            if (tab.dataset.section === 'orders') loadPortalOrders();
            if (tab.dataset.section === 'appointments') loadPortalAppointments();
            if (tab.dataset.section === 'referrals') loadPortalReferrals();
        });
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const msg = document.getElementById('loginMsg');
        if (navigator.onLine) {
            try {
                const res = await fetch('/api/clients/login', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) { portalClient = data.client; savePortalSession(); showPortalDashboard(); }
                else if (data.needsVerification) {
                    msg.innerHTML = `<span style="color:#ff6b35">${data.error}</span>
                        <p style="margin-top:0.5rem"><button class="btn btn-sm btn-outline" onclick="resendVerification('${data.email}')" style="font-size:0.8rem;padding:0.3rem 0.8rem">Resend verification email</button></p>`;
                }
                else msg.innerHTML = `<span style="color:#ff6b35">${data.error}</span>`;
            } catch { msg.innerHTML = '<span style="color:#ff6b35">Server unavailable</span>'; }
        } else { msg.innerHTML = '<span style="color:#ff6b35">You need an internet connection to log in</span>'; }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const msg = document.getElementById('regMsg');
        if (navigator.onLine) {
            try {
                const res = await fetch('/api/clients/register', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone, password })
                });
                const data = await res.json();
                if (data.success) { portalClient = data.client; savePortalSession(); showPortalDashboard(); }
                else msg.innerHTML = `<span style="color:#ff6b35">${data.error}</span>`;
            } catch { msg.innerHTML = '<span style="color:#ff6b35">Server unavailable</span>'; }
        } else {
            const clients = JSON.parse(localStorage.getItem('vit_clients') || '[]');
            if (clients.find(c => c.email === email)) { msg.innerHTML = '<span style="color:#ff6b35">Email already registered</span>'; return; }
            const refCode = 'VIN-' + Math.random().toString(36).substr(2, 4).toUpperCase();
            const client = { id: Date.now().toString(), name, email, phone, password, referral_code: refCode };
            clients.push(client);
            localStorage.setItem('vit_clients', JSON.stringify(clients));
            portalClient = client; savePortalSession(); showPortalDashboard();
        }
    });

    document.getElementById('portalLogout')?.addEventListener('click', () => {
        portalClient = null; localStorage.removeItem('vit_portal_session');
        document.getElementById('portalAuth').style.display = 'block';
        document.getElementById('portalDashboard').style.display = 'none';
    });

    document.getElementById('showForgotPassword')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotForm();
    });
    document.getElementById('showForgotPasswordDash')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotForm();
    });

    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value.trim();
        const resetData = window.__resetData;
        const msg = document.getElementById('forgotMsg');
        const btn = document.getElementById('forgotBtn');

        if (resetData && resetData.token) {
            const password = document.getElementById('resetPassword').value;
            if (!password || password.length < 6) {
                msg.innerHTML = '<span style="color:#ff6b35">Password must be at least 6 characters</span>';
                return;
            }
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            try {
                const res = await fetch('/api/clients/reset-password', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: resetData.email, token: resetData.token, password })
                });
                const data = await res.json();
                if (data.success) {
                    msg.innerHTML = '<span style="color:#00c853"><i class="fas fa-check-circle"></i> Password reset successfully! You can now log in.</span>';
                    document.getElementById('resetPasswordGroup').style.display = 'none';
                    btn.style.display = 'none';
                    window.__resetData = null;
                    setTimeout(() => { document.querySelector('.portal-tab[data-tab="login"]')?.click(); }, 2000);
                } else {
                    msg.innerHTML = '<span style="color:#ff6b35">' + (data.error || 'Reset failed') + '</span>';
                }
            } catch {
                msg.innerHTML = '<span style="color:#ff6b35">Server error. Please try again.</span>';
            }
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Set New Password';
        } else {
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            try {
                const res = await fetch('/api/clients/forgot-password', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (data.success) {
                    msg.innerHTML = '<span style="color:#00c853"><i class="fas fa-check-circle"></i> If the email exists, a reset link has been sent. Check your inbox (including spam).</span>';
                } else {
                    msg.innerHTML = '<span style="color:#ff6b35">' + (data.error || 'Failed') + '</span>';
                }
            } catch {
                msg.innerHTML = '<span style="color:#ff6b35">Server error. Please try again.</span>';
            }
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        }
    });
}

function savePortalSession() {
    localStorage.setItem('vit_portal_session', JSON.stringify(portalClient));
}

function checkPortalSession() {
    const saved = localStorage.getItem('vit_portal_session');
    if (saved) { portalClient = JSON.parse(saved); showPortalDashboard(); }
}

function loadPortalReferrals() {
    const container = document.getElementById('portalReferrals');
    container.innerHTML = '<p style="color:var(--text-muted)">Loading referrals...</p>';
    if (navigator.onLine && portalClient?.email) {
        fetch(`/api/client/referrals?email=${encodeURIComponent(portalClient.email)}`)
            .then(r => r.json())
            .then(data => {
                const shareLink = `https://wa.me/27677834591?text=${encodeURIComponent('Use my referral code ' + data.referral_code + ' when ordering from Vincent IT Freelancer and we both save!')}`;
                container.innerHTML = `
                    <div class="portal-card">
                        <div class="portal-card-header"><strong><i class="fas fa-gift" style="color:var(--accent-1)"></i> Your Referral Program</strong></div>
                        <div class="portal-card-body">
                            <p style="margin-bottom:0.5rem">Your referral code: <strong style="color:var(--accent-1);font-size:1.2rem;letter-spacing:2px">${data.referral_code}</strong></p>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin:1rem 0;text-align:center">
                                <div style="background:rgba(0,212,255,0.06);border-radius:8px;padding:0.8rem"><div style="font-size:1.5rem;font-weight:900;color:var(--accent-1)">${data.total_referred}</div><div style="font-size:0.75rem;color:var(--text-muted)">Referred</div></div>
                                <div style="background:rgba(0,200,83,0.06);border-radius:8px;padding:0.8rem"><div style="font-size:1.5rem;font-weight:900;color:#00c853">R${data.referral_earnings}</div><div style="font-size:0.75rem;color:var(--text-muted)">Earned</div></div>
                                <div style="background:rgba(123,47,247,0.06);border-radius:8px;padding:0.8rem"><div style="font-size:1.5rem;font-weight:900;color:#7b2ff7">${data.paid_orders}</div><div style="font-size:0.75rem;color:var(--text-muted)">Orders Paid</div></div>
                            </div>
                            ${data.referred_clients && data.referred_clients.length ? `
                                <p style="font-weight:600;color:var(--accent-1);margin-top:0.5rem">People you referred:</p>
                                ${data.referred_clients.map(r => `<p style="font-size:0.85rem;color:var(--text-muted)">• ${r.name} — ${new Date(r.date).toLocaleDateString()}</p>`).join('')}
                            ` : '<p style="color:var(--text-muted);font-size:0.85rem">No referrals yet. Share your code!</p>'}
                            <a href="${shareLink}" target="_blank" class="btn btn-whatsapp" style="margin-top:1rem;display:inline-flex;justify-content:center;width:100%"><i class="fab fa-whatsapp"></i> Share Referral Code on WhatsApp</a>
                        </div>
                    </div>
                `;
            })
            .catch(() => { container.innerHTML = '<p style="color:var(--text-muted)">Could not load referral data.</p>'; });
    } else {
        container.innerHTML = '<p style="color:var(--text-muted)">Log in to view your referrals.</p>';
    }
}

function showPortalDashboard() {
    document.getElementById('portalAuth').style.display = 'none';
    document.getElementById('portalDashboard').style.display = 'block';
    document.getElementById('portalUserName').textContent = portalClient.name;
    document.getElementById('portalRef').textContent = 'Ref: ' + (portalClient.referral_code || 'N/A');
    document.getElementById('portalRefCode').textContent = portalClient.referral_code || 'N/A';
    loadPortalOrders();
}

function loadPortalOrders() {
    const container = document.getElementById('portalOrders');
    container.innerHTML = '<p style="color:var(--text-muted)">Loading orders...</p>';
    if (navigator.onLine && portalClient?.email) {
        fetch(`/api/orders?email=${encodeURIComponent(portalClient.email)}`)
            .then(r => r.json())
            .then(orders => renderPortalOrders(container, orders))
            .catch(() => renderPortalOrdersOffline(container));
    } else renderPortalOrdersOffline(container);
}

async function cancelOrder(id) {
    if (!confirm('Cancel this order?')) return;
    const email = portalClient?.email;
    if (!email) { alert('Please log in to cancel orders.'); return; }
    try {
        const res = await fetch('/api/orders/' + id + '/cancel', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) { loadPortalOrders(); } else { alert(data.error || 'Cancel failed'); }
    } catch { alert('Server unavailable'); }
}

function renderPortalOrders(container, orders) {
    if (!orders.length) { container.innerHTML = '<p style="color:var(--text-muted)" data-i18n="portal.noOrders">No orders yet</p>'; return; }
    container.innerHTML = orders.map(o => `
        <div class="portal-card">
            <div class="portal-card-header">
                <strong>${o.service}</strong>
                <span class="status-badge status-${o.status}">${o.status}</span>
            </div>
            <div class="portal-card-body">
                <span>Price: ${o.price || 'N/A'}</span>
                <span>Payment: <span class="status-badge status-${o.payment_status === 'paid' ? 'completed' : 'pending'}">${o.deposit_paid ? 'Deposit Paid' : o.payment_status}</span></span>
                <span class="portal-date">${new Date(o.created_at).toLocaleDateString()}</span>
            </div>
            <div class="order-track">
                <div class="track-step ${o.status === 'pending' || o.deposit_paid ? 'active' : ''}"><i class="fas fa-file-signature"></i><span>Contract</span></div>
                <div class="track-step ${o.status === 'in_progress' ? 'active' : ''}"><i class="fas fa-cogs"></i><span>In Progress</span></div>
                <div class="track-step ${o.status === 'completed' ? 'active' : ''}"><i class="fas fa-check-circle"></i><span>Completed</span></div>
            </div>
            ${o.status !== 'completed' && o.status !== 'cancelled' ? '<button class="btn btn-sm btn-outline" onclick="cancelOrder(\'' + o.id + '\')" style="margin-top:0.5rem;color:#ff6b35;border-color:#ff6b35;font-size:0.75rem"><i class="fas fa-times"></i> Cancel</button>' : ''}
        </div>
    `).join('');
}

function renderPortalOrdersOffline(container) {
    const localOrders = JSON.parse(localStorage.getItem('vit_orders') || '[]');
    if (localOrders.length) renderPortalOrders(container, localOrders);
    else container.innerHTML = '<p style="color:var(--text-muted)" data-i18n="portal.noOrders">No orders yet</p>';
}

async function cancelAppointment(id) {
    if (!confirm('Cancel this appointment?')) return;
    const email = portalClient?.email;
    if (!email) { alert('Please log in to cancel appointments.'); return; }
    try {
        const res = await fetch('/api/appointments/' + id + '/cancel', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) { loadPortalAppointments(); } else { alert(data.error || 'Cancel failed'); }
    } catch { alert('Server unavailable'); }
}

function checkResetToken() {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token');
    const email = params.get('email');
    if (resetToken && email) {
        document.getElementById('forgotEmail').value = email;
        document.getElementById('resetPasswordGroup').style.display = 'block';
        document.getElementById('forgotBtn').innerHTML = '<i class="fas fa-save"></i> Set New Password';
        document.getElementById('forgotTabBtn').style.display = 'inline-block';
        document.getElementById('forgotTabBtn').click();
        window.__resetData = { token: resetToken, email: email };
    }
}

function showForgotForm() {
    document.querySelectorAll('.portal-tab[data-tab]').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.portal-form').forEach(f => f.classList.remove('active'));
    document.getElementById('forgotTabBtn').style.display = 'inline-block';
    document.getElementById('forgotTabBtn').classList.add('active');
    document.getElementById('forgotForm').classList.add('active');
}

async function resendVerification(email) {
    const msg = document.getElementById('loginMsg');
    msg.innerHTML = '<span style="color:var(--text-muted)">Sending verification email...</span>';
    try {
        const res = await fetch('/api/clients/resend-verification', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) msg.innerHTML = '<span style="color:#00c853">Verification email resent! Check your inbox (including spam).</span>';
        else msg.innerHTML = '<span style="color:#ff6b35">' + (data.error || 'Failed') + '</span>';
    } catch { msg.innerHTML = '<span style="color:#ff6b35">Server error</span>'; }
}

function loadPortalAppointments() {
    const container = document.getElementById('portalAppointments');
    container.innerHTML = '<p style="color:var(--text-muted)">Loading appointments...</p>';
    const localApps = JSON.parse(localStorage.getItem('vit_appointments') || '[]');
    if (localApps.length) {
        container.innerHTML = localApps.map(a => `
            <div class="portal-card">
                <div class="portal-card-header">
                    <strong>${a.service}</strong>
                    <span class="status-badge status-${a.status || 'pending'}">${a.status || 'pending'}</span>
                </div>
                <div class="portal-card-body">
                    <span>${new Date(a.date).toLocaleDateString()} at ${a.time}</span>
                </div>
                ${a.status !== 'cancelled' ? '<div style="margin-top:0.5rem"><button class="btn btn-sm btn-outline" onclick="cancelAppointment(\'' + a.id + '\')" style="color:#ff6b35;border-color:#ff6b35;font-size:0.75rem"><i class="fas fa-times"></i> Cancel</button></div>' : ''}
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p style="color:var(--text-muted)" data-i18n="portal.noAppointments">No appointments yet</p>';
    }
}
