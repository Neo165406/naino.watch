// ==========================================================================
// XAINO — homepage logic (reads from Firestore: slides, products)
// Cart drawer + checkout + wishlist live in js/cart.js (shared with product.html)
// ==========================================================================

// ---------- DOM refs ----------
const productGrid = document.getElementById('productGrid');
const filterPills = document.getElementById('filterPills');
const catIconsRow = document.getElementById('catIconsRow');
const bestSellersSection = document.getElementById('bestSellersSection');
const bestSellersGrid = document.getElementById('bestSellersGrid');
const bsPrev = document.getElementById('bsPrev');
const bsNext = document.getElementById('bsNext');
const bsProgress = document.getElementById('bsProgress');
const promoWrap = document.getElementById('promoWrap');
const promoTrack = document.getElementById('promoTrack');
const promoPrev = document.getElementById('promoPrev');
const promoNext = document.getElementById('promoNext');
const promoProgress = document.getElementById('promoProgress');
const heroWatchWrap = document.getElementById('heroWatchWrap');
const heroArc = document.getElementById('heroArc');
const searchInput = document.getElementById('searchInput');

// ---------- Hero sparkles (dashed-arc decoration, Titan-style) ----------
const sparkSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/></svg>`;
(function renderHeroSparkles(){
  if (!heroArc) return;
  const positions = [
    { top: '48%', left: '0%' },
    { top: '12%', left: '16%' },
    { top: '-4%', left: '48%' },
    { top: '12%', left: '80%' },
    { top: '48%', left: '96%' }
  ];
  heroArc.innerHTML = positions.map(p => `<span class="spark" style="top:${p.top}; left:${p.left};">${sparkSVG}</span>`).join('');
})();

// ---------- horizontal-scroll helpers (shared by promo slider + best sellers carousel) ----------
function scrollByCard(track, dir){
  const card = track.querySelector(':scope > *');
  const amount = card ? card.getBoundingClientRect().width + 14 : track.clientWidth * 0.7;
  track.scrollBy({ left: dir * amount, behavior: 'smooth' });
}
function wireScrollProgress(track, fill){
  if (!fill) return;
  function update(){
    const fillPct = Math.max(15, Math.min(100, (track.clientWidth / track.scrollWidth) * 100));
    const scrollable = track.scrollWidth - track.clientWidth;
    const ratio = scrollable > 0 ? track.scrollLeft / scrollable : 0;
    const maxLeftPct = 100 - fillPct;
    fill.style.width = fillPct + '%';
    fill.style.transform = `translateX(${(ratio * maxLeftPct / fillPct) * 100}%)`;
  }
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}
function wireHearts(container){
  container.querySelectorAll('.heart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn.dataset.id, btn);
    });
  });
}

// ---------- PROMO BANNER SLIDER (swipeable portrait cards, only shows if a slide has an image) ----------
db.collection('slides').orderBy('order').get().then(snap => {
  const slides = snap.docs.map(d => d.data()).filter(s => s.active !== false && s.image);
  if (slides.length === 0) return; // promoWrap stays hidden — hero already covers the intro copy
  promoWrap.style.display = 'block';
  promoTrack.innerHTML = slides.map(s => `
    <div class="promo-card" style="background-image:url('${s.image}')">
      <div class="promo-card-text">
        ${s.headline ? `<div class="promo-card-eyebrow">${s.headline}</div>` : ''}
        ${s.body ? `<div class="promo-card-headline">${s.body}</div>` : ''}
      </div>
    </div>
  `).join('');
  if (slides.length > 1) {
    if (promoProgress) promoProgress.parentElement.style.display = 'block';
    wireScrollProgress(promoTrack, promoProgress);
  } else {
    promoPrev.style.display = 'none';
    promoNext.style.display = 'none';
    if (promoProgress) promoProgress.parentElement.style.display = 'none';
  }
  promoPrev.addEventListener('click', () => scrollByCard(promoTrack, -1));
  promoNext.addEventListener('click', () => scrollByCard(promoTrack, 1));
}).catch(err => console.error(err));

// ---------- PRODUCTS ----------
let products = [];
let activeBrand = 'All';
let activeCase = 'All';
let searchQuery = '';

if (searchInput) {
  const params = new URLSearchParams(location.search);
  const initialQ = params.get('q');
  if (initialQ) { searchInput.value = initialQ; searchQuery = initialQ; }
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    renderProducts();
  });
}

db.collection('products').orderBy('order').get().then(snap => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active !== false);
  renderFilterPills();
  renderCatIcons();
  renderBestSellers();
  renderProducts();
  renderHero();
}).catch(err => {
  console.error(err);
  productGrid.innerHTML = `<p class="empty-note">Couldn't load the collection — ${err.code || 'error'}: ${err.message}</p>`;
});

