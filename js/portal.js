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
                    <button class="portal-tab" data-section="account">Account</button>
                </div>
                <div id="portalOrders" class="portal-section-content"></div>
                <div id="portalAppointments" class="portal-section-content" style="display:none;"></div>
                <div id="portalAccount" class="portal-section-content" style="display:none;">
                    <p>Referral Code: <strong id="portalRefCode"></strong></p>
                    <button class="btn btn-outline" id="portalLogout" data-i18n="portal.logout"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </div>
        </div>
    `;
    section.parentNode.insertBefore(portalSection, section.nextSibling);
    bindPortalEvents();
    checkPortalSession();
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
}

function savePortalSession() {
    localStorage.setItem('vit_portal_session', JSON.stringify(portalClient));
}

function checkPortalSession() {
    const saved = localStorage.getItem('vit_portal_session');
    if (saved) { portalClient = JSON.parse(saved); showPortalDashboard(); }
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
        </div>
    `).join('');
}

function renderPortalOrdersOffline(container) {
    const localOrders = JSON.parse(localStorage.getItem('vit_orders') || '[]');
    if (localOrders.length) renderPortalOrders(container, localOrders);
    else container.innerHTML = '<p style="color:var(--text-muted)" data-i18n="portal.noOrders">No orders yet</p>';
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
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p style="color:var(--text-muted)" data-i18n="portal.noAppointments">No appointments yet</p>';
    }
}
