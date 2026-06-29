/** DarkLense — corpus browser and app orchestration */

let corpusData = null;
let nhiData = null;
let activePillar = 'all';
let activeKind = 'all';
let activeCategory = 'all';
let activeCategories = null;
let activeCardIds = null;
let activeNhiOnly = false;
let searchQuery = '';
let sortBy = 'id';
let viewMode = 'cards';
let nhiTierMap = {};
let nhiTopCardIds = new Set();

function pillarLabel(p) {
  return { psychology: 'Psychology', psychological_warfare: 'Psy War', information_operations: 'Info Ops' }[p] || p;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hasActiveFilters() {
  return activePillar !== 'all' || activeKind !== 'all' || activeCategory !== 'all'
    || activeCategories || activeCardIds || activeNhiOnly || searchQuery;
}

function clearFilters({ keepView = true } = {}) {
  activePillar = 'all';
  activeKind = 'all';
  activeCategory = 'all';
  activeCategories = null;
  activeCardIds = null;
  activeNhiOnly = false;
  searchQuery = '';

  const search = document.getElementById('card-search');
  if (search) search.value = '';

  const cat = document.getElementById('category-filter');
  if (cat) cat.value = 'all';

  const sort = document.getElementById('sort-filter');
  if (sort) sort.value = sortBy;

  document.querySelectorAll('#pillar-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.pillar === 'all');
  });
  document.querySelectorAll('#kind-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.kind === 'all');
  });
  document.getElementById('nhi-top-filter')?.classList.remove('active');

  if (keepView) renderCardBrowser();
}
window.clearCorpusFilters = clearFilters;

/** Navigate corpus browser — used by defense stack and high-value links */
function navigateToCards({
  categories = null,
  cardIds = null,
  query = '',
  pillar = 'all',
  kind = 'all',
  category = 'all',
  cardId = null,
  highlightOnly = false,
} = {}) {
  if (highlightOnly && cardId) {
    activeCategories = null;
    activeCardIds = null;
    activeCategory = category !== 'all' ? category : 'all';
    activePillar = pillar;
    activeKind = kind;
    searchQuery = query;
  } else {
    activeCategories = categories?.length ? new Set(categories) : null;
    activeCardIds = cardIds?.length ? new Set(cardIds.map(String)) : null;
    activeCategory = category;
    activePillar = pillar;
    activeKind = kind;
    searchQuery = query;
  }

  const search = document.getElementById('card-search');
  if (search) search.value = query;

  const cat = document.getElementById('category-filter');
  if (cat) cat.value = activeCategory;

  document.querySelectorAll('#pillar-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.pillar === activePillar);
  });
  document.querySelectorAll('#kind-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.kind === activeKind);
  });

  renderCardBrowser();
  document.getElementById('corpus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (cardId) {
    requestAnimationFrame(() => {
      const el = document.getElementById(`card-${cardId}`);
      if (el) {
        el.classList.add('k-card-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.classList.remove('k-card-highlight'), 2500);
      }
    });
  }
}
window.navigateToCards = navigateToCards;

