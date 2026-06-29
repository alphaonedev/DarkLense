/** DarkLense — Personal Lens: onboarding, digest, daily 3, printable brief */

const LENS_STORAGE_KEY = 'darklense-concerns';
const LENS_READ_KEY = 'darklense-read-cards';
const LENS_ONBOARDING_KEY = 'darklense-onboarding-answers';
const LENS_FOLLOWUP_KEY = 'darklense-followup-answers';
const LENS_ONBOARDING_DONE_KEY = 'darklense-onboarding-complete';
const MAX_CONCERNS = 3;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSavedConcerns() {
  try {
    const raw = localStorage.getItem(LENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveConcerns(ids) {
  localStorage.setItem(LENS_STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_CONCERNS)));
}

function getOnboardingAnswers() {
  try {
    const raw = localStorage.getItem(LENS_ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOnboardingAnswers(answers) {
  localStorage.setItem(LENS_ONBOARDING_KEY, JSON.stringify(answers));
  localStorage.setItem(LENS_ONBOARDING_DONE_KEY, '1');
}

function getFollowUpAnswers() {
  try {
    const raw = localStorage.getItem(LENS_FOLLOWUP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveFollowUpAnswer(concernId, optionId) {
  const a = getFollowUpAnswers();
  a[concernId] = optionId;
  localStorage.setItem(LENS_FOLLOWUP_KEY, JSON.stringify(a));
}

function isOnboardingComplete() {
  return localStorage.getItem(LENS_ONBOARDING_DONE_KEY) === '1';
}

function getReadCards() {
  try {
    const raw = localStorage.getItem(LENS_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markCardRead(id) {
  const read = getReadCards();
  read.add(String(id));
  localStorage.setItem(LENS_READ_KEY, JSON.stringify([...read]));
}

function scoreConcernsFromOnboarding(nhi) {
  const questions = nhi?.personalDigest?.onboarding?.questions || [];
  const answers = getOnboardingAnswers();
  const scores = {};

  questions.forEach(q => {
    const optId = answers[q.id];
    const opt = q.options?.find(o => o.id === optId);
    if (!opt?.concernBoosts) return;
    Object.entries(opt.concernBoosts).forEach(([cid, pts]) => {
      scores[cid] = (scores[cid] || 0) + pts;
    });
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

function applyFollowUpBoosts(scores, concernIds, nhi) {
  const followUps = getFollowUpAnswers();
  const concerns = nhi?.personalDigest?.concerns || [];

  concernIds.forEach(cid => {
    const concern = concerns.find(c => c.id === cid);
    const optId = followUps[cid];
    const opt = concern?.followUp?.options?.find(o => o.id === optId);
    (opt?.cardBoostIds || []).forEach((id, i) => {
      scores.set(id, (scores.get(id) || 0) + (20 - i * 2));
    });
  });
}

function computePersonalDigest(concernIds, nhi, corpus) {
  const digest = nhi?.personalDigest;
  if (!digest || !concernIds?.length) return { cardIds: [], path: null, concernIds: [] };

  const scores = new Map();
  const tierSIds = (nhi.humanValueAssessment?.tiers?.S?.cards || []).map(c => c.id);

  concernIds.forEach((cid, idx) => {
    const concern = digest.concerns.find(c => c.id === cid);
    if (!concern) return;
    const weight = MAX_CONCERNS - idx;
    (concern.topCardIds || []).forEach((id, i) => {
      scores.set(id, (scores.get(id) || 0) + (concern.topCardIds.length - i) * weight);
    });
  });

  tierSIds.slice(0, digest.digestSize?.baselineTierSCards || 3).forEach(id => {
    scores.set(id, (scores.get(id) || 0) + 50);
  });

  applyFollowUpBoosts(scores, concernIds, nhi);

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const maxCards = digest.digestSize?.max || 25;
  const minCards = digest.digestSize?.min || 12;
  const cardIds = sorted.slice(0, maxCards).map(([id]) => id);
  while (cardIds.length < minCards && sorted.length > cardIds.length) {
    cardIds.push(sorted[cardIds.length][0]);
  }

  const primary = concernIds[0];
  const path = (digest.learningPaths || []).find(p => p.concernIds?.includes(primary))
    || digest.learningPaths?.[0];

  return { cardIds, path, concernIds };
}

function getDailyThree(cardIds, nhi) {
  const today = new Date().toISOString().slice(0, 10);
  const read = getReadCards();
  const unread = cardIds.filter(id => !read.has(String(id)));
  const pool = unread.length >= 3 ? unread : [...unread, ...cardIds.filter(id => read.has(String(id)))];

  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i);
    hash |= 0;
  }
  const start = Math.abs(hash) % Math.max(1, pool.length);
  const picks = [];
  for (let i = 0; i < pool.length && picks.length < (nhi?.personalDigest?.digestSize?.dailyCount || 3); i++) {
    const id = pool[(start + i) % pool.length];
    if (!picks.includes(id)) picks.push(id);
  }
  return { date: today, cardIds: picks, unreadCount: unread.length };
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

function renderOnboardingWizard(nhi, step = 0) {
  const el = document.getElementById('lens-onboarding-wrap');
  const onboarding = nhi?.personalDigest?.onboarding;
  if (!el || !onboarding?.questions?.length) return;

  const questions = onboarding.questions;
  const answers = getOnboardingAnswers();
  const q = questions[step];
  const total = questions.length;

  el.hidden = false;
  el.innerHTML = `
    <div class="lens-onboarding">
      <div class="lens-onboarding-header">
        <h3>${onboarding.title}</h3>
        <p class="section-intro">${onboarding.description}</p>
        <div class="lens-progress"><div class="lens-progress-bar" style="width:${((step + 1) / total) * 100}%"></div></div>
        <p class="lens-step-label">Question ${step + 1} of ${total}</p>
      </div>
      <fieldset class="lens-question">
        <legend>${escapeHtml(q.question)}</legend>
        ${q.options.map(o => `
          <label class="lens-option">
            <input type="radio" name="onboard-q" value="${o.id}" ${answers[q.id] === o.id ? 'checked' : ''}>
            <span>${escapeHtml(o.label)}</span>
          </label>`).join('')}
      </fieldset>
      <div class="lens-onboarding-nav">
        ${step > 0 ? '<button type="button" class="lens-nav-btn" id="lens-prev">← Back</button>' : '<span></span>'}
        <button type="button" class="lens-apply-btn" id="lens-next" disabled>${step < total - 1 ? 'Next →' : 'See my concerns →'}</button>
      </div>
    </div>`;

  const radios = el.querySelectorAll('input[name="onboard-q"]');
  const nextBtn = document.getElementById('lens-next');

  const syncNext = () => {
    nextBtn.disabled = !el.querySelector('input[name="onboard-q"]:checked');
  };
  radios.forEach(r => r.addEventListener('change', syncNext));
  syncNext();

  document.getElementById('lens-prev')?.addEventListener('click', () => {
    renderOnboardingWizard(nhi, step - 1);
  });

  nextBtn.addEventListener('click', () => {
    const picked = el.querySelector('input[name="onboard-q"]:checked');
    if (!picked) return;
    answers[q.id] = picked.value;
    saveOnboardingAnswers(answers);

    if (step < total - 1) {
      renderOnboardingWizard(nhi, step + 1);
    } else {
      el.hidden = true;
      const suggested = scoreConcernsFromOnboarding(nhi);
      if (!suggested.length) suggested.push('general_defense');
      renderConcernPicker(nhi.personalDigest, suggested.slice(0, MAX_CONCERNS), suggested, true);
      document.getElementById('lens-concern-picker').hidden = false;
    }
  });
}

function renderConcernFollowUps(digest, concernIds) {
  const el = document.getElementById('lens-followup-wrap');
  if (!el) return;

  const withFollowUp = concernIds
    .map(id => digest.concerns.find(c => c.id === id))
    .filter(c => c?.followUp);

  if (!withFollowUp.length) {
    el.hidden = true;
    return;
  }

  const followAnswers = getFollowUpAnswers();
  el.hidden = false;
  el.innerHTML = `
    <h3 class="lens-followup-title">Refine your digest</h3>
    <p class="section-intro">One question per concern — NHI boosts the most relevant cards.</p>
    <div class="lens-followup-grid">
      ${withFollowUp.map(c => `
        <fieldset class="lens-followup-field" data-concern="${c.id}">
          <legend><span class="lens-followup-concern" style="color:${c.color}">${escapeHtml(c.label)}</span></legend>
          <p class="lens-followup-q">${escapeHtml(c.followUp.question)}</p>
          ${c.followUp.options.map(o => `
            <label class="lens-option lens-option-compact">
              <input type="radio" name="followup-${c.id}" value="${o.id}" ${followAnswers[c.id] === o.id ? 'checked' : ''}>
              <span>${escapeHtml(o.label)}</span>
            </label>`).join('')}
        </fieldset>`).join('')}
    </div>`;

  el.querySelectorAll('.lens-followup-field').forEach(field => {
    field.querySelectorAll('input[type=radio]').forEach(radio => {
      radio.addEventListener('change', () => {
        saveFollowUpAnswer(field.dataset.concern, radio.value);
        const corpus = window._corpusData;
        const nhi = window._nhiData;
        const saved = getSavedConcerns();
        if (saved?.length && corpus && nhi) {
          const result = computePersonalDigest(saved, nhi, corpus);
          renderDailyThree(result, corpus, nhi);
          renderDigestResult(result, corpus, nhi);
        }
      });
    });
  });
}

function renderConcernPicker(digest, selected, suggested = [], fromOnboarding = false) {
  const el = document.getElementById('lens-concern-picker');
  if (!el) return;
  const sel = new Set(selected || []);

  el.innerHTML = `
    ${fromOnboarding ? '<p class="lens-suggested-banner">NHI suggested these based on your answers — adjust if needed.</p>' : ''}
    <p class="lens-picker-hint">Select up to ${MAX_CONCERNS} concerns — NHI builds your digest from 645 cards, not all at once.</p>
    <div class="lens-concerns-grid">
      ${digest.concerns.map(c => `
        <button type="button" class="lens-concern-btn${sel.has(c.id) ? ' selected' : ''}${suggested.includes(c.id) ? ' suggested' : ''}"
          data-concern="${c.id}" style="--concern-color:${c.color}">
          ${suggested.includes(c.id) ? '<span class="lens-suggested-tag">NHI pick</span>' : ''}
          <span class="lens-concern-label">${escapeHtml(c.label)}</span>
          <span class="lens-concern-desc">${escapeHtml(c.description)}</span>
          <span class="lens-concern-meta">${c.cardCount} routed cards</span>
        </button>`).join('')}
    </div>
    <div class="lens-picker-actions">
      <button type="button" class="lens-nav-btn" id="lens-retake-quiz">Retake quiz</button>
      <button type="button" class="lens-apply-btn" id="lens-apply" ${sel.size ? '' : 'disabled'}>
        Build my digest (${sel.size || 0} concern${sel.size === 1 ? '' : 's'})
      </button>
    </div>`;

  el.querySelectorAll('.lens-concern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.concern;
      if (sel.has(id)) sel.delete(id);
      else if (sel.size < MAX_CONCERNS) sel.add(id);
      renderConcernPicker(digest, [...sel], suggested, fromOnboarding);
    });
  });

  document.getElementById('lens-retake-quiz')?.addEventListener('click', () => {
    localStorage.removeItem(LENS_ONBOARDING_DONE_KEY);
    localStorage.removeItem(LENS_ONBOARDING_KEY);
    localStorage.removeItem(LENS_STORAGE_KEY);
    localStorage.removeItem(LENS_FOLLOWUP_KEY);
    renderPersonalLens(window._corpusData, window._nhiData);
  });

  document.getElementById('lens-apply')?.addEventListener('click', () => {
    if (!sel.size) return;
    saveConcerns([...sel]);
    renderPersonalLens(window._corpusData, window._nhiData);
  });
}

function renderDailyThree(result, corpus, nhi) {
  const wrap = document.getElementById('lens-daily-wrap');
  const el = document.getElementById('lens-daily-three');
  if (!wrap || !el) return;

  const daily = getDailyThree(result.cardIds, nhi);
  const cardsById = Object.fromEntries((corpus.cards || []).map(c => [c.id, c]));
  const read = getReadCards();

  wrap.hidden = false;
  el.innerHTML = `
    <div class="lens-daily-header">
      <div>
        <h3>Today's 3 Cards</h3>
        <p class="lens-digest-meta">${daily.date} · ${daily.unreadCount} unread in your digest · ~3 min read</p>
      </div>
      <button type="button" class="lens-nav-btn" id="lens-refresh-daily">Shuffle today</button>
    </div>
    <div class="lens-daily-cards">
      ${daily.cardIds.map((id, i) => {
        const c = cardsById[id];
        if (!c) return '';
        const done = read.has(String(id));
        return `
          <article class="lens-daily-card${done ? ' lens-read' : ''}">
            <span class="lens-daily-num">${i + 1}</span>
            <div>
              <h4>${escapeHtml(c.title)}</h4>
              <p>${escapeHtml(c.content.length > 180 ? c.content.slice(0, 180) + '…' : c.content)}</p>
              <div class="lens-digest-actions">
                <button type="button" class="hva-open-btn lens-open-corpus" data-card-id="${id}">Open</button>
                <button type="button" class="lens-mark-read" data-card-id="${id}" ${done ? 'disabled' : ''}>
                  ${done ? '✓ Done' : 'Mark done'}
                </button>
              </div>
            </div>
          </article>`;
      }).join('')}
    </div>`;

  el.querySelectorAll('.lens-open-corpus').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.navigateToCards) window.navigateToCards({ cardId: Number(btn.dataset.cardId), highlightOnly: true });
    });
  });

  el.querySelectorAll('.lens-mark-read').forEach(btn => {
    btn.addEventListener('click', () => {
      markCardRead(Number(btn.dataset.cardId));
      renderDailyThree(result, corpus, nhi);
      renderDigestResult(result, corpus, nhi);
    });
  });

  document.getElementById('lens-refresh-daily')?.addEventListener('click', () => {
    const extra = Date.now() % 997;
    const shuffled = [...result.cardIds].sort((a, b) => ((a * extra) % 97) - ((b * extra) % 97));
    renderDailyThree({ ...result, cardIds: shuffled }, corpus, nhi);
  });
}

function exportPrintableBrief(result, corpus, nhi) {
  const cardsById = Object.fromEntries((corpus.cards || []).map(c => [c.id, c]));
  const tierMap = typeof getNhiTierMap === 'function' ? getNhiTierMap(nhi) : {};
  const concernLabels = result.concernIds.map(id =>
    nhi.personalDigest.concerns.find(c => c.id === id)?.label || id
  ).join(' · ');
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const path = result.path;

  const cardsHtml = result.cardIds.map((id, i) => {
    const c = cardsById[id];
    if (!c) return '';
    const tier = tierMap[id];
    const steps = c.framework_steps?.length
      ? `<ol>${c.framework_steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>` : '';
    return `
      <article class="brief-card">
        <div class="brief-meta">#${i + 1} · Card ${c.id}${tier ? ` · Tier ${tier}` : ''} · ${escapeHtml(c.kind)} · ${escapeHtml(c.category)}</div>
        <h2>${escapeHtml(c.title)}</h2>
        <p>${escapeHtml(c.content)}</p>
        ${c.reasoning ? `<p class="brief-reasoning"><em>${escapeHtml(c.reasoning)}</em></p>` : ''}
        ${steps}
        <p class="brief-source">Source: ${escapeHtml(c.video_title)}</p>
      </article>`;
  }).join('');

  const pathHtml = path ? `
    <section class="brief-path">
      <h2>Recommended Path: ${escapeHtml(path.title)}</h2>
      <p>${escapeHtml(path.description)} · ~${path.minutes} min</p>
      <ol>${(path.steps || []).map(s => `<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.why)}</li>`).join('')}</ol>
    </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>DarkLense Personal Brief — ${today}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; color: #111; line-height: 1.6; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; font-family: system-ui, sans-serif; }
  .brief-header { border-bottom: 2px solid #111; padding-bottom: 1rem; margin-bottom: 1.5rem; }
  .brief-sub { font-size: 0.9rem; color: #444; }
  .brief-disclaimer { font-size: 0.75rem; color: #666; background: #f5f5f5; padding: 0.75rem; margin: 1rem 0; border-left: 3px solid #c00; }
  .brief-card { page-break-inside: avoid; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #ddd; }
  .brief-meta { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-family: system-ui, sans-serif; }
  .brief-card h2 { font-size: 1.1rem; margin: 0.35rem 0; font-family: system-ui, sans-serif; }
  .brief-reasoning { font-size: 0.9rem; color: #333; }
  .brief-source { font-size: 0.75rem; color: #888; margin-top: 0.5rem; }
  .brief-path { margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #111; }
  .brief-path h2 { font-size: 1rem; font-family: system-ui, sans-serif; }
  .brief-path ol { font-size: 0.9rem; }
  .no-print { margin-bottom: 1rem; font-family: system-ui, sans-serif; }
  @media print { .no-print { display: none; } body { padding: 0.5in; } }
</style>
</head><body>
<div class="no-print">
  <button onclick="window.print()" style="padding:0.5rem 1rem;font-weight:600;cursor:pointer">Print / Save as PDF</button>
</div>
<header class="brief-header">
  <h1>DarkLense — Personal Defensive Literacy Brief</h1>
  <p class="brief-sub">${today} · ${result.cardIds.length} cards · Concerns: ${escapeHtml(concernLabels)}</p>
  <p class="brief-disclaimer"><strong>Educational use only.</strong> Paraphrased synthesis — not professional advice. Defensive literacy, not a coercion toolkit. Source videos attributed per card. © AlphaOne LLC · Apache-2.0</p>
</header>
${cardsHtml}
${pathHtml}
<footer class="brief-disclaimer" style="margin-top:2rem">
  Generated from DarkLense personal digest · <a href="https://alphaonedev.github.io/DarkLense/">alphaonedev.github.io/DarkLense</a>
</footer>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Allow pop-ups to export your printable brief.');
    return;
  }
  win.document.write(html);
  win.document.close();
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

  const readCount = result.cardIds.filter(id => read.has(String(id))).length;

  el.innerHTML = `
    <div class="lens-digest-header">
      <div>
        <h3>Your Personal Digest</h3>
        <p class="lens-digest-meta">${result.cardIds.length} cards · ${readCount} read · ${escapeHtml(concernLabels)}</p>
      </div>
      <div class="lens-digest-header-actions">
        <button type="button" class="lens-nav-btn" id="lens-export-brief">Print / PDF brief</button>
        <button type="button" class="filter-clear-btn" id="lens-change-concerns">Change concerns</button>
      </div>
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
                <span class="k-badge k-badge-kind">${escapeHtml(c.kind)}</span>
                <span class="k-badge k-badge-cat">${escapeHtml(c.category)}</span>
              </div>
              <h4>${escapeHtml(c.title)}</h4>
              <p>${escapeHtml(c.content.length > 220 ? c.content.slice(0, 220) + '…' : c.content)}</p>
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

  document.getElementById('lens-export-brief')?.addEventListener('click', () => {
    exportPrintableBrief(result, corpus, nhi);
  });

  document.getElementById('lens-change-concerns')?.addEventListener('click', () => {
    localStorage.removeItem(LENS_STORAGE_KEY);
    const suggested = scoreConcernsFromOnboarding(nhi);
    renderConcernPicker(nhi.personalDigest, suggested.slice(0, MAX_CONCERNS), suggested, true);
    document.getElementById('lens-concern-picker').hidden = false;
    document.getElementById('lens-digest-wrap').hidden = true;
    document.getElementById('lens-daily-wrap').hidden = true;
    document.getElementById('lens-path-wrap').hidden = true;
    document.getElementById('lens-followup-wrap').hidden = true;
  });

  el.querySelectorAll('.lens-open-corpus').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.navigateToCards) window.navigateToCards({ cardId: Number(btn.dataset.cardId), highlightOnly: true });
    });
  });

  el.querySelectorAll('.lens-mark-read').forEach(btn => {
    btn.addEventListener('click', () => {
      markCardRead(Number(btn.dataset.cardId));
      renderDailyThree(result, corpus, nhi);
      renderDigestResult(result, corpus, nhi);
    });
  });

  document.getElementById('lens-view-all-mine')?.addEventListener('click', () => {
    if (window.navigateToCards) window.navigateToCards({ cardIds: result.cardIds.map(String) });
  });
}

