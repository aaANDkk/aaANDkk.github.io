'use strict';
(() => {
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.topbar');
  const nav = header?.querySelector('nav');
  const links = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  let activeLink = null;
  let hoveredLink = null;
  let queued = false;

  if (header && nav) {
    const ink = document.createElement('span');
    ink.className = 'nav-ink';
    ink.setAttribute('aria-hidden', 'true');
    nav.prepend(ink);

    const progress = document.createElement('span');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    header.append(progress);

    let lastInkTarget = undefined;
    let lastScrolled = null;
    let navLockTarget = null;
    let navLockTimer = 0;
    function placeInk(target) {
      if (target === lastInkTarget) return;
      lastInkTarget = target;
      ink.classList.toggle('is-visible', Boolean(target));
      if (!target) return;
      ink.style.width = `${target.offsetWidth}px`;
      ink.style.height = `${target.offsetHeight}px`;
      ink.style.transform = `translate(${target.offsetLeft}px,${target.offsetTop}px)`;
    }

    links.forEach(link => {
      link.addEventListener('pointerenter', () => { hoveredLink = link; placeInk(link); });
      link.addEventListener('focus', () => placeInk(link));
      link.addEventListener('blur', () => placeInk(activeLink));
      link.addEventListener('click', () => {
        navLockTarget = link;
        clearTimeout(navLockTimer);
        navLockTimer = setTimeout(() => { navLockTarget = null; updateHeader(); }, 850);
        activeLink = link;
        links.forEach(item => {
          item.classList.toggle('is-current', item === link);
          if (item === link) item.setAttribute('aria-current', 'location');
          else item.removeAttribute('aria-current');
        });
        placeInk(link);
      });
    });
    nav.addEventListener('pointerleave', () => { hoveredLink = null; placeInk(activeLink); });

    function updateHeader() {
      queued = false;
      const scrolled = window.scrollY > 18;
      if (scrolled !== lastScrolled) {
        lastScrolled = scrolled;
        header.classList.toggle('is-scrolled', scrolled);
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0})`;
      const triggerTop = (header.offsetHeight || 80) + 74;
      let current = null;
      sections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= triggerTop) current = links[index];
      });
      if (max > 0 && window.scrollY >= max - 6 && links.length) {
        current = links[links.length - 1];
      }
      if (navLockTarget) {
        if (current === navLockTarget) {
          navLockTarget = null;
          clearTimeout(navLockTimer);
        } else {
          current = navLockTarget;
        }
      }
      if (current !== activeLink) {
        activeLink = current;
        links.forEach(link => {
          link.classList.toggle('is-current', link === current);
          if (link === current) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
      placeInk(hoveredLink || activeLink);
    }

    window.addEventListener('scroll', () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(updateHeader);
      }
    }, { passive: true });
    window.addEventListener('resize', () => {
      lastInkTarget = undefined;
      updateHeader();
    }, { passive: true });
    document.addEventListener('qure-language-changed', () => {
      lastInkTarget = undefined;
      updateHeader();
    });
    updateHeader();
  }

  /* Directional stretching segmented ink (leads toward destination, trails behind) */
  function installStretchingInk(container, inkClass, containerClass, activeSelector, itemSelector) {
    if (!container) return;
    const ink = document.createElement('span');
    ink.className = inkClass;
    ink.setAttribute('aria-hidden', 'true');
    container.prepend(ink);
    container.classList.add(containerClass);

    let prevLeft = null;
    const position = (animate = true) => {
      const selected = container.querySelector(activeSelector);
      if (!selected) return;
      const left = selected.offsetLeft;
      const right = Math.max(0, container.clientWidth - left - selected.offsetWidth);
      if (!animate || prevLeft === null) {
        ink.classList.remove('to-end', 'to-start');
      } else if (left > prevLeft) {
        ink.classList.add('to-end');
        ink.classList.remove('to-start');
      } else if (left < prevLeft) {
        ink.classList.add('to-start');
        ink.classList.remove('to-end');
      }
      prevLeft = left;
      ink.style.left = `${left}px`;
      ink.style.right = `${right}px`;
      ink.style.top = `${selected.offsetTop}px`;
      ink.style.height = `${selected.offsetHeight}px`;
    };

    container.querySelectorAll(itemSelector).forEach(button => {
      button.addEventListener('click', () => requestAnimationFrame(() => position(true)));
    });
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => position(false)).observe(container);
    }
    document.addEventListener('qure-language-changed', () => requestAnimationFrame(() => position(false)));
    position(false);
  }

  document.querySelectorAll('.tabs').forEach(tabs => {
    installStretchingInk(tabs, 'tab-ink', 'has-tab-ink', 'button.active', 'button');
  });

  document.querySelectorAll('.theme-switch').forEach(switcher => {
    installStretchingInk(switcher, 'theme-ink', 'has-theme-ink', 'button[aria-pressed="true"]', 'button');
  });

  /* Eyebrow capsule pulse indicator */
  const heroEyebrow = document.querySelector('.hero .eyebrow');
  if (heroEyebrow && !heroEyebrow.querySelector('.hero-pulse')) {
    const pulse = document.createElement('span');
    pulse.className = 'hero-pulse';
    pulse.setAttribute('aria-hidden', 'true');
    heroEyebrow.append(pulse);
  }

  /* Per-character spring entrance and hover bounce for #hero-title */
  const heading = document.querySelector('#hero-title');
  function splitHeroTitle() {
    if (!heading) return;
    let index = 0;
    const targets = heading.querySelectorAll('[data-i18n]');
    targets.forEach(target => {
      const text = target.textContent || '';
      if (!text) return;
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      for (const char of [...text]) {
        const span = document.createElement('span');
        if (char === ' ') {
          span.className = 'ch ch-space';
          span.textContent = '\u00A0';
        } else {
          span.className = 'ch';
          span.style.setProperty('--i', String(index++));
          span.textContent = char;
        }
        visual.append(span);
      }
      target.replaceChildren(sr, visual);
    });
  }
  if (heading) {
    splitHeroTitle();
    document.addEventListener('qure-language-changed', splitHeroTitle);
  }

  /* Magnetic pointer pull for primary hero CTA */
  const exploreCta = document.querySelector('.hero .explore');
  if (exploreCta) {
    exploreCta.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reduced()) return;
      const rect = exploreCta.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      exploreCta.style.setProperty('--pull-x', `${(dx * 0.16).toFixed(1)}px`);
      exploreCta.style.setProperty('--pull-y', `${(dy * 0.22).toFixed(1)}px`);
    });
    const resetPull = () => {
      exploreCta.style.setProperty('--pull-x', '0px');
      exploreCta.style.setProperty('--pull-y', '0px');
    };
    exploreCta.addEventListener('pointerleave', resetPull);
    exploreCta.addEventListener('blur', resetPull);
  }

  /* Hero flowing field */
  const hero = document.querySelector('.hero-art');
  if (hero) {
    const flow = document.createElement('div');
    flow.className = 'hero-flow';
    flow.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const layer = document.createElement('i');
      layer.className = `flow-layer flow-layer-${i + 1}`;
      flow.append(layer);
    }
    const field = document.createElement('div');
    field.className = 'hero-field';
    field.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 18; i++) {
      const stroke = document.createElement('i');
      stroke.style.left = `${(i * 37 + 9) % 95}%`;
      stroke.style.top = `${(i * 29 + 4) % 92}%`;
      stroke.style.setProperty('--stroke-delay', `${-(i % 7) * 1.3}s`);
      stroke.style.setProperty('--stroke-length', `${i % 3 === 0 ? 34 : i % 3 === 1 ? 20 : 7}px`);
      field.append(stroke);
    }
    hero.prepend(flow, field);
    let onScreen = true;
    const pause = () => hero.classList.toggle('field-paused', !onScreen || document.hidden);
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => {
        onScreen = entries[0].isIntersecting;
        pause();
      }, { rootMargin: '80px' });
      observer.observe(hero);
    }
    document.addEventListener('visibilitychange', pause);
    pause();
  }

  /* Feature strip & guide scroll reveal */
  const strip = document.querySelector('.feature-strip');
  if (strip && typeof IntersectionObserver === 'function' && !reduced()) {
    strip.classList.add('reveal');
    const stripObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        strip.classList.add('in-view');
        stripObserver.disconnect();
      }
    }, { threshold: 0.14 });
    stripObserver.observe(strip);
  }
})();