async function loadData() {
  const bases = ['data/', '../data/'];
  for (const base of bases) {
    try {
      const [c, n] = await Promise.all([
        fetch(`${base}corpus.json`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${base}nhi-analysis.json`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      ]);
      corpusData = c;
      nhiData = n;
      window._corpusData = c;
      window._nhiData = n;
      return;
    } catch (_) { /* try next base */ }
  }
  throw new Error('Failed to load corpus data');
}

function renderHeroStats() {
  const el = document.getElementById('hero-stats');
  if (!el || !corpusData) return;
  const t = corpusData.totals;
  const n = nhiData?.stats || {};
  el.innerHTML = `
    <div class="stat-card"><div class="stat-value">${t.cards}</div><div class="stat-label">Knowledge cards</div></div>
    <div class="stat-card"><div class="stat-value">${t.categories}</div><div class="stat-label">Topic categories</div></div>
    <div class="stat-card"><div class="stat-value">${n.frameworks || 0}</div><div class="stat-label">Frameworks</div></div>
    <div class="stat-card stat-card-muted"><div class="stat-value">${t.videos}</div><div class="stat-label">Source videos</div></div>`;

  const heroSub = document.getElementById('hero-sub');
  if (heroSub) {
    heroSub.innerHTML = `<strong>${t.cards}</strong> knowledge cards — but you don't read them all. <a href="#personal-lens">Build your personal digest</a> and NHI routes you to what's relevant. Full corpus always available.`;
  }
  const corpusIntro = document.getElementById('corpus-intro');
  if (corpusIntro) {
    corpusIntro.textContent = `Browse all ${t.cards} knowledge cards below. Search, filter by pillar, kind, or category, and switch to compact list view to scan the full corpus.`;
  }
  const videosIntro = document.getElementById('videos-intro');
  if (videosIntro) {
    videosIntro.textContent = `Secondary reference: ${t.videos} indexed source videos with card counts. Cards above contain the distilled knowledge — videos are for attribution and deeper context only.`;
  }
}

function renderSourceMeta() {
  const el = document.getElementById('source-meta');
  if (!el || !corpusData?.source) return;
  const s = corpusData.source;
  el.innerHTML = `<p>Corpus distilled from <strong>${s.name}</strong> (${s.domain}) via Knowledge Atlas. <strong>${corpusData.totals.cards} standalone cards</strong> — paraphrased, categorized, searchable. <a href="${s.url}" target="_blank" rel="noopener noreferrer">Source channel</a> (reference only). No raw transcripts distributed.</p>`;
}

function getFilteredCards() {
  if (!corpusData?.cards) return [];
  const filtered = corpusData.cards.filter(c => {
    if (activePillar !== 'all' && c.pillar !== activePillar) return false;
    if (activeKind !== 'all' && c.kind !== activeKind) return false;
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (activeNhiOnly && !nhiTopCardIds.has(String(c.id))) return false;
    if (activeCardIds && !activeCardIds.has(String(c.id))) return false;
    if (activeCategories && !activeCategories.has(c.category)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hay = `${c.title} ${c.content} ${c.category} ${c.kind} ${c.reasoning || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'category') return a.category.localeCompare(b.category) || a.id - b.id;
    if (sortBy === 'kind') return a.kind.localeCompare(b.kind) || a.id - b.id;
    if (sortBy === 'pillar') return a.pillar.localeCompare(b.pillar) || a.id - b.id;
    return a.id - b.id;
  });
  return sorted;
}

function renderCardContent(c) {
  const parts = [`<p class="k-card-body">${escapeHtml(c.content)}</p>`];
  if (c.reasoning) {
    parts.push(`<p class="k-card-reasoning"><em>${escapeHtml(c.reasoning)}</em></p>`);
  }
  if (c.framework_steps?.length) {
    parts.push(`<ol class="k-card-steps">${c.framework_steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`);
  }
  if (c.source_quote) {
    parts.push(`<p class="k-card-quote">"${escapeHtml(c.source_quote)}"</p>`);
  }
  return parts.join('');
}

function nhiTierBadge(id) {
  const tier = nhiTierMap[id];
  if (!tier) return '';
  return `<span class="hva-tier-badge tier-${tier}" title="NHI Tier ${tier} — universal human value">NHI ${tier}</span>`;
}

function renderCardHtml(c) {
  return `
    <article class="k-card${nhiTierMap[c.id] ? ' k-card-nhi' : ''}" id="card-${c.id}" data-id="${c.id}">
      <div class="k-card-meta">
        <span class="k-badge k-badge-id">#${c.id}</span>
        ${nhiTierBadge(c.id)}
        <span class="k-badge k-badge-kind">${escapeHtml(c.kind)}</span>
        <span class="k-badge k-badge-pillar-${c.pillar}">${pillarLabel(c.pillar)}</span>
        <span class="k-badge k-badge-cat">${escapeHtml(c.category)}</span>
      </div>
      <h4 class="k-card-title">${escapeHtml(c.title)}</h4>
      ${renderCardContent(c)}
      <p class="k-card-attrib" title="Source video — tertiary reference">
        <span class="k-card-attrib-label">Source</span>
        <a href="${escapeHtml(c.video_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.video_title)}</a>
      </p>
    </article>`;
}

function renderCompactRow(c) {
  return `
    <article class="k-row" id="card-${c.id}" data-id="${c.id}">
      <button type="button" class="k-row-head" aria-expanded="false" data-toggle-row="${c.id}">
        <span class="k-row-id">#${c.id}${nhiTierMap[c.id] ? ` <span class="hva-tier-badge tier-${nhiTierMap[c.id]}">${nhiTierMap[c.id]}</span>` : ''}</span>
        <span class="k-row-kind">${escapeHtml(c.kind)}</span>
        <span class="k-row-cat">${escapeHtml(c.category)}</span>
        <span class="k-row-title">${escapeHtml(c.title)}</span>
        <span class="k-row-pillar k-badge-pillar-${c.pillar}">${pillarLabel(c.pillar)}</span>
        <span class="k-row-chevron" aria-hidden="true">▸</span>
      </button>
      <div class="k-row-body" hidden>
        ${renderCardContent(c)}
        <p class="k-card-attrib">
          <span class="k-card-attrib-label">Source</span>
          <a href="${escapeHtml(c.video_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.video_title)}</a>
        </p>
      </div>
    </article>`;
}

function renderActiveFilterBar(cards) {
  const bar = document.getElementById('active-filters');
  if (!bar) return;

  if (!hasActiveFilters()) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }

  const tags = [];
  if (searchQuery) tags.push(`Search: “${escapeHtml(searchQuery)}”`);
  if (activePillar !== 'all') tags.push(`Pillar: ${pillarLabel(activePillar)}`);
  if (activeKind !== 'all') tags.push(`Kind: ${escapeHtml(activeKind)}`);
  if (activeCategory !== 'all') tags.push(`Category: ${escapeHtml(activeCategory)}`);
  if (activeCategories) tags.push(`Categories: ${[...activeCategories].slice(0, 3).map(escapeHtml).join(', ')}${activeCategories.size > 3 ? '…' : ''}`);
  if (activeNhiOnly) tags.push(`NHI Top Picks: ${nhiTopCardIds.size} cards`);
  if (activeCardIds) tags.push(`Stack filter: ${activeCardIds.size} cards`);

  bar.hidden = false;
  bar.innerHTML = `
    <div class="active-filters-inner">
      <span class="active-filters-label">Filtered</span>
      ${tags.map(t => `<span class="active-filter-tag">${t}</span>`).join('')}
      <button type="button" class="filter-clear-btn" id="clear-filters-btn">Show all ${corpusData.cards.length} cards</button>
    </div>`;

  document.getElementById('clear-filters-btn')?.addEventListener('click', () => clearFilters());
}

function renderCardBrowser() {
  const grid = document.getElementById('cards-grid');
  const count = document.getElementById('results-count');
  if (!grid || !corpusData) return;

  const cards = getFilteredCards();
  const total = corpusData.cards.length;

  if (count) {
    count.textContent = cards.length === total
      ? `All ${total} knowledge cards`
      : `Showing ${cards.length} of ${total} cards`;
  }

  renderActiveFilterBar(cards);

  document.querySelectorAll('.view-toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewMode);
  });

  if (viewMode === 'compact') {
    grid.className = 'cards-list';
    grid.innerHTML = cards.map(renderCompactRow).join('');
    grid.querySelectorAll('[data-toggle-row]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.k-row');
        const body = row?.querySelector('.k-row-body');
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        if (body) body.hidden = open;
        row?.classList.toggle('k-row-open', !open);
      });
    });
  } else {
    grid.className = 'cards-grid';
    grid.innerHTML = cards.map(renderCardHtml).join('');
  }
}

