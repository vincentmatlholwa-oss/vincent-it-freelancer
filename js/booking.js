function initBooking() {
    const section = document.getElementById('contact');
    if (!section) return;
    const bookingSection = document.createElement('div');
    bookingSection.className = 'booking-section';
    bookingSection.id = 'bookingSection';
    bookingSection.innerHTML = `
        <div class="section-header">
            <span class="section-badge" data-i18n="booking.title">Booking</span>
            <h2 data-i18n="booking.title">Book an Appointment</h2>
            <p class="section-desc" data-i18n="booking.desc">Schedule a time that works for you</p>
        </div>
        <div class="booking-container">
            <form id="bookingForm" class="booking-form">
                <div class="form-row">
                    <div class="form-group">
                        <label data-i18n="booking.name">Full Name *</label>
                        <input type="text" id="bookName" required>
                    </div>
                    <div class="form-group">
                        <label data-i18n="booking.email">Email *</label>
                        <input type="email" id="bookEmail" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label data-i18n="booking.phone">Phone</label>
                        <input type="tel" id="bookPhone">
                    </div>
                    <div class="form-group">
                        <label data-i18n="booking.service">Service *</label>
                        <select id="bookService" required>
                            <option value="">Select a service...</option>
                            ${(typeof services !== 'undefined' ? services : []).map(s => `<option value="${s.title}">${s.title}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label data-i18n="booking.date">Date *</label>
                        <input type="date" id="bookDate" required min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label data-i18n="booking.time">Time *</label>
                        <input type="time" id="bookTime" required>
                    </div>
                </div>
                <div class="form-group">
                    <label data-i18n="booking.notes">Additional Notes</label>
                    <textarea id="bookNotes" rows="2"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" data-i18n="booking.submit"><i class="fas fa-calendar-check"></i> Book Appointment</button>
                <div id="bookingMsg" class="form-message"></div>
            </form>
        </div>
    `;
    section.parentNode.insertBefore(bookingSection, section);

    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            client_name: document.getElementById('bookName').value.trim(),
            client_email: document.getElementById('bookEmail').value.trim(),
            client_phone: document.getElementById('bookPhone').value.trim(),
            service: document.getElementById('bookService').value,
            date: document.getElementById('bookDate').value,
            time: document.getElementById('bookTime').value,
            notes: document.getElementById('bookNotes').value.trim()
        };
        const msg = document.getElementById('bookingMsg');
        if (!data.client_name || !data.client_email || !data.service || !data.date || !data.time) {
            msg.innerHTML = '<span style="color:#ff6b35">Please fill in all required fields</span>'; return;
        }
        if (navigator.onLine) {
            try {
                const res = await fetch('/api/appointments', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
                });
                const result = await res.json();
                msg.innerHTML = `<span style="color:var(--accent-1)">${result.message || 'Appointment booked!'}</span>`;
                document.getElementById('bookingForm').reset();
            } catch { msg.innerHTML = '<span style="color:#ff6b35">Server unavailable. Saved locally.</span>'; saveBookingLocal(data); }
        } else { saveBookingLocal(data); msg.innerHTML = '<span style="color:var(--accent-1)">Appointment saved locally!</span>'; }
    });
}

function saveBookingLocal(data) {
    const apps = JSON.parse(localStorage.getItem('vit_appointments') || '[]');
    apps.push({ ...data, id: Date.now().toString(), status: 'pending', created_at: new Date().toISOString() });
    localStorage.setItem('vit_appointments', JSON.stringify(apps));
}

function initOrderTracking() {
    const section = document.getElementById('contract');
    if (!section) return;
    const trackerSection = document.createElement('div');
    trackerSection.className = 'tracker-section';
    trackerSection.id = 'trackerSection';
    trackerSection.innerHTML = `
        <div class="section-header">
            <span class="section-badge" data-i18n="tracker.title">Order Status</span>
            <h2 data-i18n="tracker.title">Track Your Order</h2>
            <p class="section-desc">Enter your email to check your order status</p>
        </div>
        <div class="tracker-container">
            <div class="tracker-search">
                <input type="email" id="trackerEmail" placeholder="Enter your email">
                <button class="btn btn-primary" id="trackerSearchBtn"><i class="fas fa-search"></i> Search</button>
            </div>
            <div id="trackerResults"></div>
        </div>
    `;
    section.parentNode.insertBefore(trackerSection, section);

    document.getElementById('trackerSearchBtn').addEventListener('click', searchOrders);
    document.getElementById('trackerEmail').addEventListener('keydown', e => { if (e.key === 'Enter') searchOrders(); });

    function searchOrders() {
        const email = document.getElementById('trackerEmail').value.trim();
        const container = document.getElementById('trackerResults');
        if (!email) { container.innerHTML = '<p style="color:var(--text-muted)">Please enter your email</p>'; return; }
        container.innerHTML = '<p style="color:var(--text-muted)">Searching...</p>';
        if (navigator.onLine) {
            fetch(`/api/orders?email=${encodeURIComponent(email)}`)
                .then(r => r.json())
                .then(orders => renderTrackerResults(container, orders))
                .catch(() => renderTrackerLocal(container, email));
        } else renderTrackerLocal(container, email);
    }

    function renderTrackerResults(container, orders) {
        if (!orders.length) { container.innerHTML = '<p style="color:var(--text-muted)">No orders found for this email</p>'; return; }
        container.innerHTML = orders.map(o => `
            <div class="tracker-card">
                <div class="tracker-header">
                    <strong>${o.service}</strong>
                    <span class="status-badge status-${o.status}">${o.status}</span>
                </div>
                <div class="tracker-body">
                    <p><strong>Price:</strong> ${o.price || 'N/A'}</p>
                    <p><strong>Payment:</strong> ${o.deposit_paid ? 'Deposit Paid' : o.payment_status}</p>
                    <p><strong>Ordered:</strong> ${new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div class="order-track">
                    <div class="track-step ${o.status !== 'cancelled' ? 'active' : ''}"><i class="fas fa-file-signature"></i><span>Contract Signed</span></div>
                    <div class="track-step ${o.status === 'in_progress' || o.status === 'completed' ? 'active' : ''}"><i class="fas fa-cogs"></i><span>In Progress</span></div>
                    <div class="track-step ${o.status === 'completed' ? 'active' : ''}"><i class="fas fa-check-circle"></i><span>Completed</span></div>
                </div>
            </div>
        `).join('');
    }

    function renderTrackerLocal(container, email) {
        const localOrders = JSON.parse(localStorage.getItem('vit_orders') || '[]').filter(o => o.client_email === email);
        if (localOrders.length) renderTrackerResults(container, localOrders);
        else container.innerHTML = '<p style="color:var(--text-muted)">No orders found. Submit a contract first!</p>';
    }
}
