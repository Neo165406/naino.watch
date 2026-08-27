// ==========================================================================
// XAINO — single product page logic
// Cart drawer + checkout + settings live in js/cart.js (shared with index.html)
// ==========================================================================

const detailView = document.getElementById('productDetailView');
const notFoundView = document.getElementById('notFoundView');
const pStage = document.getElementById('pStage');
const pBrand = document.getElementById('pBrand');
const pName = document.getElementById('pName');
const pTag = document.getElementById('pTag');
const pSoldBadge = document.getElementById('pSoldBadge');
const pBestRibbon = document.getElementById('pBestRibbon');
const pPrice = document.getElementById('pPrice');
const pSpec = document.getElementById('pSpec');
const qtyDisplay = document.getElementById('qtyDisplay');
const addToCartBtn = document.getElementById('pAddToCart');
const buyWhatsAppBtn = document.getElementById('pBuyWhatsApp');
const pageTitleEl = document.querySelector('title');

let currentProduct = null;
let qty = 1;

const params = new URLSearchParams(location.search);
const productId = params.get('id');

if (!productId) {
  showNotFound();
} else {
  db.collection('products').doc(productId).get().then(doc => {
    if (!doc.exists || doc.data().active === false) {
      showNotFound();
      return;
    }
    currentProduct = { id: doc.id, ...doc.data() };
    renderProduct(currentProduct);
  }).catch(err => {
    console.error(err);
    showNotFound(`Couldn't load this product — ${err.code || 'error'}: ${err.message}`);
  });
}

function showNotFound(message){
  detailView.style.display = 'none';
  notFoundView.style.display = 'block';
  if (message) notFoundView.querySelector('p').textContent = message;
}

function renderProduct(p){
  detailView.style.display = 'grid';
  notFoundView.style.display = 'none';
  pageTitleEl.textContent = `${p.name} — XAINO`;

  pStage.innerHTML = p.image
    ? `<img src="${p.image}" alt="${p.name}">`
    : (p.caseType === 'square' ? squareWatchSVG : roundWatchSVG);

  pBrand.textContent = p.brand || 'XAINO';
  pName.textContent = p.name;
  pTag.textContent = p.tag || 'Watch';
  pPrice.textContent = fmtPrice(p.price);
  pSpec.textContent = p.spec || '';

  if (p.soldCount) { pSoldBadge.textContent = `${fmtSold(p.soldCount)}+ sold`; pSoldBadge.style.display = 'inline-block'; }
  else { pSoldBadge.style.display = 'none'; }

  pBestRibbon.style.display = p.featured ? 'inline-block' : 'none';

  buyWhatsAppBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi XAINO, I'd like to order the ${p.name} — ${fmtPrice(p.price)}.`)}`;
}

document.getElementById('qtyMinus').addEventListener('click', () => {
  qty = Math.max(1, qty - 1);
  qtyDisplay.textContent = qty;
});
document.getElementById('qtyPlus').addEventListener('click', () => {
  qty += 1;
  qtyDisplay.textContent = qty;
});

addToCartBtn.addEventListener('click', () => {
  if (!currentProduct) return;
  addToCart(currentProduct, qty);
  qty = 1;
  qtyDisplay.textContent = qty;
});
