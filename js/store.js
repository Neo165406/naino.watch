// ==========================================================================
// XAINO — homepage logic (reads from Firestore: slides, products)
// Cart drawer + checkout + settings live in js/cart.js (shared with product.html)
// ==========================================================================

// ---------- DOM refs ----------
const productGrid = document.getElementById('productGrid');
const filterPills = document.getElementById('filterPills');
const bestSellersSection = document.getElementById('bestSellersSection');
const bestSellersGrid = document.getElementById('bestSellersGrid');
const heroSection = document.getElementById('heroSection');
const slideContent = document.getElementById('slideContent');
const slideDots = document.getElementById('slideDots');

// ---------- SLIDES ----------
// NOTE: plain orderBy (no .where combined with it) — combining an equality
// filter with orderBy on a different field needs a Firestore composite index,
// so we fetch everything ordered and filter "active" client-side instead.
let slides = [];
let slideIndex = 0;
db.collection('slides').orderBy('order').get().then(snap => {
  slides = snap.docs.map(d => d.data()).filter(s => s.active !== false);
  if (slides.length === 0) {
    slides = [{ headline: 'Watches, Built To Be Worn', body: 'Sapphire-coated crystals and stainless steel cases — priced for people who refuse to overpay for a logo.', image: '' }];
  }
  renderSlide();
  if (slides.length > 1) {
    slideDots.innerHTML = slides.map((_, i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i+1}"></button>`).join('');
    slideDots.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { slideIndex = +b.dataset.i; renderSlide(); resetAutoplay(); }));
    resetAutoplay();
  }
}).catch(err => {
  console.error(err);
  slides = [{ headline: 'Watches, Built To Be Worn', body: 'Sapphire-coated crystals and stainless steel cases.', image: '' }];
  renderSlide();
});

let autoplayTimer;
function resetAutoplay(){
  clearInterval(autoplayTimer);
  autoplayTimer = setInterval(() => { slideIndex = (slideIndex + 1) % slides.length; renderSlide(); }, 5000);
}
function renderSlide(){
  const s = slides[slideIndex];
  if (!s || !slideContent) return;
  slideContent.querySelector('h1').textContent = s.headline || '';
  slideContent.querySelector('p').textContent = s.body || '';
  if (slideDots) slideDots.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === slideIndex));
  if (heroSection) heroSection.style.backgroundImage = s.image ? `url('${s.image}')` : 'none';
}

// ---------- PRODUCTS ----------
let products = [];
let activeBrand = 'All';

db.collection('products').orderBy('order').get().then(snap => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.active !== false);
  renderFilterPills();
  renderBestSellers();
  renderProducts();
}).catch(err => {
  console.error(err);
  productGrid.innerHTML = `<p class="empty-note">Couldn't load the collection — ${err.code || 'error'}: ${err.message}</p>`;
});

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

function renderBestSellers(){
  const picks = products
    .filter(p => p.featured)
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 6);
  if (picks.length === 0) { bestSellersSection.style.display = 'none'; return; }
  bestSellersSection.style.display = 'block';
  bestSellersGrid.innerHTML = picks.map(p => productCard(p, true)).join('');
  wireCardButtons(bestSellersGrid);
}

// isBestSeller: shows the ribbon. Image/tag/name/brand/spec are wrapped in a
// link to product.html so tapping the card opens the full product page;
// price + Add to Cart stay outside the link so they keep working as buttons.
function productCard(p, isBestSeller){
  return `
    <article class="card reveal in">
      ${isBestSeller ? `<span class="best-ribbon">Best Seller</span>` : ''}
      ${p.soldCount ? `<span class="sold-badge">${fmtSold(p.soldCount)}+ sold</span>` : ''}
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

function wireCardButtons(container){
  container.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(products.find(x => x.id === btn.dataset.id)));
  });
}

function renderProducts(){
  const list = activeBrand === 'All' ? products : products.filter(p => (p.brand || '').trim() === activeBrand);
  if (list.length === 0) {
    productGrid.innerHTML = `<p class="empty-note">${products.length === 0 ? 'No pieces published yet — add some from the admin dashboard.' : 'No pieces in this category yet.'}</p>`;
    return;
  }
  productGrid.innerHTML = list.map(p => productCard(p, false)).join('');
  wireCardButtons(productGrid);
}

// ---------- scroll reveal for non-product sections ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
