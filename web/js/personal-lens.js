/** DarkLense — Personal Lens: concern routing + individualized digest */

const LENS_STORAGE_KEY = 'darklense-concerns';
const LENS_READ_KEY = 'darklense-read-cards';
const MAX_CONCERNS = 3;

function getSavedConcerns() {
  try {
    const raw = localStorage.getItem(LENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveConcerns(ids) {
  localStorage.setItem(LENS_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_CONCERNS)));
}

function getReadCards() {
  try {
    const raw = localStorage.getItem(LENS_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markCardRead(id) {
  const read = getReadCards();
  read.add(String(id));
  localStorage.setItem(LENS_READ_KEY, JSON.stringify([...read]));
}

function computePersonalDigest(concernIds, nhi, corpus) {
  const digest = nhi?.personalDigest;
  if (!digest || !concernIds?.length) return { cardIds: [], path: null };

  const scores = new Map();
  const tierSIds = (nhi.humanValueAssessment?.tiers?.S?.cards || []).map(c => c.id);

  concernIds.forEach((cid, idx) => {
    const concern = digest.concerns.find(c => c.id === cid);
    if (!concern) return;
    const weight = MAX_CONCERNS - idx;
    (concern.topCardIds || []).forEach((id, i) => {
      const prev = scores.get(id) || 0;
      scores.set(id, prev + (concern.topCardIds.length - i) * weight);
    });
  });

  tierSIds.slice(0, digest.digestSize?.baselineTierSCards || 3).forEach(id => {
    scores.set(id, (scores.get(id) || 0) + 50);
  });

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const maxCards = digest.digestSize?.max || 25;
  const minCards = digest.digestSize?.min || 12;
  const cardIds = sorted.slice(0, maxCards).map(([id]) => id);
  while (cardIds.length < minCards && sorted.length > cardIds.length) {
    const next = sorted[cardIds.length];
    if (next) cardIds.push(next[0]);
  }

  const primary = concernIds[0];
  const path = (digest.learningPaths || []).find(p =>
    p.concernIds?.includes(primary)
  ) || digest.learningPaths?.[0];

  return { cardIds, path, concernIds };
}

function renderMethodology(digest) {
  const el = document.getElementById('lens-methodology');
  if (!el || !digest?.methodologyDistill) return;
  const d = digest.methodologyDistill;
  el.innerHTML = `
    <div class="lens-methodology-inner">
      <p class="hva-lead">${d.lead}</p>
      <div class="lens-method-grid">
        <div>
          <h4 class="hva-heading">${d.rulesTitle}</h4>
          <ul class="hva-list">${d.rules.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
        <div>
          <h4 class="hva-heading">${d.antiPatternsTitle}</h4>
          <ul class="hva-list">${d.antiPatterns.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>
      <ol class="lens-layers">${(digest.layers || []).map(l =>
        `<li><strong>${l.order}. ${l.name}</strong> — ${l.description}</li>`
      ).join('')}</ol>
    </div>`;
}

function renderConcernPicker(digest, selected) {
  const el = document.getElementById('lens-concern-picker');
  if (!el) return;
  const sel = new Set(selected || []);

  el.innerHTML = `
    <p class="lens-picker-hint">Select up to ${MAX_CONCERNS} concerns — NHI builds your digest from 645 cards, not all at once.</p>
    <div class="lens-concerns-grid">
      ${digest.concerns.map(c => `
        <button type="button" class="lens-concern-btn${sel.has(c.id) ? ' selected' : ''}"
          data-concern="${c.id}" style="--concern-color:${c.color}">
          <span class="lens-concern-label">${c.label}</span>
          <span class="lens-concern-desc">${c.description}</span>
          <span class="lens-concern-meta">${c.cardCount} routed cards</span>
        </button>`).join('')}
    </div>
    <button type="button" class="lens-apply-btn" id="lens-apply" ${sel.size ? '' : 'disabled'}>
      Build my digest (${sel.size || 0} concern${sel.size === 1 ? '' : 's'})
    </button>`;

  el.querySelectorAll('.lens-concern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.concern;
      if (sel.has(id)) sel.delete(id);
      else if (sel.size < MAX_CONCERNS) sel.add(id);
      renderConcernPicker(digest, [...sel]);
    });
  });

  document.getElementById('lens-apply')?.addEventListener('click', () => {
    if (!sel.size) return;
    saveConcerns([...sel]);
    renderPersonalLens(window._corpusData, window._nhiData);
    document.getElementById('personal-lens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderDigestResult(result, corpus, nhi) {
  const el = document.getElementById('lens-digest-result');
  if (!el) return;

  const cardsById = Object.fromEntries((corpus.cards || []).map(c => [c.id, c]));
  const read = getReadCards();
  const tierMap = typeof getNhiTierMap === 'function' ? getNhiTierMap(nhi) : {};

  const concernLabels = result.concernIds.map(id =>
    nhi.personalDigest.concerns.find(c => c.id === id)?.label || id
  ).join(' · ');

  el.innerHTML = `
    <div class="lens-digest-header">
      <div>
        <h3>Your Personal Digest</h3>
        <p class="lens-digest-meta">${result.cardIds.length} cards routed for: <strong>${concernLabels}</strong></p>
      </div>
      <button type="button" class="filter-clear-btn" id="lens-change-concerns">Change concerns</button>
    </div>
    <div class="lens-digest-cards">
      ${result.cardIds.map((id, i) => {
        const c = cardsById[id];
        if (!c) return '';
        const tier = tierMap[id];
        const done = read.has(String(id));
        return `
          <article class="lens-digest-card${done ? ' lens-read' : ''}" data-card-id="${id}">
            <span class="lens-step-num">${i + 1}</span>
            <div class="lens-digest-body">
              <div class="k-card-meta">
                ${tier ? `<span class="hva-tier-badge tier-${tier}">${tier}</span>` : ''}
                <span class="k-badge k-badge-kind">${c.kind}</span>
                <span class="k-badge k-badge-cat">${c.category}</span>
              </div>
              <h4>${c.title}</h4>
              <p>${c.content.length > 220 ? c.content.slice(0, 220) + '…' : c.content}</p>
              <div class="lens-digest-actions">
                <button type="button" class="hva-open-btn lens-open-corpus" data-card-id="${id}">Open full card</button>
                <button type="button" class="lens-mark-read" data-card-id="${id}" ${done ? 'disabled' : ''}>
                  ${done ? '✓ Read' : 'Mark read'}
                </button>
              </div>
            </div>
          </article>`;
      }).join('')}
    </div>
    <div class="lens-digest-footer">
      <button type="button" class="lens-apply-btn" id="lens-view-all-mine">View all ${result.cardIds.length} in corpus</button>
      <a href="#corpus" class="lens-full-corpus-link">Full 645-card library →</a>
    </div>`;

  document.getElementById('lens-change-concerns')?.addEventListener('click', () => {
    localStorage.removeItem(LENS_STORAGE_KEY);
    renderPersonalLens(corpus, nhi);
  });

  el.querySelectorAll('.lens-open-corpus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.cardId);
      if (window.navigateToCards) window.navigateToCards({ cardId: id, highlightOnly: true });
    });
  });

  el.querySelectorAll('.lens-mark-read').forEach(btn => {
    btn.addEventListener('click', () => {
      markCardRead(Number(btn.dataset.cardId));
      renderDigestResult(result, corpus, nhi);
    });
  });

  document.getElementById('lens-view-all-mine')?.addEventListener('click', () => {
    if (window.navigateToCards) {
      window.navigateToCards({ cardIds: result.cardIds.map(String) });
    }
  });
}

function renderLearningPath(path, corpus) {
  const el = document.getElementById('lens-learning-path');
  if (!el || !path) return;

  el.innerHTML = `
    <h3>Recommended path: ${path.title}</h3>
    <p class="section-intro">${path.description} · ~${path.minutes} min · ${path.stepCount} steps</p>
    <ol class="lens-path-steps">
      ${(path.steps || []).map(s => `
        <li>
          <button type="button" class="lens-path-step-btn" data-card-id="${s.cardId}">
            <span class="lens-path-order">${s.order}</span>
            <span class="lens-path-title">${s.title}</span>
            <span class="lens-path-why">${s.why}</span>
          </button>
        </li>`).join('')}
    </ol>
    <button type="button" class="lens-apply-btn" id="lens-start-path">Start this path in corpus</button>`;

  el.querySelectorAll('.lens-path-step-btn, #lens-start-path')?.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'lens-start-path') {
        if (window.navigateToCards) {
          window.navigateToCards({ cardIds: path.cardIds.map(String), cardId: path.cardIds[0] });
        }
      } else {
        const id = Number(btn.dataset.cardId);
        if (window.navigateToCards) window.navigateToCards({ cardId: id, highlightOnly: true });
      }
    });
  });
}

function renderPersonalLens(corpus, nhi) {
  const digest = nhi?.personalDigest;
  if (!digest) return;

  renderMethodology(digest);

  const saved = getSavedConcerns();
  const picker = document.getElementById('lens-concern-picker');
  const resultWrap = document.getElementById('lens-digest-wrap');
  const pathWrap = document.getElementById('lens-path-wrap');

  if (!saved?.length) {
    if (picker) picker.hidden = false;
    if (resultWrap) resultWrap.hidden = true;
    if (pathWrap) pathWrap.hidden = true;
    renderConcernPicker(digest, []);
    return;
  }

  if (picker) picker.hidden = true;
  if (resultWrap) resultWrap.hidden = false;
  if (pathWrap) pathWrap.hidden = false;

  const result = computePersonalDigest(saved, nhi, corpus);
  renderDigestResult(result, corpus, nhi);
  renderLearningPath(result.path, corpus);
}

window.renderPersonalLens = renderPersonalLens;
window.computePersonalDigest = computePersonalDigest;