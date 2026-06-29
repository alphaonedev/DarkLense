/** DarkLense SVG diagrams and Chart.js visualizations */

const DL_SVG = {
  lensModel: `<svg viewBox="0 0 400 280" class="dl-svg" role="img" aria-label="DarkLense model">
    <defs>
      <radialGradient id="lensGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.05"/>
      </radialGradient>
    </defs>
    <text x="200" y="22" text-anchor="middle" fill="#a855f7" font-size="12" font-weight="700">DARKLENSE — THREE PILLARS</text>
    <ellipse cx="200" cy="150" rx="140" ry="90" fill="url(#lensGrad)" stroke="#a855f7" stroke-width="1.5" opacity="0.8"/>
    <circle cx="200" cy="150" r="35" fill="#12151c" stroke="#a855f7" stroke-width="2"/>
    <text x="200" y="147" text-anchor="middle" fill="#e8edf5" font-size="9" font-weight="700">YOU</text>
    <text x="200" y="158" text-anchor="middle" fill="#8b9cb8" font-size="7">awareness</text>
    <text x="75" y="100" fill="#8b5cf6" font-size="10" font-weight="700">PSYCHOLOGY</text>
    <text x="60" y="115" fill="#8b9cb8" font-size="8">identity · emotion</text>
    <text x="60" y="126" fill="#8b9cb8" font-size="8">persuasion · frames</text>
    <text x="310" y="95" fill="#ef4444" font-size="10" font-weight="700">PSY WAR</text>
    <text x="295" y="110" fill="#8b9cb8" font-size="8">psyops · propaganda</text>
    <text x="295" y="121" fill="#8b9cb8" font-size="8">division · fear</text>
    <text x="155" y="235" fill="#3b82f6" font-size="10" font-weight="700">INFO OPS</text>
    <text x="140" y="250" fill="#8b9cb8" font-size="8">media · algorithms · narrative</text>
    <line x1="170" y1="130" x2="100" y2="105" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <line x1="230" y1="125" x2="300" y2="100" stroke="#ef4444" stroke-width="1.5" opacity="0.6"/>
    <line x1="200" y1="185" x2="200" y2="220" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
    <text x="200" y="272" text-anchor="middle" fill="#8b9cb8" font-size="9">See influence · Resist manipulation · Attribute sources</text>
  </svg>`,

  defenseStack: `<svg viewBox="0 0 400 220" class="dl-svg" role="img" aria-label="Defense stack">
    <text x="200" y="18" text-anchor="middle" fill="#10b981" font-size="11" font-weight="700">DEFENSIVE LITERACY STACK</text>
    ${[
      { y: 40, label: '1 DETECT', sub: 'Psyop patterns · media literacy', color: '#ef4444' },
      { y: 85, label: '2 DECODE', sub: 'Frames · triggers · influence formula', color: '#f59e0b' },
      { y: 130, label: '3 DEFEND', sub: 'Boundaries · de-escalation · ethics', color: '#3b82f6' },
      { y: 175, label: '4 DISCIPLINE', sub: 'Tech outcomes · self-authorship', color: '#10b981' },
    ].map(s => `
      <rect x="40" y="${s.y}" width="320" height="36" rx="8" fill="${s.color}18" stroke="${s.color}" stroke-width="1.5"/>
      <text x="60" y="${s.y + 16}" fill="${s.color}" font-size="10" font-weight="700">${s.label}</text>
      <text x="60" y="${s.y + 28}" fill="#8b9cb8" font-size="8">${s.sub}</text>
    `).join('')}
    <text x="200" y="210" text-anchor="middle" fill="#8b9cb8" font-size="8">NHI-assessed priority — recognition before technique</text>
  </svg>`,

  psyopFlow: `<svg viewBox="0 0 420 200" class="dl-svg" role="img" aria-label="Psyop attack flow">
    <text x="210" y="16" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="700">INFORMATION OPERATION ATTACK CHAIN</text>
    ${[
      { x: 30, label: 'Narrative\ninject' },
      { x: 110, label: 'Algorithm\namplify' },
      { x: 190, label: 'Artificial\nconsensus' },
      { x: 270, label: 'Emotional\ntrigger' },
      { x: 350, label: 'Division\n& action' },
    ].map((s, i) => `
      <rect x="${s.x}" y="50" width="70" height="50" rx="6" fill="#1a1f2a" stroke="#ef4444" stroke-width="1.5"/>
      <text x="${s.x + 35}" y="72" text-anchor="middle" fill="#fca5a5" font-size="8" font-weight="600">${s.label.split('\n')[0]}</text>
      <text x="${s.x + 35}" y="84" text-anchor="middle" fill="#fca5a5" font-size="8">${s.label.split('\n')[1] || ''}</text>
      ${i < 4 ? `<line x1="${s.x + 70}" y1="75" x2="${s.x + 88}" y2="75" stroke="#ef4444" stroke-width="2" marker-end="url(#dlArr)"/>` : ''}
    `).join('')}
    <rect x="30" y="120" width="360" height="36" rx="6" fill="rgba(16,185,129,0.1)" stroke="#10b981"/>
    <text x="210" y="138" text-anchor="middle" fill="#10b981" font-size="9" font-weight="700">DEFENSE: Pattern map · Outcome-based tech · Source attribution</text>
    <text x="210" y="152" text-anchor="middle" fill="#8b9cb8" font-size="8">Break chain at detection — not after division</text>
    <defs><marker id="dlArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#ef4444"/></marker></defs>
  </svg>`
};

