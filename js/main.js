// ===== Services Data =====
const services = [
    {
        icon: 'fa-brands fa-microsoft', title: 'MS Office Activation',
        desc: 'Activation for Office 2013, 2016, 2019, 2021, 2024 & 365. Lifetime license.',
        price: 'R300 - R350', est: '15-30 min',
        features: ['All versions supported', 'Lifetime activation', 'Both 32 & 64-bit']
    },
    {
        icon: 'fa-brands fa-windows', title: 'Windows 10 & 11 Activation',
        desc: 'Professional activation for Windows 10 and 11 with genuine licenses.',
        price: 'R300 - R450', est: '15-30 min',
        features: ['Home & Pro editions', 'Digital license', 'Reinstall ready']
    },
    {
        icon: 'fa-solid fa-gem', title: 'Office + Windows Bundle',
        desc: 'Best value — activate both Office and Windows at a discounted price.',
        price: 'R300 - R500', est: '30-45 min',
        features: ['Full bundle discount', 'Both activated', 'R50+ savings'], featured: true
    },
    {
        icon: 'fa-solid fa-truck-fast', title: 'Remote Installation',
        desc: 'Full remote setup of MS Office & Windows including activation via TeamViewer/AnyDesk.',
        price: 'R300 - R700', est: '1-3 hours',
        features: ['50% deposit required', 'Full installation', 'Remote support'], remote: true
    },
    {
        icon: 'fa-solid fa-triangle-exclamation', title: 'Blue Screen Repair',
        desc: 'Diagnose and fix BSOD errors. Get your PC booting again fast.',
        price: 'R300 - R450', est: '1-2 hours',
        features: ['Error diagnosis', 'Driver fixes', 'System restore']
    },
    {
        icon: 'fa-solid fa-database', title: 'BSOD + Data Recovery',
        desc: 'Fix blue screen errors AND recover your important data safely.',
        price: 'R450 - R900', est: '2-24 hours',
        features: ['Full BSOD fix', 'Data backup', 'File recovery']
    },
    {
        icon: 'fa-solid fa-microchip', title: 'Desktop Hardware Upgrade',
        desc: 'RAM, SSD, GPU upgrades and more. Faster performance guaranteed.',
        price: 'R300 - R1500', est: '1-3 hours',
        features: ['Parts fitting', 'Performance test', 'Thermal paste']
    },
    {
        icon: 'fa-solid fa-file-pen', title: 'CV Creation / Revamp',
        desc: 'Professional CV writing and redesign. ATS-friendly, modern templates.',
        price: 'R300 - R450', est: '1-2 days',
        features: ['Professional design', 'ATS optimized', 'PDF + Word']
    },
    {
        icon: 'fa-solid fa-graduation-cap', title: 'College / School Assignments',
        desc: 'Academic assistance for assignments, projects, and research papers.',
        price: 'R300 - R750', est: '1-5 days',
        features: ['Plagiarism free', 'Well researched', 'On-time delivery']
    },
    {
        icon: 'fa-solid fa-laptop-code', title: 'Website Template + Customisation',
        desc: 'Professional website templates fully customised to your brand. Responsive, modern, and ready to launch.',
        price: 'From R500', est: '2-7 days',
        features: ['Responsive design', 'Custom branding', 'Mobile friendly']
    }
];

