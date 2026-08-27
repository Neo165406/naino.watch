// ==========================================================================
// XIANO — admin dashboard logic
// ==========================================================================

// ---------- AUTH GUARD ----------
const loginScreen = document.getElementById('loginScreen');
const adminShell = document.getElementById('adminShell');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.style.display = 'none';
    adminShell.classList.add('active');
    initDashboard();
  } else {
    loginScreen.style.display = 'flex';
    adminShell.classList.remove('active');
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (err) {
    loginError.textContent = 'Login failed — check your email and password.';
    loginError.style.display = 'block';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

// ---------- SIDEBAR NAV ----------
document.querySelectorAll('.side-link[data-panel]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.side-link[data-panel]').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('panel-' + link.dataset.panel).classList.add('active');
  });
});

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function fmtPrice(n){ return '৳' + Number(n || 0).toLocaleString('en-BD'); }

const roundIcon = `<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="34" fill="#111110" stroke="#e21f2e" stroke-width="3"/><line x1="50" y1="50" x2="50" y2="32" stroke="#f4f1ea" stroke-width="3"/></svg>`;

let dashboardInited = false;
function initDashboard(){
  if (dashboardInited) return;
  dashboardInited = true;
  watchProducts();
  watchOrders();
  watchSlides();
  loadTheme();
}

// ---------- imgbb upload ----------
async function uploadToImgbb(file){
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.success) throw new Error('imgbb upload failed');
  return data.data.url;
}

// ==========================================================================
// PRODUCTS
// ==========================================================================
let products = [];
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
let editingProductId = null;
let pendingImageUrl = '';

function watchProducts(){
  db.collection('products').orderBy('order').onSnapshot(snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProductsTable();
    updateStats();
  }, err => console.error(err));
}

function renderProductsTable(){
  const tbody = document.getElementById('productsBody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-note">No products yet — click "Add Product".</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><div class="row-thumb">${p.image ? `<img src="${p.image}" alt="">` : roundIcon}</div></td>
      <td>${p.name}</td>
      <td>${p.tag || '—'}</td>
      <td>${fmtPrice(p.price)}</td>
      <td><span class="badge ${p.active ? 'on' : 'off'}">${p.active ? 'Active' : 'Hidden'}</span></td>
      <td>
        <button class="icon-action" data-edit="${p.id}">Edit</button>
        <button class="icon-action danger" data-del="${p.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openProductModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
}

document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
document.getElementById('productModalClose').addEventListener('click', () => productModal.classList.remove('open'));

function openProductModal(id){
  editingProductId = id;
  pendingImageUrl = '';
  const p = id ? products.find(x => x.id === id) : null;
  document.getElementById('productModalTitle').textContent = id ? 'Edit Product' : 'Add Product';
  productForm.reset();
  document.getElementById('pImagePreview').innerHTML = '';
  if (p) {
    productForm.name.value = p.name || '';
    productForm.tag.value = p.tag || '';
    productForm.spec.value = p.spec || '';
    productForm.price.value = p.price || '';
    productForm.caseType.value = p.caseType || 'round';
    productForm.order.value = p.order != null ? p.order : products.length;
    productForm.active.checked = p.active !== false;
    pendingImageUrl = p.image || '';
    if (p.image) document.getElementById('pImagePreview').innerHTML = `<img src="${p.image}" alt="">`;
  } else {
    productForm.order.value = products.length;
    productForm.active.checked = true;
  }
  productModal.classList.add('open');
}

document.getElementById('pImageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('pImagePreview');
  preview.innerHTML = 'Uploading…';
  try {
    pendingImageUrl = await uploadToImgbb(file);
    preview.innerHTML = `<img src="${pendingImageUrl}" alt="">`;
  } catch (err) {
    preview.innerHTML = '';
    toast('Image upload failed — check your imgbb key.');
  }
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: productForm.name.value.trim(),
    tag: productForm.tag.value.trim(),
    spec: productForm.spec.value.trim(),
    price: Number(productForm.price.value),
    caseType: productForm.caseType.value,
    order: Number(productForm.order.value) || 0,
    active: productForm.active.checked,
    image: pendingImageUrl || ''
  };
  try {
    if (editingProductId) {
      await db.collection('products').doc(editingProductId).update(data);
      toast('Product updated.');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(data);
      toast('Product added.');
    }
    productModal.classList.remove('open');
  } catch (err) {
    console.error(err);
    toast('Could not save — check Firestore rules.');
  }
});

async function deleteProduct(id){
  if (!confirm('Delete this product?')) return;
  await db.collection('products').doc(id).delete();
  toast('Product deleted.');
}

// ==========================================================================
// ORDERS
// ==========================================================================
function watchOrders(){
  db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderOrdersTable(orders);
    updateStats(orders);
  }, err => console.error(err));
}