function setupCategoryFilter() {
  const sel = document.getElementById('category-filter');
  if (!sel || !corpusData?.cards) return;

  const counts = {};
  corpusData.cards.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  sel.innerHTML = `<option value="all">All categories (${ranked.length})</option>` +
    ranked.map(([cat, n]) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)} (${n})</option>`).join('');

  sel.addEventListener('change', () => {
    activeCategory = sel.value;
    activeCategories = null;
    activeCardIds = null;
    activeNhiOnly = false;
    document.getElementById('nhi-top-filter')?.classList.remove('active');
    renderCardBrowser();
  });
}

function setupFilters() {
  const kinds = [...new Set(corpusData.cards.map(c => c.kind))].sort();
  const kindRow = document.getElementById('kind-filters');
  if (kindRow) {
    kindRow.innerHTML = `<button class="filter-btn active" data-kind="all">All kinds</button>` +
      kinds.map(k => `<button class="filter-btn" data-kind="${k}">${k}</button>`).join('');
    kindRow.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        kindRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeKind = btn.dataset.kind;
        activeCategories = null;
        activeCardIds = null;
        activeNhiOnly = false;
        document.getElementById('nhi-top-filter')?.classList.remove('active');
        renderCardBrowser();
      });
    });
  }

  const pillarRow = document.getElementById('pillar-filters');
  if (pillarRow) {
    pillarRow.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pillarRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePillar = btn.dataset.pillar;
        activeCategories = null;
        activeCardIds = null;
        activeNhiOnly = false;
        document.getElementById('nhi-top-filter')?.classList.remove('active');
        renderCardBrowser();
      });
    });
  }

  const search = document.getElementById('card-search');
  if (search) {
    search.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      activeCategories = null;
      activeCardIds = null;
      activeNhiOnly = false;
      document.getElementById('nhi-top-filter')?.classList.remove('active');
      renderCardBrowser();
    });
  }

  const sort = document.getElementById('sort-filter');
  if (sort) {
    sort.addEventListener('change', () => {
      sortBy = sort.value;
      renderCardBrowser();
    });
  }

  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.view;
      renderCardBrowser();
    });
  });

  setupCategoryFilter();

  const nhiBtn = document.getElementById('nhi-top-filter');
  if (nhiBtn) {
    nhiBtn.addEventListener('click', () => {
      activeNhiOnly = !activeNhiOnly;
      nhiBtn.classList.toggle('active', activeNhiOnly);
      if (activeNhiOnly) {
        activeCategories = null;
        activeCardIds = null;
      }
      renderCardBrowser();
    });
  }
}

function renderHighValue(nhi) {
  const el = document.getElementById('high-value-list');
  if (!el || !nhi?.highValueCards) return;
  el.innerHTML = `<table class="data-table"><thead><tr><th>Tier</th><th>Title</th><th>Theme</th><th>Kind</th><th>NHI verdict</th></tr></thead><tbody>
    ${nhi.highValueCards.map(c => `<tr>
      <td>${c.tier ? `<span class="hva-tier-badge tier-${c.tier}">${c.tier}</span>` : '—'}</td>
      <td><a href="#corpus" class="hv-search" data-id="${c.id}" data-q="${c.title.replace(/"/g, '&quot;')}">${escapeHtml(c.title)}</a></td>
      <td>${escapeHtml(c.theme || c.category)}</td>
      <td>${escapeHtml(c.kind)}</td>
      <td class="hva-verdict-cell">${escapeHtml(c.nhiVerdict || '')}</td></tr>`).join('')}
  </tbody></table>`;
  el.querySelectorAll('.hv-search').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigateToCards({ query: a.dataset.q, cardId: Number(a.dataset.id), highlightOnly: true });
    });
  });
}

async function init() {
  try {
    await loadData();
    if (typeof getNhiTopCardIds === 'function') nhiTopCardIds = getNhiTopCardIds(nhiData);
    if (typeof getNhiTierMap === 'function') nhiTierMap = getNhiTierMap(nhiData);
    renderHeroStats();
    renderSourceMeta();
    if (typeof renderAllVisualizations === 'function') renderAllVisualizations(corpusData, nhiData);
    if (typeof renderPersonalLens === 'function') renderPersonalLens(corpusData, nhiData);
    renderHighValue(nhiData);
    setupFilters();
    renderCardBrowser();
  } catch (err) {
    document.body.innerHTML = `<div class="container" style="padding:4rem"><h1>Failed to load corpus</h1><p>${err.message}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);