function renderLearningPath(path) {
  const el = document.getElementById('lens-learning-path');
  if (!el || !path) return;

  el.innerHTML = `
    <h3>Recommended path: ${escapeHtml(path.title)}</h3>
    <p class="section-intro">${escapeHtml(path.description)} · ~${path.minutes} min · ${path.stepCount} steps</p>
    <ol class="lens-path-steps">
      ${(path.steps || []).map(s => `
        <li>
          <button type="button" class="lens-path-step-btn" data-card-id="${s.cardId}">
            <span class="lens-path-order">${s.order}</span>
            <span class="lens-path-title">${escapeHtml(s.title)}</span>
            <span class="lens-path-why">${escapeHtml(s.why)}</span>
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
      } else if (window.navigateToCards) {
        window.navigateToCards({ cardId: Number(btn.dataset.cardId), highlightOnly: true });
      }
    });
  });
}

function renderPersonalLens(corpus, nhi) {
  const digest = nhi?.personalDigest;
  if (!digest) return;

  renderMethodology(digest);

  const onboardingEl = document.getElementById('lens-onboarding-wrap');
  const picker = document.getElementById('lens-concern-picker');
  const resultWrap = document.getElementById('lens-digest-wrap');
  const dailyWrap = document.getElementById('lens-daily-wrap');
  const pathWrap = document.getElementById('lens-path-wrap');
  const followWrap = document.getElementById('lens-followup-wrap');

  const saved = getSavedConcerns();

  if (!isOnboardingComplete()) {
    if (picker) picker.hidden = true;
    if (resultWrap) resultWrap.hidden = true;
    if (dailyWrap) dailyWrap.hidden = true;
    if (pathWrap) pathWrap.hidden = true;
    if (followWrap) followWrap.hidden = true;
    renderOnboardingWizard(nhi, 0);
    return;
  }

  if (onboardingEl) onboardingEl.hidden = true;

  if (!saved?.length) {
    if (picker) picker.hidden = false;
    if (resultWrap) resultWrap.hidden = true;
    if (dailyWrap) dailyWrap.hidden = true;
    if (pathWrap) pathWrap.hidden = true;
    if (followWrap) followWrap.hidden = true;
    const suggested = scoreConcernsFromOnboarding(nhi);
    renderConcernPicker(digest, suggested.slice(0, MAX_CONCERNS), suggested, true);
    return;
  }

  if (picker) picker.hidden = true;
  if (resultWrap) resultWrap.hidden = false;
  if (pathWrap) pathWrap.hidden = false;

  const result = computePersonalDigest(saved, nhi, corpus);
  renderConcernFollowUps(digest, saved);
  renderDailyThree(result, corpus, nhi);
  renderDigestResult(result, corpus, nhi);
  renderLearningPath(result.path);
}

window.renderPersonalLens = renderPersonalLens;
window.computePersonalDigest = computePersonalDigest;
window.exportPrintableBrief = exportPrintableBrief;