function renderOrdersTable(orders){
  const tbody = document.getElementById('ordersBody');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-note">No orders yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.createdAt ? o.createdAt.toDate().toLocaleDateString() : '—'}</td>
      <td>${o.customerName || '—'}<br><span style="color:var(--steel); font-size:11px;">${o.phone || ''}</span></td>
      <td>${(o.items || []).map(i => `${i.qty}× ${i.name}`).join('<br>')}</td>
      <td>${fmtPrice(o.total)}</td>
      <td>
        <select class="status-select" data-id="${o.id}">
          ${['pending','confirmed','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>
      <td><button class="icon-action" data-view="${o.id}">Details</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', () => db.collection('orders').doc(sel.dataset.id).update({ status: sel.value }).then(() => toast('Order status updated.')));
  });
  tbody.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showOrderDetail(orders.find(o => o.id === b.dataset.view))));
}

const orderModal = document.getElementById('orderModal');
document.getElementById('orderModalClose').addEventListener('click', () => orderModal.classList.remove('open'));
function showOrderDetail(o){
  document.getElementById('orderDetailBody').innerHTML = `
    <div class="order-detail">
      <p><strong>Customer:</strong> ${o.customerName}</p>
      <p><strong>Phone:</strong> ${o.phone}</p>
      <p><strong>Address:</strong> ${o.address}</p>
      ${o.notes ? `<p><strong>Notes:</strong> ${o.notes}</p>` : ''}
      <p style="margin-top:10px;"><strong>Items:</strong></p>
      <p>${(o.items || []).map(i => `${i.qty}× ${i.name} — ${fmtPrice(i.price * i.qty)}`).join('<br>')}</p>
      <p style="margin-top:10px;"><strong>Total: ${fmtPrice(o.total)}</strong></p>
    </div>`;
  orderModal.classList.add('open');
}

// ==========================================================================
// SLIDES
// ==========================================================================
let slidesList = [];
const slideModal = document.getElementById('slideModal');
const slideForm = document.getElementById('slideForm');
let editingSlideId = null;

function watchSlides(){
  db.collection('slides').orderBy('order').onSnapshot(snap => {
    slidesList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSlidesTable();
  }, err => console.error(err));
}

function renderSlidesTable(){
  const tbody = document.getElementById('slidesBody');
  if (slidesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-note">No slides yet — the hero will show a default message.</td></tr>`;
    return;
  }
  tbody.innerHTML = slidesList.map(s => `
    <tr>
      <td>${s.headline}</td>
      <td>${s.order}</td>
      <td><span class="badge ${s.active ? 'on' : 'off'}">${s.active ? 'Active' : 'Hidden'}</span></td>
      <td>
        <button class="icon-action" data-edit="${s.id}">Edit</button>
        <button class="icon-action danger" data-del="${s.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openSlideModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => { if (confirm('Delete this slide?')) { await db.collection('slides').doc(b.dataset.del).delete(); toast('Slide deleted.'); } }));
}

document.getElementById('addSlideBtn').addEventListener('click', () => openSlideModal(null));
document.getElementById('slideModalClose').addEventListener('click', () => slideModal.classList.remove('open'));

function openSlideModal(id){
  editingSlideId = id;
  const s = id ? slidesList.find(x => x.id === id) : null;
  document.getElementById('slideModalTitle').textContent = id ? 'Edit Slide' : 'Add Slide';
  slideForm.reset();
  if (s) {
    slideForm.headline.value = s.headline || '';
    slideForm.body.value = s.body || '';
    slideForm.order.value = s.order != null ? s.order : slidesList.length;
    slideForm.active.checked = s.active !== false;
  } else {
    slideForm.order.value = slidesList.length;
    slideForm.active.checked = true;
  }
  slideModal.classList.add('open');
}

slideForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    headline: slideForm.headline.value.trim(),
    body: slideForm.body.value.trim(),
    order: Number(slideForm.order.value) || 0,
    active: slideForm.active.checked
  };
  if (editingSlideId) await db.collection('slides').doc(editingSlideId).update(data);
  else await db.collection('slides').add(data);
  slideModal.classList.remove('open');
  toast('Slide saved.');
});

// ==========================================================================
// THEME / SITE SETTINGS
// ==========================================================================
const themeForm = document.getElementById('themeForm');
function loadTheme(){
  db.collection('settings').doc('site').get().then(doc => {
    const s = doc.exists ? doc.data() : {};
    themeForm.announcement.value = s.announcement || '';
    themeForm.whatsappNumber.value = s.whatsappNumber || '';
    themeForm.phone.value = s.phone || '';
    themeForm.address.value = s.address || '';
  });
}
themeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await db.collection('settings').doc('site').set({
    announcement: themeForm.announcement.value.trim(),
    whatsappNumber: themeForm.whatsappNumber.value.trim(),
    phone: themeForm.phone.value.trim(),
    address: themeForm.address.value.trim()
  }, { merge: true });
  toast('Settings saved.');
});

// ==========================================================================
// DASHBOARD STATS
// ==========================================================================
function updateStats(orders){
  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statActiveProducts').textContent = products.filter(p => p.active).length;
  if (orders) {
    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statPending').textContent = orders.filter(o => o.status === 'pending').length;
  }
}
