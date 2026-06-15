function initReviews() {
    const section = document.getElementById('testimonials');
    if (!section) return;
    const reviewForm = document.createElement('div');
    reviewForm.className = 'review-form-section';
    reviewForm.id = 'reviewFormSection';
    reviewForm.innerHTML = `
        <div class="review-form-container">
            <h3 data-i18n="reviews.title">Leave a Review</h3>
            <form id="reviewForm" class="review-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="reviewName" data-i18n="reviews.name">Your Name *</label>
                        <input type="text" id="reviewName" required>
                    </div>
                    <div class="form-group">
                        <label for="reviewEmail">Email</label>
                        <input type="email" id="reviewEmail">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label data-i18n="reviews.rating">Rating *</label>
                        <div class="star-rating" id="starRating">
                            ${[1,2,3,4,5].map(i => `<i class="fas fa-star" data-star="${i}"></i>`).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="reviewService" data-i18n="reviews.service">Service Used</label>
                        <select id="reviewService">
                            <option value="">Select service...</option>
                            ${(typeof services !== 'undefined' ? services : []).map(s => `<option value="${s.title}">${s.title}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="reviewText" data-i18n="reviews.text">Your Review *</label>
                    <textarea id="reviewText" rows="3" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary" data-i18n="reviews.submit"><i class="fas fa-paper-plane"></i> Submit Review</button>
                <div id="reviewMsg" class="form-message"></div>
            </form>
        </div>
    `;
    section.parentNode.insertBefore(reviewForm, section.nextSibling);

    let selectedRating = 0;
    const stars = document.querySelectorAll('#starRating .fa-star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.star);
            stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
        });
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.star);
            stars.forEach((s, i) => s.classList.toggle('hover', i < val));
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('hover'));
        });
    });

    document.getElementById('reviewForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reviewName').value.trim();
        const email = document.getElementById('reviewEmail').value.trim();
        const service = document.getElementById('reviewService').value;
        const text = document.getElementById('reviewText').value.trim();
        const msg = document.getElementById('reviewMsg');

        if (!name) { msg.textContent = 'Please enter your name'; return; }
        if (!selectedRating) { msg.textContent = 'Please select a rating'; return; }
        if (!text) { msg.textContent = 'Please write your review'; return; }

        const data = { client_name: name, email, rating: selectedRating, text, service };
        if (navigator.onLine) {
            try {
                const res = await fetch('/api/reviews', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
                });
                const result = await res.json();
                msg.innerHTML = `<span style="color:var(--accent-1)">${result.message || 'Review submitted!'}</span>`;
                document.getElementById('reviewForm').reset();
                selectedRating = 0;
                stars.forEach(s => s.classList.remove('active'));
            } catch { msg.innerHTML = '<span style="color:var(--accent-1)">Review submitted! (offline mode)</span>'; }
        } else {
            const reviews = JSON.parse(localStorage.getItem('vit_reviews') || '[]');
            reviews.push({ ...data, id: Date.now(), approved: 0, created_at: new Date().toISOString() });
            localStorage.setItem('vit_reviews', JSON.stringify(reviews));
            msg.innerHTML = '<span style="color:var(--accent-1)">Review saved locally!</span>';
            document.getElementById('reviewForm').reset();
            selectedRating = 0;
            stars.forEach(s => s.classList.remove('active'));
        }
    });
}

function initGallery() {
    const section = document.getElementById('portfolio');
    if (!section) return;
    const gallery = document.createElement('div');
    gallery.className = 'gallery-section';
    gallery.id = 'gallerySection';
    gallery.innerHTML = `
        <div class="section-header">
            <span class="section-badge">Gallery</span>
            <h2>Before & After</h2>
            <p class="section-desc">Real results from real projects</p>
        </div>
        <div class="gallery-grid" id="galleryGrid">
            ${[
                { title: 'BSOD Repair', img: null, desc: 'Blue screen error fixed, all data recovered' },
                { title: 'SSD Upgrade', img: null, desc: 'Boot time reduced from 3min to 15sec' },
                { title: 'Office Activation', img: null, desc: 'Office 365 fully activated (10 workstations)' },
                { title: 'CV Transformation', img: null, desc: 'Modern ATS-friendly CV design' }
            ].map((item, i) => `
                <div class="gallery-card gallery-placeholder" style="--g-delay:${i * 0.1}s">
                    <div class="gallery-badge">${item.title}</div>
                    <div class="gallery-img-placeholder">
                        <i class="fas fa-image"></i>
                        <span>Before / After</span>
                    </div>
                    <p>${item.desc}</p>
                </div>
            `).join('')}
        </div>
    `;
    section.parentNode.insertBefore(gallery, section.nextSibling);
}