const cvTemplates = [
    {
        icon: 'fa-solid fa-file-lines', title: 'Classic Professional CV',
        desc: 'Timeless serif design with traditional layout. Perfect for law, finance, academia, and conservative industries. ATS-friendly semantic HTML.',
        features: ['Serif typography', 'Traditional layout', 'ATS-optimized', 'Print-ready CSS', 'Customizable colors'], id: 'cv-classic',
        category: 'CV Template', price: 'R150', type: 'cv'
    },
    {
        icon: 'fa-solid fa-pen-fancy', title: 'Modern Clean CV',
        desc: 'Contemporary sans-serif design with accent color sidebar. Ideal for tech, creative, and marketing professionals. Two-column layout.',
        features: ['Sans-serif modern', 'Two-column layout', 'ATS-friendly HTML', 'Gradient header', 'Print optimized'], id: 'cv-modern',
        category: 'CV Template', price: 'R150', type: 'cv'
    },
    {
        icon: 'fa-solid fa-crown', title: 'Executive Premium CV',
        desc: 'Executive-grade CV with skill bars, dark header, and premium feel. Made for senior roles, C-level positions, and board members.',
        features: ['Executive styling', 'Skill proficiency bars', 'Dark premium header', 'ATS semantic markup', 'Contact sidebar'], id: 'cv-executive',
        category: 'CV Template', price: 'R200', type: 'cv'
    },
    {
        icon: 'fa-solid fa-minus', title: 'Minimal ATS CV',
        desc: 'Ultra-clean, maximum ATS compatibility. No columns, no tables, no complex CSS. Highest parser score guaranteed.',
        features: ['Maximum ATS score', 'Single-column flow', 'No complex layouts', 'Plain semantic HTML', 'Fast parsing'], id: 'cv-minimal',
        category: 'CV Template', price: 'R100', type: 'cv'
    }
];

const templates = [
    {
        icon: 'fa-solid fa-bolt', title: 'Pulse — SaaS Landing Page',
        desc: 'Modern SaaS/product landing page with dark mode, pricing tiers, testimonials accordion FAQ, and smooth scroll animations. Perfect for startups, AI tools, and tech products.',
        features: ['Dark & light mode', '3 pricing tiers', 'Testimonials carousel', 'FAQ accordion', 'Scroll animations'],
        demo: '/templates/pulse/', category: 'Landing Page',
        price: 'From R500'
    },
    {
        icon: 'fa-solid fa-dumbbell', title: 'FitForge — Fitness Coach',
        desc: 'Config-driven fitness coach website with multi-niche theme system (fitness, restaurant, agency, course). Includes services, gallery, booking form, and testimonials carousel.',
        features: ['Multi-niche themes', 'Config-driven content', 'Pricing toggle', 'Filterable gallery', 'WhatsApp integration', 'Cookie consent'],
        demo: '/templates/fitforge/', category: 'Business',
        price: 'From R700'
    },
    {
        icon: 'fa-solid fa-user-astronaut', title: 'Interactive Portfolio',
        desc: 'Personal portfolio with typewriter effect, filterable project gallery, skills showcase, and dark mode. Ideal for developers, designers, and creative professionals.',
        features: ['Typing animation', 'Filterable projects', 'Skills grid', 'Dark mode', 'Testimonials', 'Contact form'],
        demo: '/templates/portfolio/', category: 'Portfolio',
        price: 'From R500'
    }
];

const compareAttrs = ['Office', 'Windows', 'BSOD Fix', 'Data Recovery', 'Hardware', 'CV', 'Assignments', 'Website'];

// ===== Render Services =====
function renderServices() {
    const grid = document.getElementById('servicesGrid');
    grid.innerHTML = services.map((s, i) => `
        <div class="service-card fade-in" data-index="${i}" style="animation-delay:${0.1 * (i + 1)}s">
            <div class="service-icon"><i class="${s.icon} service-icon-inner"></i></div>
            <h3>${s.title}</h3>
            <p>${s.desc}</p>
            <div class="service-est"><i class="far fa-clock"></i> Est. ${s.est}</div>
        </div>
    `).join('');
    grid.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.index);
            const pricingCards = document.querySelectorAll('.pricing-card');
            if (pricingCards[idx]) {
                pricingCards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                pricingCards[idx].style.borderColor = '#00d4ff';
                setTimeout(() => { pricingCards[idx].style.borderColor = ''; }, 2000);
            }
        });
    });
}

