// ==========================================================================
// XAINO — shared cart drawer + checkout logic (used on index.html and product.html)
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

function fmtPrice(n){ return '৳' + Number(n || 0).toLocaleString('en-BD'); }
function fmtSold(n){ return Number(n).toLocaleString('en-BD'); }

// ---------- safe local storage (falls back to in-memory if blocked) ----------
let memCart = [];
function loadCart(){
  try { return JSON.parse(localStorage.getItem('xaino_cart') || '[]'); }
  catch(e){ return memCart; }
}
function saveCart(cart){
  try { localStorage.setItem('xaino_cart', JSON.stringify(cart)); }
  catch(e){ memCart = cart; }
}
let cart = loadCart();

// ---------- DOM refs (present on every page that includes the cart drawer partial) ----------
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
const heroWA = document.getElementById('heroWA'); // only exists on index.html — guarded below

// ---------- SETTINGS (announcement bar + WhatsApp links) ----------
db.collection('settings').doc('site').get().then(doc => {
  if (!doc.exists) return;
  const s = doc.data();
  if (s.announcement && announceBar) announceBar.textContent = s.announcement;
  const waLink = `https://wa.me/${s.whatsappNumber || WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi XAINO, I have a question.')}`;
  if (footerWA) footerWA.href = waLink;
  if (heroWA) heroWA.href = waLink;
}).catch(() => {});

// ---------- CART ----------
// addToCart takes a full product-like object: {id, name, price, image, caseType}
function addToCart(product, qty){
  if (!product) return;
  qty = qty || 1;
  const existing = cart.find(x => x.id === product.id);
  if (existing) existing.qty += qty;
  else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image || '', caseType: product.caseType || 'round', qty: qty });
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
    const waText = encodeURIComponent(`Hi XAINO, I just placed an order (${summary}) — Total ${fmtPrice(order.total)}. Name: ${order.customerName}, Phone: ${order.phone}, Address: ${order.address}`);
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
    formMsg.textContent = `Couldn't place the order — ${err.code || 'error'}: ${err.message}`;
    formMsg.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order — Cash on Delivery';
  }
});

renderCart();
