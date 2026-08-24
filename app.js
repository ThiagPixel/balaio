// =====================
// Configuração Supabase
// =====================

const SUPABASE_URL = 'https://xunmoqrrcxdltecotsut.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bm1vcXJyY3hkbHRlY290c3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzOTY1NTUsImV4cCI6MjA5ODk3MjU1NX0.tTEbQUDIYZhqf_kozyahJ2YG7F07ZF1ZjqaqyQhDs7A';

// Usa o cliente global criado pelo CDN
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// Elementos DOM
// =====================
const loginView = document.getElementById('loginView');
const signupView = document.getElementById('signupView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const productList = document.getElementById('productList');
const baixaModal = document.getElementById('baixaModal');
const baixaForm = document.getElementById('baixaForm');
const toast = document.getElementById('toast');

let currentProduct = null;
let allProducts = [];

// =====================
// Utilitários
// =====================
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.className = 'toast', 3000);
}

function showView(view) {
  loginView.classList.add('hidden');
  signupView.classList.add('hidden');
  appView.classList.add('hidden');
  view.classList.remove('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =====================
// Auth
// =====================
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showView(appView);
    loadProducts();
  } else {
    showView(loginView);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showView(appView);
    loadProducts();
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Cadastro realizado! Faça login.');
    showView(loginView);
  }
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showView(loginView);
});

document.getElementById('showSignup').addEventListener('click', (e) => {
  e.preventDefault();
  showView(signupView);
});

document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault();
  showView(loginView);
});

// =====================
// Produtos
// =====================
async function loadProducts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, current_stock, min_stock')
    .eq('active', true)
    .order('name');

  if (error) {
    showToast('Erro ao carregar produtos', 'error');
    return;
  }

  allProducts = data || [];
  renderProducts(allProducts);
}

function renderProducts(products) {
  if (products.length === 0) {
    productList.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
    return;
  }

  productList.innerHTML = products.map(p => `
    <div class="product-card">
      <div class="product-info">
        <h3>${escapeHtml(p.name)}</h3>
        <p>SKU: ${escapeHtml(p.sku || '-')}</p>
      </div>
      <div class="product-stock ${p.current_stock <= p.min_stock ? 'low' : ''}">
        <div class="stock-qty">${p.current_stock}</div>
        <div class="stock-label">em estoque</div>
        <button class="btn btn-danger baixa-btn"
                onclick="openBaixaModal('${p.id}')"
                ${p.current_stock <= 0 ? 'disabled' : ''}>
          Retirar
        </button>
      </div>
    </div>
  `).join('');
}

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.sku && p.sku.toLowerCase().includes(query))
  );
  renderProducts(filtered);
});

// =====================
// Modal Baixa
// =====================
window.openBaixaModal = function(productId) {
  currentProduct = allProducts.find(p => p.id === productId);
  if (!currentProduct) return;

  document.getElementById('modalProductName').textContent = currentProduct.name;
  document.getElementById('modalCurrentStock').textContent = currentProduct.current_stock;
  document.getElementById('baixaQuantity').value = '';
  document.getElementById('baixaQuantity').max = currentProduct.current_stock;
  document.getElementById('baixaNotes').value = '';
  baixaModal.classList.add('active');
};

document.getElementById('cancelBaixa').addEventListener('click', () => {
  baixaModal.classList.remove('active');
  currentProduct = null;
});

baixaModal.addEventListener('click', (e) => {
  if (e.target === baixaModal) {
    baixaModal.classList.remove('active');
    currentProduct = null;
  }
});

baixaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentProduct) return;

  const quantity = parseInt(document.getElementById('baixaQuantity').value);
  const notes = document.getElementById('baixaNotes').value;

  if (quantity > currentProduct.current_stock) {
    showToast('Quantidade maior que o estoque disponível', 'error');
    return;
  }

  const newStock = currentProduct.current_stock - quantity;

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session.user.id;

  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (!userData) {
    showToast('Erro ao identificar empresa', 'error');
    return;
  }

  const { error } = await supabase.rpc('execute_stock_movement', {
    p_product_id: currentProduct.id,
    p_tenant_id: userData.tenant_id,
    p_type: 'OUT',
    p_quantity: quantity,
    p_unit_cost: null,
    p_notes: notes || 'Baixa de estoque',
    p_new_stock: newStock
  });

  if (error) {
    console.error('Erro baixa:', error);
    showToast('Erro ao dar baixa', 'error');
  } else {
    showToast(`Baixa de ${quantity} unidades realizada!`);
    baixaModal.classList.remove('active');
    loadProducts();
  }
});

// =====================
// Inicialização
// =====================
checkSession();
