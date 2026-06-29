/** DarkLense — corpus browser and app orchestration */

let corpusData = null;
let nhiData = null;
let activePillar = 'all';
let activeKind = 'all';
let searchQuery = '';

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
      return;
    } catch (_) { /* try next base */ }
  }
  throw new Error('Failed to load corpus data');
}

function pillarLabel(p) {
  return { psychology: 'Psychology', psychological_warfare: 'Psy War', information_operations: 'Info Ops' }[p] || p;
}

function renderHeroStats() {
  const el = document.getElementById('hero-stats');
  if (!el || !corpusData) return;
  const t = corpusData.totals;
  const n = nhiData?.stats || {};
  el.innerHTML = `
    <div class="stat-card"><div class="stat-value">${t.cards}</div><div class="stat-label">Knowledge cards</div></div>
    <div class="stat-card"><div class="stat-value">${t.videos}</div><div class="stat-label">Videos indexed</div></div>
    <div class="stat-card"><div class="stat-value">${t.categories}</div><div class="stat-label">Topic categories</div></div>
    <div class="stat-card"><div class="stat-value">${n.frameworks || 0}</div><div class="stat-label">Frameworks</div></div>`;
}

function renderSourceMeta() {
  const el = document.getElementById('source-meta');
  if (!el || !corpusData?.source) return;
  const s = corpusData.source;
  el.innerHTML = `<p>Corpus distilled from <strong>${s.name}</strong> (${s.domain}) — <a href="${s.url}" target="_blank" rel="noopener noreferrer">source channel</a>. Cards are paraphrased standalone knowledge with video attribution. No raw transcripts distributed.</p>`;
}

function getFilteredCards() {
  if (!corpusData?.cards) return [];
  return corpusData.cards.filter(c => {
    if (activePillar !== 'all' && c.pillar !== activePillar) return false;
    if (activeKind !== 'all' && c.kind !== activeKind) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hay = `${c.title} ${c.content} ${c.category} ${c.kind}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderCardBrowser() {
  const grid = document.getElementById('cards-grid');
  const count = document.getElementById('results-count');
  if (!grid) return;

  const cards = getFilteredCards();
  if (count) count.textContent = `Showing ${cards.length} of ${corpusData.cards.length} cards`;

  const display = cards.slice(0, 120);
  grid.innerHTML = display.map(c => `
    <article class="k-card" data-id="${c.id}">
      <div class="k-card-meta">
        <span class="k-badge k-badge-kind">${c.kind}</span>
        <span class="k-badge k-badge-pillar-${c.pillar}">${pillarLabel(c.pillar)}</span>
        <span class="k-badge">${c.category}</span>
      </div>
      <h4>${c.title}</h4>
      <p>${c.content}</p>
      ${c.reasoning ? `<p style="margin-top:0.4rem;font-size:var(--text-sm)"><em>${c.reasoning}</em></p>` : ''}
      ${c.framework_steps?.length ? `<ol class="k-card-steps">${c.framework_steps.map(s => `<li>${s}</li>`).join('')}</ol>` : ''}
      ${c.source_quote ? `<p style="margin-top:0.4rem;font-size:var(--text-xs);color:var(--warn)">"${c.source_quote}"</p>` : ''}
      <p class="k-card-source"><a href="${c.video_url}" target="_blank" rel="noopener noreferrer">${c.video_title}</a></p>
    </article>`).join('');

  if (cards.length > 120) {
    grid.innerHTML += `<p class="results-count" style="grid-column:1/-1">Refine search to see more — ${cards.length - 120} additional cards match.</p>`;
  }
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
        renderCardBrowser();
      });
    });
  }

  const search = document.getElementById('card-search');
  if (search) {
    search.addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      renderCardBrowser();
    });
  }
}

function renderHighValue(nhi) {
  const el = document.getElementById('high-value-list');
  if (!el || !nhi?.highValueCards) return;
  el.innerHTML = `<table class="data-table"><thead><tr><th>Title</th><th>Kind</th><th>Category</th><th>Pillar</th></tr></thead><tbody>
    ${nhi.highValueCards.map(c => `<tr>
      <td><a href="#corpus" class="hv-search" data-q="${c.title.replace(/"/g, '&quot;')}">${c.title}</a></td>
      <td>${c.kind}</td><td>${c.category}</td><td>${pillarLabel(c.pillar)}</td></tr>`).join('')}
  </tbody></table>`;
  el.querySelectorAll('.hv-search').forEach(a => {
    a.addEventListener('click', () => {
      const search = document.getElementById('card-search');
      if (search) { search.value = a.dataset.q; search.dispatchEvent(new Event('input')); }
    });
  });
}

async function init() {
  try {
    await loadData();
    renderHeroStats();
    renderSourceMeta();
    if (typeof renderAllVisualizations === 'function') renderAllVisualizations(corpusData, nhiData);
    renderHighValue(nhiData);
    setupFilters();
    renderCardBrowser();
  } catch (err) {
    document.body.innerHTML = `<div class="container" style="padding:4rem"><h1>Failed to load corpus</h1><p>${err.message}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);