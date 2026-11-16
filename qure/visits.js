'use strict';
(() => {
  const VISIT_API = 'https://visit-counter.kyleqin0603.workers.dev/';
  const VISIT_SITE = 'qure';
  const badge = document.getElementById('visit-badge');
  const countEl = document.getElementById('visit-count');
  if (!badge || !countEl) return;

  let latestCount = null;

  function updateAria() {
    const base = window.QureI18n?.t('Qure 站累计访问次数') || 'Qure 站累计访问次数';
    const label = latestCount !== null ? `${base}: ${latestCount.toLocaleString()}` : base;
    badge.setAttribute('aria-label', label);
    badge.title = label;
  }

  function renderCount(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    latestCount = num;
    countEl.textContent = num.toLocaleString();
    badge.hidden = false;
    badge.classList.add('is-loaded');
    updateAria();
  }

  async function syncVisits() {
    const hitKey = `visit-recorded-${VISIT_SITE}`;
    const cacheKey = `visit-cache-${VISIT_SITE}`;
    let recorded = false;
    try {
      recorded = sessionStorage.getItem(hitKey) === '1';
      const cached = sessionStorage.getItem(cacheKey);
      if (cached !== null) renderCount(Number(cached));
    } catch {
      /* Ignore sessionStorage restriction. */
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${VISIT_API}?site=${encodeURIComponent(VISIT_SITE)}`, {
        method: recorded ? 'GET' : 'POST',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data?.count === 'number') {
        renderCount(data.count);
        try {
          sessionStorage.setItem(hitKey, '1');
          sessionStorage.setItem(cacheKey, String(data.count));
        } catch {
          /* Ignore sessionStorage restriction. */
        }
      }
    } catch {
      if (latestCount === null) badge.hidden = true;
    } finally {
      clearTimeout(timer);
    }
  }

  document.addEventListener('qure-language-changed', updateAria);
  syncVisits();
})();