function renderHero(){
  if (!heroWatchWrap) return;
  const pick = products.find(p => p.featured && p.image) || products.find(p => p.image);
  heroWatchWrap.innerHTML = pick
    ? `<img src="${pick.image}" alt="${pick.name}">`
    : roundWatchSVG;
}

function renderFilterPills(){
  const brands = [...new Set(products.map(p => (p.brand || '').trim()).filter(Boolean))].sort();
  if (brands.length < 2) { filterPills.innerHTML = ''; return; }
  const all = ['All', ...brands];
  filterPills.innerHTML = all.map(b => `<button class="pill ${b === activeBrand ? 'active' : ''}" data-brand="${b}">${b}</button>`).join('');
  filterPills.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeBrand = btn.dataset.brand;
      filterPills.querySelectorAll('.pill').forEach(b => b.classList.toggle('active', b.dataset.brand === activeBrand));
      renderProducts();
    });
  });
}

// ---------- Category quick-links (Titan-style circles) — Round / Square case, Best Sellers, View All ----------
function renderCatIcons(){
  if (!catIconsRow) return;
  const caseGroups = [
    { key: 'round', label: 'Round', match: p => (p.caseType || 'round') === 'round' },
    { key: 'square', label: 'Square', match: p => p.caseType === 'square' }
  ].filter(g => products.some(g.match));

  const items = caseGroups.map(g => {
    const rep = products.find(p => g.match(p) && p.image);
    return { type: 'case', caseType: g.key, label: g.label, image: rep ? rep.image : null };
  });
  items.push({ type: 'action', label: 'Best Sellers', run: () => bestSellersSection.scrollIntoView({ behavior: 'smooth' }) });
  items.push({ type: 'action', label: 'View All', run: () => {
    activeBrand = 'All'; activeCase = 'All';
    filterPills.querySelectorAll('.pill').forEach(b => b.classList.toggle('active', b.dataset.brand === 'All'));
    catIconsRow.querySelectorAll('.cat-icon-item').forEach(b => b.classList.remove('active'));
    renderProducts();
    document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
  } });

  catIconsRow.innerHTML = items.map(it => {
    let iconHtml;
    if (it.image) iconHtml = `<img src="${it.image}" alt="${it.label}">`;
    else if (it.caseType === 'square') iconHtml = squareWatchSVG;
    else if (it.caseType === 'round') iconHtml = roundWatchSVG;
    else iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.6" style="width:58%;"><circle cx="12" cy="12" r="9"/></svg>`;
    return `<button class="cat-icon-item"><span class="circle">${iconHtml}</span><span>${it.label}</span></button>`;
  }).join('');

  catIconsRow.querySelectorAll('.cat-icon-item').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const it = items[i];
      if (it.type === 'action') { it.run(); return; }
      activeCase = activeCase === it.caseType ? 'All' : it.caseType;
      catIconsRow.querySelectorAll('.cat-icon-item').forEach(b => b.classList.remove('active'));
      if (activeCase !== 'All') btn.classList.add('active');
      renderProducts();
      document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function renderBestSellers(){
  const picks = products
    .filter(p => p.featured)
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 8);
  if (picks.length === 0) { bestSellersSection.style.display = 'none'; return; }
  bestSellersSection.style.display = 'block';
  bestSellersGrid.innerHTML = picks.map(p => bestSellerCard(p)).join('');
  wireHearts(bestSellersGrid);
  wireScrollProgress(bestSellersGrid, bsProgress);
  bsPrev.addEventListener('click', () => scrollByCard(bestSellersGrid, -1));
  bsNext.addEventListener('click', () => scrollByCard(bestSellersGrid, 1));
}

