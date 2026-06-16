document.addEventListener('DOMContentLoaded', () => {

  /* ---- Typing Effect ---- */
  const typedEl = document.getElementById('typed-text');
  const phrases = ['[YourName]', 'a Developer', 'a Designer', 'a Creator'];
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 100;

  function typeLoop() {
    const current = phrases[phraseIndex];
    if (isDeleting) {
      typedEl.textContent = current.substring(0, charIndex--);
      typeSpeed = 50;
    } else {
      typedEl.textContent = current.substring(0, charIndex++);
      typeSpeed = 100;
    }

    if (!isDeleting && charIndex === current.length) {
      isDeleting = true;
      typeSpeed = 1500;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typeSpeed = 300;
    }

    setTimeout(typeLoop, typeSpeed);
  }
  typeLoop();

  /* ---- Theme Toggle ---- */
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const html = document.documentElement;
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    html.classList.add('dark');
    themeIcon.className = 'fas fa-sun';
  }
  themeToggle.addEventListener('click', () => {
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  /* ---- Mobile Menu ---- */
  const mobileMenu = document.getElementById('mobileMenu');
  const menuToggle = document.getElementById('menuToggle');
  const closeMenu = document.getElementById('closeMenu');
  menuToggle.addEventListener('click', () => mobileMenu.classList.add('open'));
  closeMenu.addEventListener('click', () => mobileMenu.classList.remove('open'));
  mobileMenu.addEventListener('click', e => { if (e.target === mobileMenu) mobileMenu.classList.remove('open'); });
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---- Projects Data ---- */
  const projects = [
    { title: 'Project Alpha', desc: 'A modern web app built with React and Node.js.', tags: ['React', 'Node.js', 'Tailwind'], category: 'web', icon: 'fa-globe' },
    { title: 'Brandify', desc: 'Brand identity and design system for a SaaS startup.', tags: ['Figma', 'Design System', 'UI/UX'], category: 'design', icon: 'fa-paint-brush' },
    { title: 'ShopFlow', desc: 'Full-stack e-commerce platform with payments.', tags: ['Next.js', 'Stripe', 'PostgreSQL'], category: 'web', icon: 'fa-shopping-cart' },
    { title: 'WeatherVue', desc: 'Real-time weather dashboard with charts.', tags: ['Vue', 'Chart.js', 'API'], category: 'web', icon: 'fa-cloud-sun' },
    { title: 'AppZen', desc: 'Mobile-first productivity app concept.', tags: ['React Native', 'Firebase'], category: 'mobile', icon: 'fa-mobile-alt' },
    { title: 'PixelPerfect', desc: 'Photo editing and filter web app.', tags: ['Canvas', 'WebGL', 'JavaScript'], category: 'design', icon: 'fa-camera' }
  ];

  const projectsGrid = document.getElementById('projectsGrid');
  const filterContainer = document.getElementById('filterButtons');
  const categories = [...new Set(projects.map(p => p.category))];
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    filterContainer.appendChild(btn);
  });

  function renderProjects(filter = 'all') {
    const filtered = filter === 'all' ? projects : projects.filter(p => p.category === filter);
    projectsGrid.innerHTML = filtered.map(p => `
      <div class="project-card animate-fade-in-up">
        <div class="project-card-img"><i class="fas ${p.icon}"></i></div>
        <div class="project-card-body">
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
          <div class="project-tags">${p.tags.map(t => `<span>${t}</span>`).join('')}</div>
        </div>
      </div>
    `).join('');
  }

  filterContainer.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProjects(btn.dataset.filter);
  });

  renderProjects();

  /* ---- Skills Data ---- */
  const skills = [
    { name: 'HTML5', icon: 'fab fa-html5' },
    { name: 'CSS3', icon: 'fab fa-css3-alt' },
    { name: 'JavaScript', icon: 'fab fa-js' },
    { name: 'React', icon: 'fab fa-react' },
    { name: 'Vue.js', icon: 'fab fa-vuejs' },
    { name: 'Node.js', icon: 'fab fa-node-js' },
    { name: 'Figma', icon: 'fab fa-figma' },
    { name: 'Git', icon: 'fab fa-git-alt' }
  ];

  const skillsGrid = document.getElementById('skillsGrid');
  skillsGrid.innerHTML = skills.map(s => `
    <div class="skill-badge">
      <i class="${s.icon}"></i>
      <span>${s.name}</span>
    </div>
  `).join('');

  /* ---- Testimonials Data ---- */
  const testimonials = [
    { name: 'Sarah Johnson', role: 'Product Manager, TechCo', text: 'An absolute pleasure to work with. The designs were pixel-perfect and the code was clean and maintainable.', avatar: 'S' },
    { name: 'Mike Chen', role: 'Founder, StartupX', text: 'Delivered ahead of schedule and exceeded our expectations. Highly recommend for any web project.', avatar: 'M' },
    { name: 'Emma Wilson', role: 'Design Lead, Agency', text: 'Great collaborator who truly understands both design and development. A rare combination.', avatar: 'E' },
    { name: 'Alex Rivera', role: 'CTO, DevShop', text: 'Professional, skilled, and reliable. The portfolio site he built for us is stunning.', avatar: 'A' }
  ];

  const testimonialsGrid = document.getElementById('testimonialsGrid');
  testimonialsGrid.innerHTML = testimonials.map(t => `
    <div class="testimonial-card animate-fade-in-up">
      <div class="stars">${'<i class="fas fa-star"></i>'.repeat(5)}</div>
      <blockquote>"${t.text}"</blockquote>
      <div class="author">
        <div class="author-avatar">${t.avatar}</div>
        <div class="author-info">
          <strong>${t.name}</strong>
          <span>${t.role}</span>
        </div>
      </div>
    </div>
  `).join('');

  /* ---- Contact Form ---- */
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');

  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin ml-2"></i>';

    const data = new FormData(contactForm);

    // Replace YOUR_FORM_ID below with your Formspree form ID
    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        formStatus.textContent = 'Message sent successfully! I\'ll get back to you soon.';
        formStatus.className = 'text-sm text-center text-green-600 dark:text-green-400';
        contactForm.reset();
      } else {
        throw new Error('Form submission failed');
      }
    } catch {
      formStatus.textContent = 'Oops! Something went wrong. Please try again.';
      formStatus.className = 'text-sm text-center text-red-600 dark:text-red-400';
    }

    formStatus.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = 'Send Message <i class="fas fa-paper-plane ml-2"></i>';
  });

  /* ---- Footer Year ---- */
  document.getElementById('year').textContent = new Date().getFullYear();
});
