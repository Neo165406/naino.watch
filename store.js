// ==========================================================================
// XIANO — storefront logic (reads from Firestore: settings, slides, products;
// writes to Firestore: orders)
// ==========================================================================

const roundWatchSVG = `
  <svg class="watch-icon" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <rect x="42" y="4" width="16" height="12" rx="2" fill="#3a3a36"/>
    <rect x="42" y="84" width="16" height="12" rx="2" fill="#3a3a36"/>
    <circle cx="50" cy="50" r="34" fill="#111110" stroke="#e21f2e" stroke-width="2"/>
    <circle cx="50" cy="50" r="27" fill="#1c1b18" stroke="#f4f1ea" stroke-width="1" opacity="0.5"/>
    <g stroke="#f4f1ea" stroke-width="1.4" opacity="0.7">
      <line x1="50" y1="26" x2="50" y2="31"/><line x1="50" y1="69" x2="50" y2="74"/>
      <line x1="26" y1="50" x2="31" y2="50"/><line x1="69" y1="50" x2="74" y2="50"/>
    </g>
    <line x1="50" y1="50" x2="50" y2="32" stroke="#f4f1ea" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="62" y2="56" stroke="#e21f2e" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.4" fill="#e21f2e"/>
    <rect x="6" y="42" width="10" height="16" rx="2" fill="#2a2a27"/>
    <rect x="84" y="42" width="10" height="16" rx="2" fill="#2a2a27"/>
  </svg>`;

const squareWatchSVG = `
  <svg class="watch-icon" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <rect x="42" y="4" width="16" height="12" rx="2" fill="#3a3a36"/>
    <rect x="42" y="84" width="16" height="12" rx="2" fill="#3a3a36"/>
    <rect x="20" y="20" width="60" height="60" rx="10" fill="#111110" stroke="#e21f2e" stroke-width="2"/>
    <rect x="27" y="27" width="46" height="46" rx="6" fill="#1c1b18" stroke="#f4f1ea" stroke-width="1" opacity="0.5"/>
    <line x1="50" y1="50" x2="50" y2="35" stroke="#f4f1ea" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="60" y2="58" stroke="#e21f2e" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.2" fill="#e21f2e"/>
    <rect x="6" y="42" width="10" height="16" rx="2" fill="#2a2a27"/>
    <rect x="84" y="42" width="10" height="16" rx="2" fill="#2a2a27"/>
  </svg>`;

// ---------- safe local storage (falls back to in-memory if blocked) ----------
let memCart = [];
function loadCart(){
  try { return JSON.parse(localStorage.getItem('xiano_cart') || '[]'); }
  catch(e){ return memCart; }
}
function saveCart(cart){
  try { localStorage.setItem('xiano_cart', JSON.stringify(cart)); }
  catch(e){ memCart = cart; }
}
let cart = loadCart();

// ---------- DOM refs ----------
const productGrid = document.getElementById('productGrid');
const slideContent = document.getElementById('slideContent');
const slideDots = document.getElementById('slideDots');
const announceBar = document.getElementById('announceBar');
const cartCount = document.getElementById('cartCount');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartBody = document.getElementById('cartBody');
const cartTotal = document.getElementById('cartTotal');
const checkoutSection = document.getElementById('checkoutSection');
const checkoutForm = document.getElementById('checkoutForm');
const formMsg = document.getElementById('formMsg');
const footerWA = document.getElementById('footerWA');
const heroWA = document.getElementById('heroWA');

function fmtPrice(n){ return '৳' + Number(n).toLocaleString('en-BD'); }

// ---------- SETTINGS ----------
db.collection('settings').doc('site').get().then(doc => {
  if (!doc.exists) return;
  const s = doc.data();
  if (s.announcement && announceBar) announceBar.textContent = s.announcement;
  const waLink = `https://wa.me/${s.whatsappNumber || WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi XIANO, I have a question.')}`;
  if (footerWA) footerWA.href = waLink;
  if (heroWA) heroWA.href = waLink;
}).catch(() => {});

// ---------- SLIDES ----------
let slides = [];
let slideIndex = 0;
db.collection('slides').where('active', '==', true).orderBy('order').get().then(snap => {
  slides = snap.docs.map(d => d.data());
  if (slides.length === 0) {
    slides = [{ headline: 'Watches, Built To Be Worn', body: 'Sapphire-coated crystals and stainless steel cases — priced for people who refuse to overpay for a logo.' }];
  }
  renderSlide();
  if (slides.length > 1) {
    slideDots.innerHTML = slides.map((_, i) => `<button data-i="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i+1}"></button>`).join('');
    slideDots.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { slideIndex = +b.dataset.i; renderSlide(); resetAutoplay(); }));
    resetAutoplay();
  }
}).catch(() => { slides = [{ headline: 'Watches, Built To Be Worn', body: 'Sapphire-coated crystals and stainless steel cases.' }]; renderSlide(); });

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
}