// Carousel card (Best Sellers / Recommended) — heart to save, tap opens the product page.
// No inline Add to Cart here, matching the reference layout; Add to Cart lives on the
// main grid card below and on the product page itself.
function bestSellerCard(p){
  const fav = isFav(p.id);
  return `
    <article class="carousel-card">
      ${p.featured ? `<span class="best-ribbon">Best Seller</span>` : ''}
      ${p.soldCount ? `<span class="sold-badge">${fmtSold(p.soldCount)}+ sold</span>` : ''}
      <button class="heart-btn ${fav ? 'is-fav' : ''}" data-id="${p.id}" aria-label="Save to wishlist">${heartSVG}</button>
      <a class="card-link" href="product.html?id=${p.id}">
        <div class="card-stage">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : `<div class="pillow"></div>${p.caseType === 'square' ? squareWatchSVG : roundWatchSVG}`}
        </div>
        <span class="card-tag">${p.tag || 'Watch'}</span>
        <h3>${p.name}</h3>
        ${p.brand ? `<p class="spec" style="color:var(--red); text-transform:uppercase; font-size:11px; letter-spacing:0.06em;">${p.brand}</p>` : ''}
        <div class="card-foot" style="border-top:none; padding-top:0;">
          <span class="price">${fmtPrice(p.price)}</span>
        </div>
      </a>
    </article>`;
}

// Main collection grid card — image/name/spec link to the product page;
// price + Add to Cart + wishlist heart stay as buttons.
function productCard(p){
  const fav = isFav(p.id);
  return `
    <article class="card">
      ${p.featured ? `<span class="best-ribbon">Best Seller</span>` : ''}
      ${p.soldCount ? `<span class="sold-badge">${fmtSold(p.soldCount)}+ sold</span>` : ''}
      <button class="heart-btn ${fav ? 'is-fav' : ''}" data-id="${p.id}" aria-label="Save to wishlist">${heartSVG}</button>
      <a class="card-link" href="product.html?id=${p.id}">
        <div class="card-stage">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : `<div class="pillow"></div>${p.caseType === 'square' ? squareWatchSVG : roundWatchSVG}`}
        </div>
        <span class="card-tag">${p.tag || 'Watch'}</span>
        <h3>${p.name}</h3>
        ${p.brand ? `<p class="spec" style="color:var(--red); text-transform:uppercase; font-size:11px; letter-spacing:0.06em;">${p.brand}</p>` : ''}
        <p class="spec">${p.spec || ''}</p>
      </a>
      <div class="card-foot">
        <span class="price">${fmtPrice(p.price)}</span>
        <button class="add-btn" data-id="${p.id}">Add to Cart</button>
      </div>
    </article>`;
}

const heartSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.2C.5 8.4 2.3 5 6 5c2 0 3.6 1.1 4.5 2.6L12 9.2l1.5-1.6C14.4 6.1 16 5 18 5c3.7 0 5.5 3.4 4 6.8-2.5 4.6-10 9.2-10 9.2z"/></svg>`;

function wireCardButtons(container){
  container.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(products.find(x => x.id === btn.dataset.id)));
  });
  wireHearts(container);
}

function renderProducts(){
  let list = products;
  if (activeBrand !== 'All') list = list.filter(p => (p.brand || '').trim() === activeBrand);
  if (activeCase !== 'All') list = list.filter(p => (p.caseType || 'round') === activeCase);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.tag || '').toLowerCase().includes(q)
    );
  }
  if (list.length === 0) {
    productGrid.innerHTML = `<p class="empty-note">${products.length === 0 ? 'No pieces published yet — add some from the admin dashboard.' : 'No pieces match your filters.'}</p>`;
    return;
  }
  productGrid.innerHTML = list.map(p => productCard(p)).join('');
  wireCardButtons(productGrid);
}