// ===== Comparison Table =====
function renderComparison() {
    const table = document.getElementById('compareTable');
    let html = '<table><thead><tr><th>Feature</th>';
    services.forEach(s => { html += `<th>${s.title}</th>`; });
    html += '</tr></thead><tbody>';
    compareAttrs.forEach(attr => {
        html += `<tr><td>${attr}</td>`;
        services.forEach(s => {
            const has = s.features.some(f => f.toLowerCase().includes(attr.toLowerCase())) ||
                       s.title.toLowerCase().includes(attr.toLowerCase()) ||
                       s.desc.toLowerCase().includes(attr.toLowerCase());
            html += `<td>${has ? '<i class="fas fa-check" style="color:var(--accent-1)"></i>' : '<i class="fas fa-times" style="color:#ff4444;opacity:0.5"></i>'}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    table.innerHTML = html;
}

// ===== Render Pricing =====
function renderPricing() {
    const grid = document.getElementById('pricingGrid');
    grid.innerHTML = services.map((s, i) => `
        <div class="pricing-card ${s.featured ? 'featured' : ''} fade-in" style="animation-delay:${0.1 * (i + 1)}s">
            <div class="pricing-icon"><i class="${s.icon}"></i></div>
            <h3>${s.title}</h3>
            <p class="pricing-desc">${s.desc}</p>
            <div class="pricing-amount">${s.price}</div>
            <div class="pricing-est"><i class="far fa-clock"></i> Est. ${s.est}</div>
            ${s.remote ? '<div class="pricing-note">50% deposit to start</div>' : '<div class="pricing-note">&nbsp;</div>'}
            <div class="discount-badge">
                <span><i class="fas fa-graduation-cap"></i> Student 10% off</span>
                <span><i class="fas fa-user-friends"></i> Returning 5% off</span>
            </div>
            <ul class="pricing-features">
                ${s.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')}
            </ul>
            <button class="btn add-to-cart-btn" data-index="${i}">
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    `).join('');
    grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', () => addToCart(parseInt(btn.dataset.index)));
    });
}

function renderTemplates() {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;
    const allTemplates = [...cvTemplates, ...templates];
    grid.innerHTML = allTemplates.map((t, i) => `
        <div class="template-card fade-in" style="animation-delay:${0.1 * (i + 1)}s">
            <div class="template-header">
                <div class="template-icon"><i class="${t.icon}"></i></div>
                <span class="template-category">${t.category}</span>
            </div>
            <h3>${t.title}</h3>
            <p>${t.desc}</p>
            <div class="template-features">
                ${t.features.map(f => `<span class="template-tag"><i class="fas fa-check-circle"></i> ${f}</span>`).join('')}
            </div>
            <div class="template-footer">
                <span class="template-price">${t.price}</span>
                <div class="template-actions">
                    ${t.type === 'cv'
                        ? `<button class="btn btn-sm btn-primary" onclick="buyCVTemplate('${t.id}','${t.title}','${t.price}')"><i class="fas fa-shopping-cart"></i> Buy & Download</button>`
                        : `<a href="${t.demo}" target="_blank" class="btn btn-sm btn-outline"><i class="fas fa-eye"></i> Preview</a>
                           <a href="https://wa.me/27677834591?text=Hi%20Vincent%20IT!%20I%27m%20interested%20in%20the%20${encodeURIComponent(t.title)}.%20Can%20you%20customise%20it%20for%20my%20business%3F" target="_blank" class="btn btn-sm btn-whatsapp"><i class="fab fa-whatsapp"></i> Get This</a>`
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function buyCVTemplate(id, title, price) {
    const name = prompt('Enter your full name:');
    if (!name) return;
    const email = prompt('Enter your email address:');
    if (!email || !email.includes('@')) { alert('Please enter a valid email.'); return; }
    const phone = prompt('Enter your phone number (optional):');
    if (navigator.onLine) {
        fetch('/api/templates/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_name: name, client_email: email, client_phone: phone || '', template_id: id })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                alert(`Order created!\n\nOrder ID: ${data.order_id}\n\nTo complete your purchase:\n1. Send R${price} via EFT/SnapScan\n2. WhatsApp us your Order ID\n3. We'll send your download link!\n\nPrice: ${price}\nProduct: ${title}`);
                const msg = encodeURIComponent(`Hi Vincent IT! I want to purchase the ${title} (${id}).\n\nName: ${name}\nEmail: ${email}\nOrder ID: ${data.order_id}\nPrice: ${price}\n\nI am ready to pay. Please send payment details.`);
                window.open(`https://wa.me/27677834591?text=${msg}`, '_blank');
            } else {
                alert('Error: ' + (data.error || 'Could not create order'));
            }
        })
        .catch(() => alert('Server unavailable. Please contact us on WhatsApp.'));
    } else {
        alert('Please go online to purchase templates, or contact us on WhatsApp.');
    }
}

// ===== Cart =====
let cart = [];
const COUPONS = { STUDENT10: 10, VIP5: 5, REFER10: 10 };
let appliedCoupon = null;

function saveCart() {
    try { localStorage.setItem('vit_cart', JSON.stringify(cart)); } catch {}
}

function loadCart() {
    try {
        const saved = localStorage.getItem('vit_cart');
        if (saved) { cart = JSON.parse(saved); updateCartUI(); }
    } catch {}
}

function addToCart(idx) {
    const s = services[idx];
    const existing = cart.find(c => c.index === idx);
    if (existing) { existing.qty++; }
    else { cart.push({ index: idx, qty: 1 }); }
    saveCart();
    updateCartUI();
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
}

function removeFromCart(idx) {
    cart = cart.filter(c => c.index !== idx);
    saveCart();
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    const badge = document.getElementById('cartBadge');
    const totalEl = document.getElementById('cartTotal');
    const total = cart.reduce((sum, c) => sum + parsePrice(services[c.index].price) * c.qty, 0);
    const discount = appliedCoupon ? Math.round(total * (COUPONS[appliedCoupon] / 100)) : 0;
    const final = total - discount;
    badge.textContent = cart.reduce((s, c) => s + c.qty, 0);
    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty"><i class="fas fa-box-open"></i><p>Your cart is empty</p></div>';
        totalEl.textContent = 'R0';
        return;
    }
    container.innerHTML = cart.map(c => {
        const s = services[c.index];
        const itemTotal = parsePrice(s.price) * c.qty;
        return `<div class="cart-item">
            <div class="cart-item-info">
                <i class="${s.icon}"></i>
                <div><strong>${s.title}</strong><small>${s.price} x${c.qty}</small></div>
            </div>
            <div class="cart-item-total">R${itemTotal}</div>
            <button class="cart-item-remove" data-index="${c.index}"><i class="fas fa-trash"></i></button>
        </div>`;
    }).join('');
    container.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.index)));
    });
    if (discount > 0) {
        totalEl.innerHTML = `R${total} <span style="color:var(--accent-1);font-size:0.8rem;">(-R${discount})</span> = <strong>R${final}</strong>`;
    } else {
        totalEl.textContent = `R${total}`;
    }
}