function injectDiagrams() {
  const map = {
    'dl-lens-diagram': DL_SVG.lensModel,
    'dl-defense-diagram': DL_SVG.defenseStack,
    'dl-psyop-diagram': DL_SVG.psyopFlow,
  };
  Object.entries(map).forEach(([id, svg]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg;
  });
}

function renderPillarCards(nhi) {
  const el = document.getElementById('pillar-grid');
  if (!el || !nhi?.pillars) return;
  el.innerHTML = nhi.pillars.map(p => `
    <div class="pillar-card" style="--pillar-color:${p.color}">
      <div class="pillar-count">${p.cardCount}</div>
      <h3>${p.name}</h3>
      <p>${p.description}</p>
    </div>`).join('');
}

function renderDefenseStack(nhi) {
  const el = document.getElementById('defense-stack-list');
  if (!el || !nhi?.defenseStack) return;
  el.innerHTML = `<ul class="stack-list">${nhi.defenseStack.map(s => {
    const preview = (s.linkedCards || []).slice(0, 4);
    const more = (s.cards || 0) - preview.length;
    return `
    <li class="stack-item">
      <span class="stack-pri">${s.priority}</span>
      <div class="stack-body">
        <div class="stack-head">
          <strong>${s.layer}</strong> — ${s.focus}
          <a href="#corpus" class="stack-card-link" data-stack-priority="${s.priority}">
            ${s.cards} related card${s.cards === 1 ? '' : 's'} →
          </a>
        </div>
        ${preview.length ? `<div class="stack-linked-cards">${preview.map(c =>
          `<a href="#corpus" class="stack-card-chip" data-card-id="${c.id}" data-category="${c.category}" title="${c.category}">${c.title}</a>`
        ).join('')}${more > 0 ? `<a href="#corpus" class="stack-card-more" data-stack-priority="${s.priority}">+${more} more</a>` : ''}</div>` : ''}
      </div>
    </li>`;
  }).join('')}</ul>`;

  el.querySelectorAll('[data-stack-priority]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const layer = nhi.defenseStack.find(x => x.priority === Number(a.dataset.stackPriority));
      if (layer && window.navigateToCards) {
        window.navigateToCards({
          cardIds: layer.cardIds,
          categories: layer.categories,
        });
      }
    });
  });
  el.querySelectorAll('[data-card-id]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (window.navigateToCards) {
        window.navigateToCards({
          cardId: Number(a.dataset.cardId),
          category: a.dataset.category || 'all',
          highlightOnly: true,
        });
      }
    });
  });
}

