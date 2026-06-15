function initSearchFilter() {
    const section = document.getElementById('services');
    if (!section) return;
    const searchBar = document.createElement('div');
    searchBar.className = 'service-search';
    searchBar.innerHTML = `
        <div class="search-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="serviceSearch" data-i18n-placeholder="search.placeholder" placeholder="Search services...">
            <button id="searchClear" class="search-clear" style="display:none"><i class="fas fa-times"></i></button>
        </div>
        <div class="search-tags" id="searchTags"></div>
    `;
    const header = section.querySelector('.section-header');
    if (header) header.after(searchBar);
    else section.prepend(searchBar);

    const input = document.getElementById('serviceSearch');
    const clearBtn = document.getElementById('searchClear');
    const tagsContainer = document.getElementById('searchTags');

    const categories = ['Office', 'Windows', 'Repair', 'Hardware', 'CV', 'Academic', 'Website'];
    tagsContainer.innerHTML = '<button class="tag-btn active" data-tag="all">All</button>' +
        categories.map(c => `<button class="tag-btn" data-tag="${c.toLowerCase()}">${c}</button>`).join('');

    function filterServices() {
        const query = input.value.toLowerCase().trim();
        const activeTag = tagsContainer.querySelector('.tag-btn.active')?.dataset.tag || 'all';
        const cards = document.querySelectorAll('.service-card');
        cards.forEach(card => {
            const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
            const matchesQuery = !query || title.includes(query) || desc.includes(query);
            const matchesTag = activeTag === 'all' || title.includes(activeTag) || desc.includes(activeTag);
            card.style.display = matchesQuery && matchesTag ? '' : 'none';
        });
        clearBtn.style.display = query ? 'inline-flex' : 'none';
        const visible = document.querySelectorAll('.service-card[style*="display: none"]');
        const noResultsMsg = searchBar.querySelector('.no-results');
        if (!noResultsMsg) {
            const msg = document.createElement('p');
            msg.className = 'no-results';
            msg.textContent = 'No services found';
            searchBar.appendChild(msg);
        }
        const msg = searchBar.querySelector('.no-results');
        if (visible.length === cards.length) { msg.style.display = 'block'; } else { msg.style.display = 'none'; }
    }

    input.addEventListener('input', filterServices);
    clearBtn.addEventListener('click', () => { input.value = ''; filterServices(); input.focus(); });
    tagsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.tag-btn');
        if (!btn) return;
        tagsContainer.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterServices();
    });

    const pricingCards = document.querySelectorAll('.pricing-card');
    if (input) {
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            pricingCards.forEach((card, i) => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(q) || !q ? '' : 'none';
            });
        });
    }
}