function parsePrice(priceStr) {
    const nums = priceStr.match(/\d+/g);
    return nums ? parseInt(nums[nums.length - 1]) : 0;
}

function initCart() {
    document.getElementById('cartBtn').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.toggle('open');
        document.getElementById('cartOverlay').classList.toggle('open');
    });
    document.getElementById('cartClose').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('cartOverlay').classList.remove('open');
    });
    document.getElementById('cartOverlay').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('cartOverlay').classList.remove('open');
    });
    document.getElementById('applyCoupon').addEventListener('click', () => {
        const code = document.getElementById('couponInput').value.trim().toUpperCase();
        const msg = document.getElementById('couponMsg');
        if (COUPONS[code]) {
            appliedCoupon = code;
            msg.innerHTML = `<span style="color:var(--accent-1)">Coupon applied! ${COUPONS[code]}% off</span>`;
            updateCartUI();
        } else {
            msg.innerHTML = `<span style="color:#ff6b35">Invalid coupon code</span>`;
        }
    });
    document.getElementById('cartCheckout').addEventListener('click', () => {
        if (cart.length === 0) { alert('Your cart is empty.'); return; }
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('cartOverlay').classList.remove('open');
        document.getElementById('contract').scrollIntoView({ behavior: 'smooth' });
        const msg = cart.map(c => `- ${services[c.index].title} x${c.qty}`).join('\n');
        const total = cart.reduce((s, c) => s + parsePrice(services[c.index].price) * c.qty, 0);
        const discount = appliedCoupon ? Math.round(total * (COUPONS[appliedCoupon] / 100)) : 0;
        const final = total - discount;
        document.getElementById('additionalInfo').value =
            `Cart Order:\n${msg}\nTotal: R${total}${discount ? ` (Coupon: -R${discount})` : ''}\nFinal: R${final}`;
    });
}