function renderCharts(nhi, corpus) {
  const kinds = nhi?.kindDistribution || {};
  const ctx1 = document.getElementById('kindChart');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: Object.keys(kinds).map(k => k.replace('_', ' ')),
        datasets: [{
          data: Object.values(kinds),
          backgroundColor: ['#a855f7', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280'],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#8b9cb8', font: { size: 12 } } } } },
    });
  }

  const ctx2 = document.getElementById('pillarChart');
  if (ctx2 && nhi?.pillars) {
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: nhi.pillars.map(p => p.name),
        datasets: [{
          data: nhi.pillars.map(p => p.cardCount),
          backgroundColor: nhi.pillars.map(p => p.color),
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: '#2a3344' }, ticks: { color: '#8b9cb8' } },
          x: { grid: { display: false }, ticks: { color: '#8b9cb8', font: { size: 11 } } },
        },
      },
    });
  }

  const ctx3 = document.getElementById('categoryChart');
  if (ctx3 && nhi?.topCategories) {
    const top = nhi.topCategories.slice(0, 15);
    new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: top.map(c => c.category),
        datasets: [{ data: top.map(c => c.count), backgroundColor: '#a855f7', borderRadius: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#2a3344' }, ticks: { color: '#8b9cb8' } },
          y: { ticks: { color: '#8b9cb8', font: { size: 10 } } },
        },
      },
    });
  }
}

function renderFrameworksTable(nhi) {
  const el = document.getElementById('frameworks-table');
  if (!el || !nhi?.topFrameworks) return;
  el.innerHTML = `<table class="data-table"><thead><tr><th>Framework</th><th>Category</th><th>Pillar</th><th>Steps</th></tr></thead><tbody>
    ${nhi.topFrameworks.map(f => `<tr>
      <td>${f.title}</td><td>${f.category}</td>
      <td>${f.pillar.replace(/_/g, ' ')}</td><td>${f.steps}</td></tr>`).join('')}
  </tbody></table>`;
}

function renderWarnings(nhi) {
  const el = document.getElementById('warnings-grid');
  if (!el || !nhi?.criticalWarnings) return;
  el.innerHTML = nhi.criticalWarnings.map(w => `
    <div class="k-card" style="border-left:3px solid var(--psywar)">
      <div class="k-card-meta"><span class="k-badge k-badge-kind">warning</span><span class="k-badge">${w.category}</span></div>
      <h4>${w.title}</h4>
      <p>${w.content}${w.content.length >= 200 ? '…' : ''}</p>
    </div>`).join('');
}

function renderVideosTable(corpus) {
  const el = document.getElementById('videos-table');
  if (!el || !corpus?.videos) return;
  const countByVideo = {};
  (corpus.cards || []).forEach(c => {
    countByVideo[c.video_id] = (countByVideo[c.video_id] || 0) + 1;
  });
  el.innerHTML = `<table class="data-table"><thead><tr><th>Video</th><th>Cards</th><th>Link</th></tr></thead><tbody>
    ${corpus.videos.map(v => {
      const n = v.card_count || countByVideo[v.video_id] || 0;
      return `<tr>
      <td>${v.video_title}</td><td>${n}</td>
      <td><a href="${v.video_url}" target="_blank" rel="noopener noreferrer">YouTube</a></td></tr>`;
    }).join('')}
  </tbody></table>`;
}

function renderExecutive(nhi) {
  const el = document.getElementById('nhi-executive');
  if (el && nhi?.executiveSummary) el.innerHTML = `<p>${nhi.executiveSummary}</p>`;
}

function renderEthicalUse(nhi) {
  const el = document.getElementById('ethical-use');
  if (!el || !nhi?.ethicalUse) return;
  const e = nhi.ethicalUse;
  el.innerHTML = `
    <p>${e.note}</p>
    <p style="margin-top:0.75rem"><strong>Permitted:</strong> ${e.permitted.join(' · ')}</p>
    <p style="margin-top:0.5rem"><strong>Prohibited:</strong> ${e.prohibited.join(' · ')}</p>`;
}

function renderAllVisualizations(corpus, nhi) {
  injectDiagrams();
  renderExecutive(nhi);
  renderPillarCards(nhi);
  renderDefenseStack(nhi);
  renderFrameworksTable(nhi);
  renderWarnings(nhi);
  renderVideosTable(corpus);
  renderEthicalUse(nhi);
  renderCharts(nhi, corpus);
}