// ---------- PRODUCTS ----------
let products = [];
db.collection('products').where('active', '==', true).orderBy('order').get().then(snap => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}).catch(err => {
  console.error(err);
  productGrid.innerHTML = `<p class="empty-note">Couldn't load the collection. Check your Firebase config in js/firebase-config.js.</p>`;
});

function renderProducts(){
  if (products.length === 0) {
    productGrid.innerHTML = `<p class="empty-note">No pieces published yet — add some from the admin dashboard.</p>`;
    return;
  }
  productGrid.innerHTML = products.map(p => `
    <article class="card reveal in">
      <div class="card-stage">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy">` : `<div class="pillow"></div>${p.caseType === 'square' ? squareWatchSVG : roundWatchSVG}`}
      </div>
      <span class="card-tag">${p.tag || 'Watch'}</span>
      <h3>${p.name}</h3>
      <p class="spec">${p.spec || ''}</p>
      <div class="card-foot">
        <span class="price">${fmtPrice(p.price)}</span>
        <button class="add-btn" data-id="${p.id}">Add to Cart</button>
      </div>
    </article>
  `).join('');
  productGrid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
}

// ---------- CART ----------
function addToCart(id){
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(x => x.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image || '', caseType: p.caseType || 'round', qty: 1 });
  saveCart(cart);
  renderCart();
  openCart();
}
function changeQty(id, delta){
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  saveCart(cart);
  renderCart();
}
function removeItem(id){
  cart = cart.filter(x => x.id !== id);
  saveCart(cart);
  renderCart();
}
function cartTotalValue(){ return cart.reduce((sum, i) => sum + i.price * i.qty, 0); }

function renderCart(){
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartCount.textContent = count;
  cartCount.style.display = count > 0 ? 'flex' : 'none';

  if (cart.length === 0) {
    cartBody.innerHTML = `<p class="empty-note">Your cart is empty.</p>`;
    checkoutSection.style.display = 'none';
  } else {
    cartBody.innerHTML = cart.map(i => `
      <div class="cart-item">
        <div class="thumb">${i.image ? `<img src="${i.image}" alt="${i.name}">` : (i.caseType === 'square' ? squareWatchSVG : roundWatchSVG)}</div>
        <div class="info">
          <div class="row"><span class="name">${i.name}</span><button class="remove-btn" data-id="${i.id}">Remove</button></div>
          <div class="row">
            <div class="qty-ctrl">
              <button data-id="${i.id}" data-d="-1">−</button>
              <span>${i.qty}</span>
              <button data-id="${i.id}" data-d="1">+</button>
            </div>
            <span class="price">${fmtPrice(i.price * i.qty)}</span>
          </div>
        </div>
      </div>
    `).join('');
    checkoutSection.style.display = 'block';
    cartBody.querySelectorAll('.qty-ctrl button').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.id, +b.dataset.d)));
    cartBody.querySelectorAll('.remove-btn').forEach(b => b.addEventListener('click', () => removeItem(b.dataset.id)));
  }
  cartTotal.textContent = fmtPrice(cartTotalValue());
}

function openCart(){ cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); }
function closeCart(){ cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); }
document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// ---------- CHECKOUT ----------
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (cart.length === 0) return;
  const fd = new FormData(checkoutForm);
  const order = {
    items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
    total: cartTotalValue(),
    customerName: fd.get('name'),
    phone: fd.get('phone'),
    address: fd.get('address'),
    notes: fd.get('notes') || '',
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const submitBtn = checkoutForm.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order…';
  try {
    await db.collection('orders').add(order);
    const summary = cart.map(i => `${i.qty}x ${i.name}`).join(', ');
    const waText = encodeURIComponent(`Hi XIANO, I just placed an order (${summary}) — Total ${fmtPrice(order.total)}. Name: ${order.customerName}, Phone: ${order.phone}, Address: ${order.address}`);
    formMsg.className = 'form-msg success';
    formMsg.innerHTML = `Order placed! We'll confirm by phone shortly. <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waText}" target="_blank" rel="noopener" style="color:inherit; text-decoration:underline;">Tap here to also confirm on WhatsApp</a>.`;
    formMsg.style.display = 'block';
    cart = [];
    saveCart(cart);
    renderCart();
    checkoutForm.reset();
  } catch (err) {
    console.error(err);
    formMsg.className = 'form-msg error';
    formMsg.textContent = "Couldn't place the order — check your Firestore rules/config and try again.";
    formMsg.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order — Cash on Delivery';
  }
});

renderCart();

// ---------- scroll reveal for non-product sections ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