// ===== FAQ =====
const faqs = [
    { q: 'How do I pay?', a: 'Payments are accepted via EFT, SnapScan, or bank transfer. A 50% deposit is required before remote services begin. Students get 10% off and returning clients get 5% off.' },
    { q: 'Do I need to be present during the service?', a: 'Yes, you need to be available during the appointment to provide remote access and any necessary information (product keys, etc.).' },
    { q: 'What if the service can\'t be completed?', a: 'If the service cannot be completed due to technical limitations on your device, you receive a full refund of your deposit.' },
    { q: 'How long does each service take?', a: 'Most software activations take 15-45 minutes. Repairs and installations take 1-3 hours. CVs and assignments take 1-5 days depending on complexity.' },
    { q: 'Do you guarantee data recovery?', a: 'Data recovery is performed with care but cannot be guaranteed. We always advise clients to maintain their own backups.' },
    { q: 'Is remote access safe?', a: 'Absolutely. We use encrypted connections via TeamViewer/AnyDesk and your data is never stored or shared. You can revoke access at any time.' },
    { q: 'What if I\'m not satisfied?', a: 'We strive for 100% satisfaction. If something isn\'t right, contact us within 48 hours and we\'ll make it right at no extra cost.' },
    { q: 'Can I get a discount for multiple services?', a: 'Yes! Bundle deals are available. Add multiple services to your cart and use coupon codes STUDENT10 or VIP5 for extra savings.' }
];

function renderFAQ() {
    const list = document.getElementById('faqList');
    list.innerHTML = faqs.map((f, i) => `
        <div class="faq-item">
            <button class="faq-question" data-index="${i}">
                <span>${f.q}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="faq-answer">
                <p>${f.a}</p>
            </div>
        </div>
    `).join('');
    list.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });
}

// ===== Signature Pad =====
function initSignaturePad() {
    const sigCanvas = document.getElementById('signaturePad');
    if (!sigCanvas) return;
    const ctx = sigCanvas.getContext('2d');
    let drawing = false, lastX = 0, lastY = 0;
    function resizeCanvas() {
        const rect = sigCanvas.parentElement.getBoundingClientRect();
        sigCanvas.width = Math.min(rect.width - 4, 600);
        sigCanvas.height = 150;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    }
    function getPos(e) {
        const rect = sigCanvas.getBoundingClientRect();
        const cX = e.touches ? e.touches[0].clientX : e.clientX;
        const cY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cX - rect.left) * (sigCanvas.width / rect.width), y: (cY - rect.top) * (sigCanvas.height / rect.height) };
    }
    function start(e) { e.preventDefault(); drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; }
    function draw(e) { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y; }
    function stop(e) { e.preventDefault(); drawing = false; }
    sigCanvas.addEventListener('mousedown', start); sigCanvas.addEventListener('mousemove', draw);
    sigCanvas.addEventListener('mouseup', stop); sigCanvas.addEventListener('mouseleave', stop);
    sigCanvas.addEventListener('touchstart', start, { passive: false }); sigCanvas.addEventListener('touchmove', draw, { passive: false });
    sigCanvas.addEventListener('touchend', stop, { passive: false });
    document.getElementById('clearSignature').addEventListener('click', () => {
        ctx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
        document.getElementById('signatureData').value = '';
    });
    resizeCanvas(); window.addEventListener('resize', resizeCanvas);
}

