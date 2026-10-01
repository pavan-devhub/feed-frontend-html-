// Product 360 - the Farm-to-Port compliance tree (segment -> layer -> category -> division -> part)
// from assets/js/data/product-360-data.js. Login required.
//
// Interaction (same as the React page):
//  * segment pills / journey nodes pick the segment (and reset the layer to PRODUCT); layer pills
//    pick PRODUCT or ENTERPRISE. A new segment/layer shows its categories all collapsed.
//  * category and division headers toggle open/closed.
//  * the search box searches every part of every segment and layer; while it has text the tabs are
//    disabled, a status line shows the match count, and every matching category/division is shown
//    expanded (re-expanded whenever the search text changes).
import { initPage } from '../core/page.js';
import { html, render, on, cx, toElement } from '../core/dom.js';
import {
  TREE, SEGMETA, GRAD, ICONS, SEG_ORDER, LAYER_ORDER, FLAGS,
} from '../data/product-360-data.js';

const session = initPage({ page: 'product360', access: 'user' });

const tagIcon = (tag) => ICONS[tag] || '▪️';
const gradFor = (seg, layer) => GRAD[`${seg}|${layer}`];

const STATUS_BADGES = {
  '✅': ['OK', 'b-ok'],
  '🆕': ['NEW', 'b-ok'],
  '🔬': ['LAB', 'b-ok'],
  '🗺️': ['MAP', 'b-ok'],
  '🟠': ['MED', 'b-med'],
  '🟡': ['LOW', 'b-low'],
  '🔴': ['CRIT', 'b-crit'],
};

function statusBadge(tag) {
  const badge = STATUS_BADGES[(tag || '').trim()];
  return badge ? html`<span class="badge ${badge[1]}">${badge[0]}</span>` : null;
}

const partSearchBlob = (p) => `${p.id} ${p.title} ${p.source || ''}`.toLowerCase();

function partRowHtml(seg, layer, part, hidden) {
  const flag = FLAGS[`${seg}|${layer}|${part.id}`];
  // No indentation inside - a search can render all 998 rows on every keystroke.
  return html`<div class="${cx('part-row', hidden && 'hide')}" data-search="${partSearchBlob(part)}"><div class="p-ic">${tagIcon(part.tag)}</div><div class="p-id">${part.id}</div><div class="p-title">${part.title}${flag ? html`<div class="overlap-flag">⚠ ${flag}</div>` : null}</div><div class="p-src">${part.source || ''}</div><div class="p-status">${statusBadge(part.status)}</div></div>`;
}

// query = the lower-cased search text ('' when not searching). Returns null when searching and
// nothing in the division matches.
function divBlockHtml(seg, layer, div, g, query) {
  const matchParts = div.parts.map((part) => ({
    part,
    match: !query || partSearchBlob(part).includes(query),
  }));
  if (query && !matchParts.some((m) => m.match)) return null;
  const open = Boolean(query);

  return html`
    <div class="${cx('div-block', open && 'open')}" style="--accent: ${g.accent};">
      <div class="div-head">
        <span class="div-ic">${tagIcon(div.tag)}</span>
        <span class="div-txt"><span class="div-num">DIV ${div.num}</span>${div.name}</span>
        <span class="div-count">${div.parts.length} Parts</span>
        <span class="chevron">▶</span>
      </div>
      <div class="div-body">
        ${matchParts.map(({ part, match }) => partRowHtml(seg, layer, part, query ? !match : false))}
      </div>
    </div>`;
}

