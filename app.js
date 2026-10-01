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
let withdrawalPending = false;

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
  if (!session) {
    showView(loginView);
    return;
  }

  const { data: access, error } = await supabase.rpc('get_my_access_context');
  if (error || !access || access.active !== true || !access.permissions.includes('stock.out')) {
    allProducts = [];
    renderProducts(allProducts);
    await supabase.auth.signOut();
    showView(loginView);
    showToast('Sua conta está inativa ou não possui permissão para retirar produtos.', 'error');
    return;
  }

  showView(appView);
  await loadProducts();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(error.message, 'error');
  } else {
    await checkSession();
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

  let { data, error } = await supabase.rpc('list_withdrawal_products');

  // Compatibilidade durante a publicação: só usa a leitura antiga se a RPC ainda
  // não existir. Erros de permissão nunca acionam esse fallback.
  if (error && error.code === 'PGRST202') {
    ({ data, error } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, min_stock')
      .eq('active', true)
      .order('name'));
  }

  if (error) {
    allProducts = [];
    renderProducts(allProducts);
    showToast('Erro ao carregar produtos', 'error');
    return;
  }

  allProducts = data || [];
  renderProducts(filterProducts(searchInput.value));
}

function normalizeSearch(value) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function filterProducts(query) {
  const term = normalizeSearch(query).trim();
  return allProducts.filter(p => normalizeSearch(p.name).includes(term) || normalizeSearch(p.sku).includes(term));
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
  renderProducts(filterProducts(e.target.value));
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
  if (!currentProduct || withdrawalPending) return;

  const product = currentProduct;
  const quantity = Number(document.getElementById('baixaQuantity').value);
  const notes = document.getElementById('baixaNotes').value;
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > product.current_stock) {
    showToast('Informe uma quantidade inteira maior que zero e dentro do estoque disponível.', 'error');
    return;
  }

  withdrawalPending = true;
  const submitButton = baixaForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Entre novamente para registrar a retirada.');

    // O banco resolve a empresa, valida a permissão e calcula o estoque final.
    const { error } = await supabase.rpc('execute_stock_movement', {
      p_product_id: product.id,
      p_type: 'OUT',
      p_quantity: quantity,
      p_unit_cost: null,
      p_notes: notes.trim() || 'Baixa de estoque'
    });
    if (error) throw error;

    showToast('Baixa de ' + quantity + ' unidades realizada!');
    baixaModal.classList.remove('active');
    currentProduct = null;
    await loadProducts();
  } catch (error) {
    console.error('Erro baixa:', error);
    showToast(error.message || 'Erro ao dar baixa', 'error');
  } finally {
    withdrawalPending = false;
    submitButton.disabled = false;
  }
});

// =====================
// Inicialização
// =====================
checkSession();
