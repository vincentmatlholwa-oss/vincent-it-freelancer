function initLazyLoad() {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('lazy-loaded');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '50px' });

        document.querySelectorAll('.lazy-section').forEach(section => observer.observe(section));
        document.querySelectorAll('.lazy-image').forEach(img => {
            if (img.dataset.src) {
                observer.observe(img);
                img.addEventListener('load', () => img.classList.add('lazy-loaded'));
            }
        });
    } else {
        document.querySelectorAll('.lazy-section, .lazy-image').forEach(el => el.classList.add('lazy-loaded'));
    }

    document.querySelectorAll('.lazy-section').forEach(section => {
        if (section.classList.contains('lazy-loaded')) return;
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        const origDisplay = section.style.display;
        if (origDisplay === 'none') section.style.display = '';
        const checkLoaded = () => {
            if (section.classList.contains('lazy-loaded')) {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }
        };
        const obs = new MutationObserver(checkLoaded);
        obs.observe(section, { attributes: true, attributeFilter: ['class'] });
        checkLoaded();
    });

    requestAnimationFrame(() => {
        document.querySelectorAll('.lazy-section').forEach(s => {
            if (s.classList.contains('lazy-loaded')) {
                s.style.opacity = '1';
                s.style.transform = 'translateY(0)';
            }
        });
    });
}