function catCardHtml(seg, layer, cat, g, query) {
  const visibleDivs = cat.divs.filter((dv) => {
    if (!query) return true;
    return dv.parts.some((p) => partSearchBlob(p).includes(query));
  });
  if (query && visibleDivs.length === 0) return null;
  const open = Boolean(query);

  return html`
    <div class="${cx('cat-card', open && 'open')}">
      <div class="cat-head" style="background: linear-gradient(120deg,${g.g1},${g.g2});">
        <div class="cat-ic">${tagIcon(cat.tag)}</div>
        <div class="cat-txt">
          <div class="cat-num">CATEGORY ${cat.num}</div>
          <div class="cat-name">${cat.name}</div>
        </div>
        <div class="cat-count">${cat.count} Parts</div>
        <div class="chevron">▶</div>
      </div>
      <div class="cat-body">
        ${visibleDivs.map((dv) => divBlockHtml(seg, layer, dv, g, query))}
      </div>
    </div>`;
}

if (session) {
  const state = {
    activeSeg: SEG_ORDER[0],
    activeLayer: 'PRODUCT',
    query: '',
  };

  const journeyEl = document.getElementById('p360-journey');
  const statsEl = document.getElementById('p360-stats');
  const searchInput = document.getElementById('p360-search');
  const tabbar = document.getElementById('p360-tabbar');
  const contentEl = document.getElementById('p360-content');

  const grandTotal = SEG_ORDER.reduce((a, seg) => a + SEGMETA[seg].total, 0);
  const layerCount = (seg, layer) => TREE[seg][layer].reduce((a, c) => a + c.count, 0);

  const searchQuery = () => state.query.trim().toLowerCase();

  function countMatches(q) {
    let n = 0;
    SEG_ORDER.forEach((seg) => {
      LAYER_ORDER.forEach((layer) => {
        TREE[seg][layer].forEach((cat) => {
          cat.divs.forEach((dv) => {
            dv.parts.forEach((p) => {
              if (partSearchBlob(p).includes(q)) n += 1;
            });
          });
        });
      });
    });
    return n;
  }

  // --- Journey pipeline + stats (fixed - rendered once from the data) ---------------------------
  render(journeyEl, SEG_ORDER.map((seg) => {
    const g = gradFor(seg, 'PRODUCT');
    return html`
      <div class="jnode" data-seg="${seg}">
        <div class="jnode-ring" style="background: linear-gradient(135deg,${g.g1},${g.g2});">${SEGMETA[seg].icon}</div>
        <div class="jnode-label">${SEGMETA[seg].journey}</div>
        <div class="jnode-sub">${SEGMETA[seg].label}</div>
        <div class="jnode-badge" style="background: ${g.g2}cc;">${SEGMETA[seg].total} Parts</div>
      </div>`;
  }));

  render(statsEl, html`
    ${SEG_ORDER.map((seg) => {
      const g = gradFor(seg, 'PRODUCT');
      return html`
        <div class="stat-glass" style="border-top: 2px solid ${g.g2};">
          <div class="stat-num" style="color: ${g.g1};">${SEGMETA[seg].total}</div>
          <div class="stat-lbl">${SEGMETA[seg].icon} ${SEGMETA[seg].label}</div>
        </div>`;
    })}
    <div class="stat-glass stat-grand">
      <div class="stat-num">${grandTotal}</div>
      <div class="stat-lbl">Grand Total Parts</div>
    </div>`);

  // --- Segment tabs: rendered once, then updated in place (keeps hover/transition state) ---------
  render(tabbar, SEG_ORDER.map((seg) => html`
    <button type="button" class="seg-pill" data-seg="${seg}">
      <div class="pill-row1">
        <span class="pill-ic">${SEGMETA[seg].icon}</span>${SEGMETA[seg].label}
      </div>
      <div class="pill-row2">${SEGMETA[seg].sub}</div>
      <div class="pill-row3">${SEGMETA[seg].total} Parts</div>
    </button>`));

  // Search status line (shown above the tabs while searching) and layer sub-tabs (shown below the
  // tabs when not searching) are inserted / removed as the search text comes and goes.
  const statusEl = toElement(html`<div class="p360-search-status"></div>`);
  const subtabbar = toElement(html`
    <div class="p360-subtabbar">
      ${LAYER_ORDER.map((layer) => html`
        <button type="button" class="layer-pill" data-layer="${layer}">${layer === 'PRODUCT' ? '🌱' : '🏢'} ${layer} <span style="opacity: 0.75;"></span></button>`)}
    </div>`);

  let contentKey = null;

  function drawContent(q) {
    if (q) {
      render(contentEl, SEG_ORDER.map((seg) => LAYER_ORDER.map((layer) => {
        const g = gradFor(seg, layer);
        return html`
          <div style="margin-bottom: 28px;">
            <div class="p360-seg-label" style="color: ${g.g1};">${SEGMETA[seg].icon} ${seg} · ${layer}</div>
            ${TREE[seg][layer].map((cat) => catCardHtml(seg, layer, cat, g, q))}
          </div>`;
      })));
    } else {
      const g = gradFor(state.activeSeg, state.activeLayer);
      render(contentEl, TREE[state.activeSeg][state.activeLayer].map((cat) => catCardHtml(state.activeSeg, state.activeLayer, cat, g, '')));
    }
  }

  function draw() {
    const q = searchQuery();
    const searching = q.length > 0;

    // Status line
    if (searching) {
      statusEl.textContent = `Showing ${countMatches(q)} matching Part(s) across all 4 segments & both layers — tabs are temporarily disabled while searching.`;
      if (!statusEl.isConnected) tabbar.before(statusEl);
    } else {
      statusEl.remove();
    }

    // Segment tabs
    tabbar.querySelectorAll('.seg-pill').forEach((btn) => {
      const { seg } = btn.dataset;
      const g = gradFor(seg, 'PRODUCT');
      const active = !searching && state.activeSeg === seg;
      btn.className = cx('seg-pill', active && 'active', searching && 'disabled');
      btn.style.background = active ? `linear-gradient(120deg,${g.g1},${g.g2})` : '';
    });

    // Layer sub-tabs
    if (searching) {
      subtabbar.remove();
    } else {
      subtabbar.querySelectorAll('.layer-pill').forEach((btn) => {
        const { layer } = btn.dataset;
        const g = gradFor(state.activeSeg, layer);
        const active = state.activeLayer === layer;
        btn.className = cx('layer-pill', active && 'active');
        btn.style.background = active ? `linear-gradient(100deg,${g.g1},${g.g2})` : '';
        btn.querySelector('span').textContent = `(${layerCount(state.activeSeg, layer)})`;
      });
      if (!subtabbar.isConnected) tabbar.after(subtabbar);
    }

    // Content - rebuilt (everything collapsed, or everything matching expanded) only when what it
    // shows changes: another segment/layer, or different search text.
    const key = searching ? `search:${q}` : `view:${state.activeSeg}|${state.activeLayer}`;
    if (key !== contentKey) {
      contentKey = key;
      drawContent(q);
    }
  }

  function showSeg(seg) {
    state.activeSeg = seg;
    state.activeLayer = 'PRODUCT';
    window.scrollTo({ top: tabbar.offsetTop - 10, behavior: 'smooth' });
    draw();
  }

  on(journeyEl, 'click', '.jnode', (_event, node) => showSeg(node.dataset.seg));
  on(tabbar, 'click', '.seg-pill', (_event, btn) => {
    if (!searchQuery()) showSeg(btn.dataset.seg);
  });
  on(subtabbar, 'click', '.layer-pill', (_event, btn) => {
    state.activeLayer = btn.dataset.layer;
    draw();
  });

  // Category / division headers toggle in place.
  on(contentEl, 'click', '.cat-head', (_event, head) => head.closest('.cat-card').classList.toggle('open'));
  on(contentEl, 'click', '.div-head', (_event, head) => head.closest('.div-block').classList.toggle('open'));

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    draw();
  });

  // The browser may restore typed search text on back/forward - start from whatever is in the box.
  state.query = searchInput.value;
  draw();
}
