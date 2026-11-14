'use strict';
(() => {
  const RAW_ICON = 'https://raw.githubusercontent.com/aaANDkk/Qure_Style_SVG/main/icon/svg/common/';

  /**
   * 站点入口配置表：后续新增子项目网站时，只需在此数组追加一项即可自动生成卡片与底部路由。
   * New sub-sites can be added here by appending an object to this list.
   */
  const PROJECTS = [
    {
      id: 'qure',
      featured: true,
      href: './qure/',
      route: '/qure',
      icon: `${RAW_ICON}Qure.svg`,
      status: { zh: '已上线', en: 'Live' },
      title: { zh: 'Qure 图标展示馆', en: 'Qure Icon Gallery' },
      desc: {
        zh: 'Qure 风格 SVG 矢量图标官网。支持名称检索、细节放大预览、直链复制与 Clash 策略组搭配实验室。',
        en: 'Official showcase for Qure-style SVG icons. Search, inspect details, copy direct links, and preview Clash policy groups.'
      },
      tags: {
        zh: ['SVG 图标库', 'Clash 试搭', '在线同步'],
        en: ['SVG Library', 'Clash Studio', 'Live Sync']
      },
      cta: { zh: '进入官网', en: 'Open Site' },
      repoUrl: 'https://github.com/aaANDkk/Qure_Style_SVG',
      repoLabel: { zh: '图标仓库', en: 'Icon Repo' },
      previewIcons: [
        { name: 'Claude', src: `${RAW_ICON}Claude.svg` },
        { name: 'ChatGPT', src: `${RAW_ICON}ChatGPT.svg` },
        { name: 'Telegram', src: `${RAW_ICON}Telegram.svg` },
        { name: 'GitHub', src: `${RAW_ICON}GitHub.svg` }
      ]
    },
    {
      id: 'upcoming',
      upcoming: true,
      href: 'https://github.com/aaANDkk',
      external: true,
      route: '/next-project',
      status: { zh: '预留入口', en: 'Slot Ready' },
      title: { zh: '更多项目即将上线', en: 'More Projects Coming' },
      desc: {
        zh: '后续新项目将各自存放在独立子目录中，彼此样式与脚本完全隔离，互不干扰维护。',
        en: 'Future web tools and experiments will live in isolated sub-folders here for clean, independent maintenance.'
      },
      tags: {
        zh: ['独立目录', '持续更新'],
        en: ['Modular Paths', 'In Progress']
      },
      cta: { zh: '前往 GitHub 主页', en: 'Visit GitHub' }
    }
  ];

  const UI_TEXT = {
    zh: {
      pageTitle: 'aaANDkk · 站点入口',
      brandSub: 'PROJECT PORTAL',
      pillTag: '目录索引',
      heroTitleStart: '选择你要前往的',
      heroTitleAccent: '独立站点。',
      heroDesc: '每个项目都在独立的子路径下运行与维护。挑选一张卡片，即刻进入。',
      footText: '基于独立子目录结构部署，方便按项目持续迭代。',
      langButton: 'EN',
      langAria: 'Switch to English'
    },
    en: {
      pageTitle: 'aaANDkk · Project Portal',
      brandSub: 'PROJECT PORTAL',
      pillTag: 'INDEX',
      heroTitleStart: 'Choose a destination ',
      heroTitleAccent: 'to explore.',
      heroDesc: 'Each website lives in its own sub-path for clean separation and effortless maintenance.',
      footText: 'Organized by sub-directories for independent project maintenance.',
      langButton: '中',
      langAria: '切换到中文'
    }
  };

  let lang = readStore('hub-lang') || (navigator.language?.startsWith('zh') ? 'zh' : 'en');
  if (lang !== 'zh' && lang !== 'en') lang = 'zh';

  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  let theme = readStore('hub-theme') || (systemDark ? 'dark' : 'light');

  const grid = document.getElementById('project-grid');
  const footRoutes = document.getElementById('foot-routes');
  const themeBtn = document.getElementById('theme-toggle');
  const langBtn = document.getElementById('lang-toggle');
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finePointer = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  function readStore(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Ignore storage access errors in private mode. */
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function applyTheme(next) {
    theme = next === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    themeBtn?.setAttribute('aria-pressed', String(theme === 'dark'));
    writeStore('hub-theme', theme);
  }

  function renderCards() {
    if (!grid) return;
    grid.replaceChildren();

    PROJECTS.forEach((project, idx) => {
      const card = el('article', 'bento-card');
      if (project.featured) card.classList.add('is-featured');
      if (project.upcoming) card.classList.add('is-upcoming');
      card.style.setProperty('--stagger', String(idx));

      // Header
      const head = el('div', 'card-head');
      const identity = el('div', 'card-identity');
      const iconWrap = el('div', 'card-icon-wrap');

      if (project.icon) {
        const img = el('img');
        img.src = project.icon;
        img.alt = project.title[lang];
        img.width = 30;
        img.height = 30;
        img.loading = 'eager';
        img.decoding = 'async';
        iconWrap.append(img);
      } else {
        iconWrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
      }

      const titleGroup = el('div', 'card-title-group');
      const h2 = el('h2', '', project.title[lang]);
      const routeChip = el('span', 'route-chip', project.route);
      titleGroup.append(h2, routeChip);
      identity.append(iconWrap, titleGroup);

      const status = el('span', 'status-badge');
      status.append(el('i'), el('span', '', project.status[lang]));
      head.append(identity, status);

      // Description
      const desc = el('p', 'card-desc', project.desc[lang]);

      // Body preview (mini icon dock OR upcoming slot shimmer)
      let previewNode;
      if (project.previewIcons?.length) {
        previewNode = el('div', 'mini-dock');
        project.previewIcons.forEach(item => {
          const tile = el('div', 'mini-tile');
          const img = el('img');
          img.src = item.src;
          img.alt = item.name;
          img.width = 26;
          img.height = 26;
          img.loading = 'lazy';
          img.decoding = 'async';
          tile.append(img, el('span', '', item.name));
          previewNode.append(tile);
        });
      } else {
        previewNode = el('div', 'slot-preview');
        previewNode.setAttribute('aria-hidden', 'true');
        previewNode.append(el('span', 'slot-line'), el('span', 'slot-line short'));
      }

      // Tags
      const tags = el('div', 'card-tags');
      (project.tags?.[lang] || []).forEach(tagText => {
        tags.append(el('span', 'tag-pill', tagText));
      });

      // Footer actions
      const foot = el('div', 'card-foot');
      const cta = el('a', 'card-cta');
      cta.href = project.href;
      if (project.external) {
        cta.target = '_blank';
        cta.rel = 'noopener noreferrer';
      }
      const ctaArrow = el('span', '', '↗');
      ctaArrow.setAttribute('aria-hidden', 'true');
      cta.append(el('span', '', project.cta[lang]), ctaArrow);
      foot.append(cta);

      if (project.repoUrl) {
        const repoLink = el('a', 'card-secondary');
        repoLink.href = project.repoUrl;
        repoLink.target = '_blank';
        repoLink.rel = 'noopener noreferrer';
        repoLink.textContent = `${project.repoLabel[lang]} ↗`;
        foot.append(repoLink);
      }

      card.append(head, desc, previewNode, tags, foot);

      // Interactive cursor spotlight + gentle micro-tilt on desktop fine pointer
      if (finePointer() && !reducedMotion()) {
        card.addEventListener('pointermove', event => {
          const rect = card.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          card.style.setProperty('--mx', `${x.toFixed(1)}px`);
          card.style.setProperty('--my', `${y.toFixed(1)}px`);
          if (!project.upcoming) {
            const rx = ((0.5 - y / rect.height) * 3.2).toFixed(2);
            const ry = ((x / rect.width - 0.5) * 3.2).toFixed(2);
            card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
          }
        });
        card.addEventListener('pointerleave', () => {
          card.style.transform = '';
        });
      }

      grid.append(card);
    });
  }

  function renderFooterRoutes() {
    if (!footRoutes) return;
    footRoutes.replaceChildren();
    const rootChip = el('a', 'foot-chip', '/');
    rootChip.href = './';
    footRoutes.append(rootChip);

    PROJECTS.filter(p => !p.upcoming && !p.external).forEach(p => {
      const chip = el('a', 'foot-chip', p.route);
      chip.href = p.href;
      footRoutes.append(chip);
    });
  }

  function applyLanguage(next) {
    lang = next === 'en' ? 'en' : 'zh';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    const dict = UI_TEXT[lang];
    document.title = dict.pageTitle;

    document.querySelectorAll('[data-i18n]').forEach(node => {
      const key = node.dataset.i18n;
      if (key === 'heroTitle') {
        const accent = el('span', '', dict.heroTitleAccent);
        node.replaceChildren(document.createTextNode(dict.heroTitleStart), accent);
      } else if (dict[key]) {
        node.textContent = dict[key];
      }
    });

    if (langBtn) {
      langBtn.textContent = dict.langButton;
      langBtn.setAttribute('aria-label', dict.langAria);
      langBtn.lang = lang === 'zh' ? 'en' : 'zh-CN';
    }

    renderCards();
    renderFooterRoutes();
    writeStore('hub-lang', lang);
  }

  themeBtn?.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));
  langBtn?.addEventListener('click', () => applyLanguage(lang === 'zh' ? 'en' : 'zh'));

  applyTheme(theme);
  applyLanguage(lang);
})();