// ===== PDF Generation =====
function generateContractPDF(isClientCopy) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const name = document.getElementById('clientName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const service = document.getElementById('serviceType').options[document.getElementById('serviceType').selectedIndex].text;
    const address = document.getElementById('clientAddress').value.trim();
    const additional = document.getElementById('additionalInfo').value.trim();
    const date = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    const primary = [0, 212, 255], secondary = [123, 47, 247], dark = [10, 10, 26];
    doc.setFillColor(...dark); doc.rect(0, 0, 210, 60, 'F');
    doc.setFillColor(...primary); doc.rect(0, 58, 210, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.setFont('helvetica', 'bold');
    doc.text('SERVICE AGREEMENT', 105, 30, { align: 'center' });
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Vincent IT Freelancer', 105, 45, { align: 'center' });
    doc.text('Professional IT Services', 105, 53, { align: 'center' });
    let yPos = 75;
    doc.setTextColor(30, 30, 50); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Agreement Details', 15, yPos); yPos += 10;
    doc.setDrawColor(...primary); doc.setLineWidth(0.5); doc.line(15, yPos, 195, yPos); yPos += 8;
    doc.setFontSize(10);
    const fields = [
        ['Date:', date], ['Client Name:', name], ['Email:', email],
        ['Phone:', phone], ['Service:', service]
    ];
    if (address) fields.push(['Address:', address]);
    fields.forEach(([l, v]) => {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 70); doc.text(l, 15, yPos);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 50); doc.text(v, 55, yPos);
        yPos += 7;
    });
    if (additional) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 50, 70); doc.text('Notes:', 15, yPos);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 50); doc.text(additional, 55, yPos);
        yPos += 10;
    } else yPos += 3;
    doc.setDrawColor(...primary); doc.line(15, yPos, 195, yPos); yPos += 8;
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 50);
    doc.text('Terms & Conditions Summary', 15, yPos); yPos += 10;
    const terms = [
        '1. Service scope: remote installation/activation of MS Office & Windows, BSOD repair, data recovery, hardware upgrades, CV creation, and academic assistance.',
        '2. Payment: 50% deposit required before service. Balance due upon completion.',
        '3. Remote access granted via TeamViewer/AnyDesk. Client must backup data beforehand.',
        '4. Vincent IT Freelancer not liable for pre-existing data loss.',
        '5. Services typically completed within 1-24 hours.',
        '6. Full refund of deposit if service cannot be completed due to client device limitations.',
        '7. All client information kept strictly confidential.',
        '8. Students receive 10% discount. Existing clients receive 5% discount.',
        '9. Governed by the laws of South Africa. Disputes resolved via arbitration in Mahikeng.'
    ];
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 100);
    terms.forEach(term => {
        doc.splitTextToSize(term, 175).forEach(line => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.text(line, 15, yPos); yPos += 5;
        });
    });
    yPos += 8;
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setDrawColor(...primary); doc.setLineWidth(0.5); doc.line(15, yPos, 195, yPos); yPos += 8;
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 50);
    doc.text('Signatures', 15, yPos); yPos += 12;
    const sigData = document.getElementById('signatureData').value;
    if (sigData) {
        doc.addImage(sigData, 'PNG', 20, yPos, 80, 30);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text('Client Signature', 20, yPos + 35); yPos += 45;
    }
    yPos += 5;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 50);
    doc.text('Vincent IT Freelancer (Provider)', 15, yPos); yPos += 8;
    doc.setTextColor(...secondary); doc.setFont('helvetica', 'italic');
    doc.text('V. IT Freelancer', 25, yPos + 15, { fontSize: 14 });
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text('Vincent IT Freelancer (Digital Signature)', 25, yPos + 23); yPos += 35;
    doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('This agreement was generated and signed digitally on ' + date, 15, yPos); yPos += 5;
    doc.text('Contract ID: VIT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase(), 15, yPos);
    doc.setFillColor(...dark); doc.rect(0, 283, 210, 14, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text('Vincent IT Freelancer', 105, 291, { align: 'center' });
    doc.text('© ' + new Date().getFullYear() + ' All rights reserved', 105, 297, { align: 'center' });
    return doc;
}

function generateInvoice() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const name = document.getElementById('clientName').value.trim();
    const date = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    const invId = 'INV-' + Date.now().toString(36).toUpperCase();
    const primary = [0, 212, 255], dark = [10, 10, 26];
    doc.setFillColor(...dark); doc.rect(0, 0, 210, 50, 'F');
    doc.setFillColor(...primary); doc.rect(0, 48, 210, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 105, 25, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Vincent IT Freelancer', 105, 38, { align: 'center' });
    let yPos = 65;
    doc.setTextColor(30, 30, 50); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 15, yPos); yPos += 7;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 80);
    doc.text(name, 15, yPos); yPos += 6;
    doc.text('Date: ' + date, 15, yPos); yPos += 6;
    doc.text('Invoice: ' + invId, 15, yPos); yPos += 10;
    doc.setDrawColor(...primary); doc.setLineWidth(0.5); doc.line(15, yPos, 195, yPos); yPos += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Service', 15, yPos); doc.text('Qty', 130, yPos); doc.text('Amount', 160, yPos);
    yPos += 6; doc.setDrawColor(200, 200, 220); doc.line(15, yPos, 195, yPos); yPos += 5;
    doc.setFont('helvetica', 'normal');
    const items = cart.length > 0 ? cart : [{ index: document.getElementById('serviceType').selectedIndex - 1, qty: 1 }];
    items.forEach(item => {
        if (item.index < 0 || item.index >= services.length) return;
        const s = services[item.index];
        doc.text(s.title, 15, yPos);
        doc.text('x' + item.qty, 130, yPos);
        doc.text('R' + parsePrice(s.price) * item.qty, 160, yPos);
        yPos += 7;
    });
    yPos += 3; doc.setDrawColor(...primary); doc.line(15, yPos, 195, yPos); yPos += 8;
    const total = items.reduce((s, item) => s + parsePrice(services[item.index]?.price || '0') * item.qty, 0);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Total:', 130, yPos); doc.text('R' + total, 160, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text('Payment due upon completion. 50% deposit required for remote services.', 15, yPos);
    yPos += 5;
    doc.text('Thank you for your business!', 15, yPos);
    doc.setFillColor(...dark); doc.rect(0, 283, 210, 14, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8);
    doc.text('Vincent IT Freelancer', 105, 291, { align: 'center' });
    doc.text('© ' + new Date().getFullYear(), 105, 297, { align: 'center' });
    return doc;
}

