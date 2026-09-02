/* Hiro Documentation engine — builds chrome around each page's <main class="article">. */
(function () {
    const NAV = [
        {
            group: 'Get Started',
            items: [
                { key: 'introduction', title: 'Introduction', href: 'introduction.html' },
                { key: 'requirements', title: 'Requirements', href: 'requirements.html' },
                { key: 'installation', title: 'Installation', href: 'installation.html' },
                { key: 'configuration', title: 'Configuration', href: 'configuration.html' },
                { key: 'quickstart', title: 'Quick Start', href: 'quickstart.html' },
            ],
        },
        {
            group: 'Core Concepts',
            items: [
                { key: 'architecture', title: 'Architecture', href: 'architecture.html' },
                { key: 'roles-and-tenancy', title: 'Roles & Multi-Tenancy', href: 'roles-and-tenancy.html' },
            ],
        },
        {
            group: 'AI Voice Agent',
            items: [
                { key: 'ai-overview', title: 'Overview', href: 'ai-overview.html' },
                { key: 'vapi-setup', title: 'Vapi Setup', href: 'vapi-setup.html' },
                { key: 'ai-tools', title: 'AI Tools Reference', href: 'ai-tools.html' },
                { key: 'workflows', title: 'Workflow Builder', href: 'workflows.html' },
            ],
        },
        {
            group: 'Features',
            items: [
                { key: 'clinic-panel', title: 'Clinic Panel', href: 'clinic-panel.html' },
                { key: 'insurance', title: 'Insurance', href: 'insurance.html' },
                { key: 'platform-admin', title: 'Platform Admin', href: 'platform-admin.html' },
                { key: 'billing', title: 'Billing & Plans', href: 'billing.html' },
            ],
        },
        {
            group: 'Operations',
            items: [
                { key: 'deployment', title: 'Deployment', href: 'deployment.html' },
                { key: 'demo-setup', title: 'Live Demo Setup', href: 'demo-setup.html' },
                { key: 'webhooks', title: 'Webhooks', href: 'webhooks.html' },
                { key: 'white-label', title: 'White-Label & Branding', href: 'white-label.html' },
                { key: 'troubleshooting', title: 'Troubleshooting', href: 'troubleshooting.html' },
                { key: 'faq', title: 'FAQ', href: 'faq.html' },
                { key: 'changelog', title: 'Changelog', href: 'changelog.html' },
            ],
        },
    ];

    const flat = NAV.flatMap((g) => g.items);
    const main = document.querySelector('main.article');
    const current = main ? main.getAttribute('data-page') : '';

    function el(tag, attrs, html) {
        const e = document.createElement(tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        if (html != null) e.innerHTML = html;
        return e;
    }

    // ---- Topbar ----
    const topbar = el('header', { class: 'topbar' });
    topbar.innerHTML = `
        <button class="iconbtn menu-toggle" aria-label="Menu">☰</button>
        <a class="brand" href="introduction.html">
            <span class="logo">H</span> Hiro <small>Docs</small>
        </a>
        <div class="spacer"></div>
        <div class="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="search" id="docsearch" placeholder="Search docs…" autocomplete="off">
        </div>
        <button class="iconbtn" id="theme-toggle" aria-label="Toggle theme">◐</button>`;
    document.body.prepend(topbar);

    // ---- Layout shell ----
    const layout = el('div', { class: 'layout' });
    const sidebar = el('nav', { class: 'sidebar', id: 'sidebar' });
    const content = el('div', { class: 'content' });
    const toc = el('aside', { class: 'toc', id: 'toc' });
    const backdrop = el('div', { class: 'backdrop', id: 'backdrop' });

    main.parentNode.removeChild(main);
    content.appendChild(main);
    layout.appendChild(sidebar);
    layout.appendChild(content);
    layout.appendChild(toc);
    document.body.appendChild(layout);
    document.body.appendChild(backdrop);

    // ---- Sidebar ----
    NAV.forEach((g) => {
        const grp = el('div', { class: 'group' });
        grp.appendChild(el('div', { class: 'group-title' }, g.group));
        g.items.forEach((it) => {
            const a = el('a', { href: it.href }, it.title);
            if (it.key === current) a.classList.add('active');
            a.dataset.search = it.title.toLowerCase();
            grp.appendChild(a);
        });
        sidebar.appendChild(grp);
    });

    // ---- TOC from headings ----
    const heads = main.querySelectorAll('h2, h3');
    if (heads.length) {
        toc.appendChild(el('div', { class: 'toc-title' }, 'On this page'));
        heads.forEach((h) => {
            if (!h.id) h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const a = el('a', { href: '#' + h.id }, h.textContent);
            if (h.tagName === 'H3') a.classList.add('h3');
            a.dataset.target = h.id;
            toc.appendChild(a);
        });
    }

    // ---- Prev / Next ----
    const idx = flat.findIndex((p) => p.key === current);
    if (idx !== -1) {
        const nav = el('div', { class: 'page-nav' });
        if (idx > 0) {
            const p = flat[idx - 1];
            nav.appendChild(el('a', { href: p.href }, `<div class="dir">← Previous</div><div class="ttl">${p.title}</div>`));
        } else { nav.appendChild(el('span')); }
        if (idx < flat.length - 1) {
            const n = flat[idx + 1];
            nav.appendChild(el('a', { href: n.href, class: 'next' }, `<div class="dir">Next →</div><div class="ttl">${n.title}</div>`));
        }
        main.appendChild(nav);
    }

    // ---- Copy buttons ----
    main.querySelectorAll('pre').forEach((pre) => {
        const btn = el('button', { class: 'copy-btn' }, 'Copy');
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(pre.innerText.replace(/Copy$/, '').trim());
            btn.textContent = 'Copied!';
            setTimeout(() => (btn.textContent = 'Copy'), 1500);
        });
        pre.appendChild(btn);
    });

    // ---- Theme ----
    const root = document.documentElement;
    const saved = localStorage.getItem('hiro-docs-theme');
    if (saved) root.setAttribute('data-theme', saved);
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('hiro-docs-theme', next);
    });

    // ---- Mobile menu ----
    const mt = document.querySelector('.menu-toggle');
    mt.addEventListener('click', () => { sidebar.classList.toggle('open'); backdrop.classList.toggle('open'); });
    backdrop.addEventListener('click', () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); });

    // ---- Search (filter sidebar) ----
    const search = document.getElementById('docsearch');
    search.addEventListener('input', () => {
        const q = search.value.toLowerCase().trim();
        sidebar.querySelectorAll('.group').forEach((grp) => {
            let any = false;
            grp.querySelectorAll('a').forEach((a) => {
                const hit = !q || a.dataset.search.includes(q);
                a.style.display = hit ? '' : 'none';
                if (hit) any = true;
            });
            grp.style.display = any ? '' : 'none';
        });
    });

    // ---- Scrollspy ----
    if (heads.length && 'IntersectionObserver' in window) {
        const links = Array.from(toc.querySelectorAll('a'));
        const byId = (id) => links.find((l) => l.dataset.target === id);
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (en.isIntersecting) {
                    links.forEach((l) => l.classList.remove('active'));
                    const a = byId(en.target.id);
                    if (a) a.classList.add('active');
                }
            });
        }, { rootMargin: '-80px 0px -70% 0px' });
        heads.forEach((h) => obs.observe(h));
    }
})();
