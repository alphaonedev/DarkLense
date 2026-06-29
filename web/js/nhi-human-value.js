/** DarkLense — AI NHI universal human value assessment UI */

const NHI_TIER_COLORS = { S: '#ef4444', A: '#f59e0b', B: '#3b82f6' };

function renderHumanValueExecutive(hva) {
  const el = document.getElementById('nhi-human-value-executive');
  if (!el || !hva?.executiveSummaryDistill) return;
  const d = hva.executiveSummaryDistill;
  el.innerHTML = `
    <div class="hva-distill">
      <p class="hva-lead">${d.lead}</p>
      <h4 class="hva-heading">${d.findingsTitle}</h4>
      <ul class="hva-list">${d.findings.map(t => `<li>${t}</li>`).join('')}</ul>
      <h4 class="hva-heading">${d.imperativeTitle}</h4>
      <ul class="hva-list hva-list-imperative">${d.imperative.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>`;
}

function renderHumanValueDiagram(hva) {
  const el = document.getElementById('hva-theme-diagram');
  if (!el || !hva?.themes) return;
  const themes = hva.themes.slice(0, 8);
  const cx = 200;
  const cy = 155;
  const r = 95;
  const nodes = themes.map((t, i) => {
    const angle = (i / themes.length) * Math.PI * 2 - Math.PI / 2;
    return { ...t, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  el.innerHTML = `<svg viewBox="0 0 400 320" class="dl-svg" role="img" aria-label="Universal human value themes">
    <text x="200" y="22" text-anchor="middle" fill="#a855f7" font-size="11" font-weight="700">NHI — UNIVERSAL VALUE THEMES (645 CARDS SCANNED)</text>
    <circle cx="${cx}" cy="${cy}" r="42" fill="#12151c" stroke="#a855f7" stroke-width="2"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#e8edf5" font-size="9" font-weight="700">ALL</text>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" fill="#8b9cb8" font-size="7">HUMANS</text>
    ${nodes.map(n => `
      <line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" stroke="${n.color}" stroke-width="1" opacity="0.35"/>
      <circle cx="${n.x}" cy="${n.y}" r="28" fill="${n.color}18" stroke="${n.color}" stroke-width="1.5"/>
      <text x="${n.x}" y="${n.y - 6}" text-anchor="middle" fill="${n.color}" font-size="7" font-weight="700">${n.label.split(' ').slice(0, 2).join(' ')}</text>
      <text x="${n.x}" y="${n.y + 6}" text-anchor="middle" fill="#8b9cb8" font-size="7">${n.cardCount}c</text>
    `).join('')}
    <text x="200" y="305" text-anchor="middle" fill="#8b9cb8" font-size="8">Tier S = essential · Tier A = high value · Click themes below to filter corpus</text>
  </svg>`;
}

function renderHumanValueThemes(hva) {
  const el = document.getElementById('hva-themes-grid');
  if (!el || !hva?.themes) return;
  el.innerHTML = hva.themes.map(t => `
    <button type="button" class="hva-theme-card" style="--theme-color:${t.color}" data-theme-id="${t.id}" data-categories="${(t.filterCategories || []).join(',')}">
      <span class="hva-theme-count">${t.cardCount}</span>
      <h4>${t.label}</h4>
      <p>${t.why}</p>
      <span class="hva-theme-cta">View top cards →</span>
    </button>`).join('');

  el.querySelectorAll('.hva-theme-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const categories = btn.dataset.categories.split(',').filter(Boolean);
      if (window.navigateToCards) {
        window.navigateToCards({ categories, highlightOnly: false });
      }
    });
  });
}

function renderTierCards(hva) {
  const sEl = document.getElementById('hva-tier-s');
  const aEl = document.getElementById('hva-tier-a');
  if (!hva?.tiers) return;

  const renderFeatured = (cards, tier) => cards.map(c => `
    <article class="hva-pick-card" style="--tier-color:${NHI_TIER_COLORS[tier]}">
      <div class="hva-pick-meta">
        <span class="hva-tier-badge tier-${tier}">Tier ${tier}</span>
        <span class="k-badge k-badge-kind">${c.kind}</span>
        <span class="hva-theme-tag">${c.theme}</span>
      </div>
      <h4><a href="#corpus" class="hva-card-link" data-card-id="${c.id}">${c.title}</a></h4>
      <p class="hva-verdict">${c.nhiVerdict}</p>
      <p class="hva-preview">${c.contentPreview}</p>
      <button type="button" class="hva-open-btn" data-card-id="${c.id}">Open in corpus →</button>
    </article>`).join('');

  if (sEl) {
    sEl.innerHTML = renderFeatured(hva.tiers.S.cards, 'S');
    wirePickLinks(sEl);
  }
  if (aEl) {
    aEl.innerHTML = `<table class="data-table hva-tier-table"><thead><tr>
      <th>Tier</th><th>Title</th><th>Theme</th><th>Kind</th><th>NHI verdict</th>
    </tr></thead><tbody>
      ${hva.tiers.A.cards.map(c => `<tr>
        <td><span class="hva-tier-badge tier-A">A</span></td>
        <td><a href="#corpus" class="hva-card-link" data-card-id="${c.id}">${c.title}</a></td>
        <td>${c.theme}</td><td>${c.kind}</td>
        <td class="hva-verdict-cell">${c.nhiVerdict}</td>
      </tr>`).join('')}
    </tbody></table>`;
    wirePickLinks(aEl);
  }
}

function wirePickLinks(root) {
  root.querySelectorAll('.hva-card-link, .hva-open-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const id = Number(el.dataset.cardId);
      if (window.navigateToCards) {
        window.navigateToCards({ cardId: id, highlightOnly: true });
      }
    });
  });
}

function renderHumanValueChart(hva) {
  const canvas = document.getElementById('hvaThemeChart');
  if (!canvas || !hva?.themes || typeof Chart === 'undefined') return;
  const themes = hva.themes.slice(0, 8);
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: themes.map(t => t.label.replace(' & ', '\n& ')),
      datasets: [{
        label: 'Cards in theme',
        data: themes.map(t => t.cardCount),
        backgroundColor: themes.map(t => t.color),
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#2a3344' }, ticks: { color: '#8b9cb8' } },
        y: { ticks: { color: '#8b9cb8', font: { size: 10 } } },
      },
    },
  });
}

function renderHumanValueAssessment(nhi) {
  const hva = nhi?.humanValueAssessment;
  if (!hva) return;

  const meta = document.getElementById('hva-meta');
  if (meta) {
    meta.textContent = `${hva.cardsAssessed} cards assessed · ${hva.stats.tierS} Tier S · ${hva.stats.tierA} Tier A · ${hva.stats.tierB} Tier B · ${hva.date}`;
  }

  renderHumanValueExecutive(hva);
  renderHumanValueDiagram(hva);
  renderHumanValueThemes(hva);
  renderTierCards(hva);
  renderHumanValueChart(hva);
}

window.renderHumanValueAssessment = renderHumanValueAssessment;
window.getNhiTopCardIds = function (nhi) {
  return new Set((nhi?.humanValueAssessment?.topCardIds || []).map(String));
};
window.getNhiTierMap = function (nhi) {
  const map = {};
  const hva = nhi?.humanValueAssessment;
  if (!hva?.tiers) return map;
  ['S', 'A', 'B'].forEach(tier => {
    (hva.tiers[tier]?.cards || []).forEach(c => { map[c.id] = tier; });
  });
  return map;
};