// ===== Contract Form =====
function initContractForm() {
    const form = document.getElementById('contractForm');
    const resultDiv = document.getElementById('contractResult');
    const contractContainer = document.getElementById('contractContainer');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sigCanvas = document.getElementById('signaturePad');
        const ctx = sigCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, sigCanvas.width, sigCanvas.height);
        const pixels = imageData.data;
        let hasDrawing = false;
        for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] !== 0) { hasDrawing = true; break; } }
        if (!hasDrawing) { alert('Please provide your digital signature.'); return; }
        document.getElementById('signatureData').value = sigCanvas.toDataURL('image/png');
        const selectedService = document.getElementById('serviceType').value;
        if (selectedService === 'remote-installation') {
            if (!confirm('Remote Installation requires a 50% deposit.\n\nAfter signing you will be redirected to WhatsApp.\n\nClick OK to proceed.')) return;
        }
        const submitBtn = document.getElementById('submitContract');
        submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        try {
            await new Promise(r => setTimeout(r, 800));
            contractContainer.style.display = 'none';
            resultDiv.style.display = 'block';
            window.__contractData = { clientName: document.getElementById('clientName').value.trim(), isRemote: selectedService === 'remote-installation' };
        } catch (err) { alert('Error generating contract.'); console.error(err); }
        finally { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Sign & Generate Contract'; }
    });
    document.getElementById('downloadClientPDF').addEventListener('click', () => {
        const doc = generateContractPDF(true);
        doc.save(`Service_Contract_${document.getElementById('clientName').value.trim().replace(/\s+/g, '_')}_Client.pdf`);
    });
    document.getElementById('downloadVendorPDF').addEventListener('click', () => {
        const doc = generateContractPDF(false);
        doc.save(`Service_Contract_${document.getElementById('clientName').value.trim().replace(/\s+/g, '_')}_Vendor.pdf`);
    });
    document.getElementById('downloadInvoice').addEventListener('click', () => {
        const doc = generateInvoice();
        doc.save(`Invoice_${document.getElementById('clientName').value.trim().replace(/\s+/g, '_')}.pdf`);
    });
    document.getElementById('proceedWhatsApp').addEventListener('click', function(e) {
        const isRemote = window.__contractData?.isRemote;
        let msg;
        if (isRemote) {
            msg = encodeURIComponent(`Hello Vincent IT Freelancer! I have signed the contract for REMOTE INSTALLATION.\n\nName: ${window.__contractData?.clientName || 'Client'}\n\nI am ready to pay the 50% deposit. Please send payment details.`);
        } else {
            msg = encodeURIComponent(`Hello Vincent IT Freelancer! I have signed the contract.\n\nName: ${window.__contractData?.clientName || 'Client'}\n\nPlease proceed with my service.`);
        }
        window.open(`https://wa.me/27677834591?text=${msg}`, '_blank');
    });
    document.getElementById('resetContract').addEventListener('click', () => {
        contractContainer.style.display = 'block'; resultDiv.style.display = 'none';
        form.reset();
        const pad = document.getElementById('signaturePad');
        pad.getContext('2d').clearRect(0, 0, pad.width, pad.height);
        document.getElementById('signatureData').value = ''; window.__contractData = null;
        document.getElementById('contract').scrollIntoView({ behavior: 'smooth' });
    });
}

// ===== Theme Toggle =====
function initTheme() {
    const btn = document.getElementById('themeToggle');
    const icon = btn.querySelector('i');
    const isLight = localStorage.getItem('vit_theme') === 'light';
    if (isLight) { document.body.classList.add('light-theme'); icon.className = 'fas fa-sun'; }
    btn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLightNow = document.body.classList.contains('light-theme');
        icon.className = isLightNow ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('vit_theme', isLightNow ? 'light' : 'dark');
    });
}

// ===== Skeleton Loader =====
function initSkeleton() {
    setTimeout(() => {
        const skel = document.getElementById('skeletonLoader');
        if (skel) skel.style.display = 'none';
    }, 1200);
}

// ===== Navigation =====
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 50));
}

function initMobileNav() {
    const toggle = document.getElementById('navToggle'), menu = document.getElementById('navMenu');
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active'); menu.classList.toggle('active');
        document.body.classList.toggle('nav-open');
    });
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => {
        toggle.classList.remove('active'); menu.classList.remove('active');
        document.body.classList.remove('nav-open');
    }));
}

function initScrollTop() {
    const btn = document.getElementById('scrollTop');
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400));
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initCounters() {
    document.querySelectorAll('.hero-stat-num').forEach(c => {
        const target = parseInt(c.dataset.count);
        let current = 0;
        const increment = Math.ceil(target / 60);
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) { c.textContent = target; clearInterval(timer); }
            else c.textContent = current;
        }, 25);
    });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initSkeleton();
    renderServices();
    renderComparison();
    renderPricing();
    renderTemplates();
    renderFAQ();
    loadCart();
    initCart();
    initSignaturePad();
    initContractForm();
    initTheme();
    initNavbar();
    initMobileNav();
    initScrollTop();
    initCounters();
});
