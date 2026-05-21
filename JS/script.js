/* =============================================================
   CONFIGURAÇÃO SUPABASE
   ============================================================= */

const SUPABASE_URL = 'https://cloyzqoyhenmalrsrwxo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsb3l6cW95aGVubWFscnNyd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjAwNTIsImV4cCI6MjA5NDc5NjA1Mn0.ZE7DRRqpf-Kw-FM7fvggqL2EOwbj0dfVfzpdoHj-GDg';

/**
 * Helper genérico para chamadas à API REST do Supabase.
 * @param {string} table - Nome da tabela
 * @param {object} options - { method, body, filters, select, order }
 * @returns {Promise<any>}
 */
async function supabaseQuery(table, options = {}) {
    const { method = 'GET', body, filters = '', select = '*', order = '' } = options;
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters}${order}`;

    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : ''
    };

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) throw new Error(await res.text());
    return method === 'DELETE' ? null : res.json();
}


/* =============================================================
   ESTADO GLOBAL
   ============================================================= */

let allProducts      = [];       // Todos os produtos carregados
let displayedProducts = [];      // Produtos visíveis no grid atual
let currentFilter    = 'all';    // Categoria ativa no filtro
let currentPage      = 0;        // Página atual da paginação
const PAGE_SIZE      = 8;        // Itens por página

let cart             = JSON.parse(localStorage.getItem('jhPinkCart')) || [];
let loggedUser       = JSON.parse(localStorage.getItem('jhPinkUser')) || null;

let currentSlide     = 0;        // Índice do slide ativo no hero
let slideInterval;               // Timer do carrossel automático
let currentModalProduct = null;  // Produto aberto no mini-modal
let currentQty       = 1;        // Quantidade selecionada na página de produto
let currentProduct   = null;     // Produto ativo na página de produto

// Textos dos modais informativos
const INFO_TEXTS = {
    about: `<p>A <strong>JH Pink</strong> nasceu com uma missão clara: democratizar o acesso à beleza de alta qualidade.</p>
            <p>Nossa curadoria é feita por especialistas que buscam as tendências globais e as trazem até você com exclusividade.</p>`,
    track: `<p><strong>Prazos e Rastreamento</strong></p>
            <p>O código de rastreio é enviado para seu e-mail em até 24h após o faturamento.</p>
            <p><strong>Estimativa:</strong><br>
            📍 Sudeste: 1-3 dias úteis<br>
            📍 Sul: 3-5 dias úteis<br>
            📍 Nordeste: 6-9 dias úteis<br>
            📍 Norte: 8-15 dias úteis</p>`,
    exchange: `<p><strong>Política de Trocas e Devoluções</strong></p>
               <p>Você tem até <strong>7 dias corridos</strong> após o recebimento para solicitar devolução por arrependimento.</p>
               <p>Para defeitos de fabricação, o prazo é de 30 dias.</p>`
};


/* =============================================================
   INICIALIZAÇÃO
   ============================================================= */

/**
 * Ponto de entrada da aplicação.
 * Carrega produtos do Supabase (ou fallback demo), inicializa UI.
 */
async function init() {
    updateCartUI();
    updateProfileUI();

    try {
        const data = await supabaseQuery('produtos', { order: '&order=created_at.desc' });
        allProducts = data.length > 0 ? data : DEMO_PRODUCTS;
    } catch (e) {
        console.warn('Supabase indisponível, usando dados de demonstração:', e.message);
        allProducts = DEMO_PRODUCTS;
    }

    // Decide qual fluxo executar com base na página atual
    const isProductPage = document.getElementById('pp-name');
    if (isProductPage) {
        loadProductDetails();
    } else {
        loadHomePage();
    }
}


/* =============================================================
   HOME PAGE
   ============================================================= */

/** Inicializa todos os componentes da home. */
function loadHomePage() {
    initHeroCarousel();
    renderPromoCarousel();
    renderQueridinhos();
    renderGrid();
    initCategoryNavigation();
    initSearch();
}

// ── Hero Carousel ────────────────────────────────────────────

/** Cria os dots de navegação e inicia a rotação automática do hero. */
function initHeroCarousel() {
    const slides = document.querySelectorAll('.hero-slide');
    const dotsContainer = document.getElementById('heroDots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = Array.from(slides)
        .map((_, i) => `<button class="hero-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`)
        .join('');

    slideInterval = setInterval(() => moveSlide(1), 5000);
}

/**
 * Avança ou retrocede o hero carousel.
 * @param {number} dir - Direção: +1 (próximo) ou -1 (anterior)
 */
function moveSlide(dir) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;

    slides[currentSlide].classList.remove('active');
    dots[currentSlide]?.classList.remove('active');

    currentSlide = (currentSlide + dir + slides.length) % slides.length;

    slides[currentSlide].classList.add('active');
    dots[currentSlide]?.classList.add('active');
    document.getElementById('heroSlides').style.transform = `translateX(-${currentSlide * 100}%)`;

    // Reinicia o timer ao navegar manualmente
    clearInterval(slideInterval);
    slideInterval = setInterval(() => moveSlide(1), 5000);
}

/** Navega direto para um slide pelo índice. */
function goToSlide(i) {
    moveSlide(i - currentSlide);
}

// ── Promoções Carousel ───────────────────────────────────────

/** Renderiza os cards de produtos em promoção. */
function renderPromoCarousel() {
    const track = document.getElementById('promoTrack');
    if (!track) return;

    const promos = allProducts.filter(p => p.promo || p.discount > 0);
    if (promos.length === 0) {
        document.querySelector('.promo-carousel-section').style.display = 'none';
        return;
    }

    track.innerHTML = promos.map(p => {
        const discount = p.discount || Math.round((1 - p.price / p.old_price) * 100);
        const oldPrice = p.old_price || p.price * 1.3;
        return `
        <div class="promo-card" onclick="goToProduct(${p.id})">
            <img src="${p.image_url || p.images?.[0] || 'https://via.placeholder.com/220x160/FFB6C1/333?text=Produto'}"
                 class="promo-card-img"
                 onerror="this.src='https://via.placeholder.com/220x160/FFB6C1/333?text=Produto'">
            <div class="promo-card-body">
                <div class="promo-badge">${discount}% OFF</div>
                <div class="promo-card-name">${p.name}</div>
                <div class="promo-old-price">${formatMoney(oldPrice)}</div>
                <div class="promo-new-price">${formatMoney(p.price)}</div>
                <button class="btn-promo-go" onclick="event.stopPropagation(); goToProduct(${p.id})">VER PRODUTO →</button>
            </div>
        </div>`;
    }).join('');
}

/** Rola o carrossel de promos horizontalmente. */
function scrollPromo(dir) {
    const track = document.getElementById('promoTrack');
    if (track) track.scrollBy({ left: dir * 260, behavior: 'smooth' });
}

// ── Seção Queridinhos ────────────────────────────────────────

/**
 * Renderiza os produtos "queridinhos" (campo querido: true no banco).
 * Fallback: primeiros 4 produtos.
 */
function renderQueridinhos() {
    const container = document.getElementById('queridinhosGrid');
    if (!container) return;

    const queridinhos = allProducts.filter(p => p.querido).slice(0, 4);
    const toShow = queridinhos.length > 0 ? queridinhos : allProducts.slice(0, 4);
    container.innerHTML = toShow.map(p => renderCard(p)).join('');
}

// ── Grid Coleção ─────────────────────────────────────────────

/** Renderiza o grid de produtos com base no filtro e página atuais. */
function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;

    const filtered = currentFilter === 'all'
        ? allProducts
        : allProducts.filter(p => p.category === currentFilter);

    displayedProducts = filtered;
    const page = filtered.slice(0, PAGE_SIZE * (currentPage + 1));
    grid.innerHTML = page.map(p => renderCard(p)).join('');

    const btnMore = document.getElementById('btnLoadMore');
    if (btnMore) btnMore.style.display = page.length >= filtered.length ? 'none' : 'inline-block';
}

/** Carrega mais produtos incrementando a página atual. */
function loadMore() {
    currentPage++;
    renderGrid();
}

/**
 * Gera o HTML de um card de produto.
 * @param {object} p - Objeto do produto
 * @returns {string} HTML do card
 */
function renderCard(p) {
    const discount = p.discount || (p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0);
    const imgSrc   = p.image_url || p.images?.[0] || 'https://via.placeholder.com/300x300/FFB6C1/333?text=Produto';

    return `
    <div class="card" onclick="goToProduct(${p.id})">
        ${discount > 0 ? `<div class="badge-off">-${discount}%</div>` : ''}
        ${p.bestseller ? `<div class="badge-top">⭐ TOP</div>` : ''}
        <div class="card-cat">${categoryLabel(p.category)}</div>
        <img src="${imgSrc}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x300/FFB6C1/333?text=Produto'">
        <div class="card-title">${p.name}</div>
        ${p.old_price ? `<div class="card-old-price">${formatMoney(p.old_price)}</div>` : ''}
        <div class="card-price">${formatMoney(p.price)}</div>
        <button class="btn-buy" onclick="event.stopPropagation(); addToCart(${p.id})">
            <i class="fas fa-shopping-bag"></i> ADICIONAR
        </button>
    </div>`;
}

/**
 * Retorna o label formatado de uma categoria.
 * @param {string} cat - Código da categoria
 * @returns {string}
 */
function categoryLabel(cat) {
    const map = {
        labios:  '💄 Lábios',
        olhos:   '👁️ Olhos',
        rosto:   '🌸 Rosto',
        pele:    '✨ Pele',
        perfume: '🌺 Perfume',
        kits:    '🎁 Kits'
    };
    return map[cat] || cat || '';
}

// ── Filtros de Categoria ──────────────────────────────────────

/** Inicializa os listeners de filtro no nav e nas filter-tags. */
function initCategoryNavigation() {
    document.querySelectorAll('.cat-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            filterCategory(link.dataset.cat);
        });
    });

    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterCategory(tag.dataset.cat);
        });
    });
}

/**
 * Aplica filtro de categoria e rerenderiza o grid.
 * @param {string} cat - Código da categoria ou 'all'
 */
function filterCategory(cat) {
    currentFilter = cat;
    currentPage   = 0;
    renderGrid();
    document.getElementById('collection-target')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Busca ─────────────────────────────────────────────────────

/** Inicializa a barra de busca com autocomplete e busca por clique. */
function initSearch() {
    const input       = document.getElementById('search');
    const suggestions = document.getElementById('searchSuggestions');
    if (!input || !suggestions) return;

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        if (q.length < 2) { suggestions.classList.remove('show'); return; }

        const results = allProducts.filter(p =>
            p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
        ).slice(0, 5);

        suggestions.innerHTML = results.length > 0
            ? results.map(p => `
                <div class="suggestion-item" onclick="openProductModal(${p.id}); suggestions.classList.remove('show')">
                    <img src="${p.image_url || p.images?.[0]}" onerror="this.src='https://via.placeholder.com/36/FFB6C1/333?text=P'">
                    <span>${p.name}</span>
                    <span style="margin-left:auto; color:var(--pink-vibrant); font-weight:700">${formatMoney(p.price)}</span>
                </div>`).join('')
            : `<div class="suggestion-item" style="color:#aaa">Nenhum produto encontrado.</div>`;

        suggestions.classList.add('show');
    });

    // Fecha sugestões ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar-center')) suggestions.classList.remove('show');
    });

    // Busca ao clicar no botão lupa
    document.querySelector('.search-btn')?.addEventListener('click', () => {
        const q = document.getElementById('search').value.toLowerCase().trim();
        if (!q) return;

        const result = allProducts.filter(p =>
            p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
        );
        const grid = document.getElementById('grid');
        if (grid) {
            grid.innerHTML = result.length > 0
                ? result.map(renderCard).join('')
                : '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#aaa">Nenhum produto encontrado.</p>';
            suggestions.classList.remove('show');
            document.getElementById('collection-target')?.scrollIntoView({ behavior: 'smooth' });
        }
    });
}


/* =============================================================
   PÁGINA DE PRODUTO
   ============================================================= */

/** Lê o ?id= da URL e popula todos os elementos da página de produto. */
function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    currentProduct = allProducts.find(p => p.id === id);

    if (!currentProduct) {
        document.querySelector('.product-page-container').innerHTML =
            "<h2 style='text-align:center; margin-top:50px'>Produto não encontrado.</h2>";
        return;
    }

    // Preços
    const realPrice = currentProduct.price;
    const oldPrice  = currentProduct.old_price || realPrice * 1.35;
    document.getElementById('pp-name').innerText = currentProduct.name;
    document.getElementById('pp-price').innerText = realPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('pp-old-price').innerText = oldPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('pp-installments').innerText =
        `ou 6x de ${(realPrice / 6).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sem juros`;

    // Galeria de imagens
    const images = currentProduct.images || [currentProduct.image_url || 'https://via.placeholder.com/400'];
    const mainImgEl = document.getElementById('main-image');
    if (mainImgEl) mainImgEl.src = images[0];

    const thumbsContainer = document.getElementById('pp-thumbnails');
    if (thumbsContainer && images.length > 1) {
        thumbsContainer.innerHTML = images.map((img, i) => `
            <div class="pp-thumb ${i === 0 ? 'active' : ''}" onclick="switchMainImage('${img}', this)">
                <img src="${img}" onerror="this.src='https://via.placeholder.com/70'">
            </div>`).join('');
    }

    // Botão adicionar ao carrinho (abre sidebar)
    const btnAdd = document.getElementById('btn-add-cart');
    if (btnAdd) {
        btnAdd.onclick = () => {
            for (let i = 0; i < currentQty; i++) addToCart(currentProduct.id);
            toggleCartSidebar();
        };
    }

    renderReviews();
}

/** Troca a imagem principal e destaca o thumb clicado. */
function switchMainImage(src, thumb) {
    document.getElementById('main-image').src = src;
    document.querySelectorAll('.pp-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

/** Altera a quantidade selecionada, mínimo 1. */
function changeQty(amount) {
    currentQty = Math.max(1, currentQty + amount);
    document.getElementById('qty-val').innerText = currentQty;
}

/** Alterna entre as abas Descrição / Composição / Modo de Usar. */
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-header span').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');
    event.target.classList.add('active');
}

// ── Mini-modal de produto (busca / queridinhos) ───────────────

/** Abre o mini-modal com as informações básicas de um produto. */
function openProductModal(id) {
    const p = allProducts.find(x => x.id == id);
    if (!p) return;
    currentModalProduct = p;
    document.getElementById('pm-img').src   = p.image_url || p.images?.[0] || 'https://via.placeholder.com/300';
    document.getElementById('pm-title').innerText = p.name;
    document.getElementById('pm-price').innerText = formatMoney(p.price);
    document.getElementById('pm-desc').innerText  = p.description || '';
    document.getElementById('pm-btn').onclick = () => { addToCart(id); closeP(); };
    document.getElementById('prodModal').style.display = 'flex';
}

function closeP() { document.getElementById('prodModal').style.display = 'none'; }

/** Redireciona para a página completa do produto aberto no mini-modal. */
function goToProductFromModal() {
    if (currentModalProduct) goToProduct(currentModalProduct.id);
}

/** Navega para a página de detalhe de um produto. */
function goToProduct(id) {
    window.location.href = `produto.html?id=${id}`;
}


/* =============================================================
   CARRINHO
   ============================================================= */

/**
 * Adiciona um produto ao carrinho e mostra feedback visual no botão.
 * @param {number|string} id - ID do produto
 */
function addToCart(id) {
    const p = allProducts.find(x => x.id == id);
    if (!p) return;

    cart.push(p);
    saveCart();

    // Flash verde no botão clicado
    const btn = event?.target?.closest('button');
    if (btn) {
        const oldBg = btn.style.background;
        btn.style.background = '#2ecc71';
        setTimeout(() => btn.style.background = oldBg, 500);
    }

    toggleCartSidebar();
}

/** Persiste o carrinho no localStorage e atualiza o badge. */
function saveCart() {
    localStorage.setItem('jhPinkCart', JSON.stringify(cart));
    updateCartUI();
}

/** Atualiza o badge de quantidade e os itens do sidebar (se aberto). */
function updateCartUI() {
    const count = document.getElementById('cart-count');
    if (count) count.innerText = cart.length;

    const sidebar = document.getElementById('cartSidebar');
    if (sidebar?.classList.contains('open')) renderSidebarItems();
}

/** Abre/fecha o sidebar do carrinho. */
function toggleCartSidebar() {
    const sidebar  = document.getElementById('cartSidebar');
    const overlay  = document.getElementById('overlaySidebar');
    if (!sidebar || !overlay) return;

    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');

    if (sidebar.classList.contains('open')) renderSidebarItems();
}

/** Renderiza a lista de itens dentro do sidebar do carrinho. */
function renderSidebarItems() {
    const container = document.getElementById('cartSidebarList');
    const totalEl   = document.getElementById('sidebarTotal');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:40px">Sua sacola está vazia.</p>';
        if (totalEl) totalEl.innerText = 'R$ 0,00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, i) => {
        total += item.price || 0;
        return `
        <div class="cart-item-side">
            <img src="${item.image_url || item.images?.[0] || ''}"
                 style="width:50px;height:50px;object-fit:contain;border-radius:8px"
                 onerror="this.src='https://via.placeholder.com/50'">
            <div style="flex:1; margin-left:10px;">
                <p style="font-size:0.8rem; font-weight:600;">${item.name}</p>
                <p style="color:var(--pink-vibrant); font-size:0.9rem">${formatMoney(item.price)}</p>
            </div>
            <i class="fas fa-trash" onclick="removeFromCart(${i})" style="cursor:pointer; color:#ccc; font-size:0.9rem;"></i>
        </div>`;
    }).join('');

    if (totalEl) totalEl.innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Remove um item do carrinho pelo índice. */
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
}


/* =============================================================
   PERFIL / AUTH
   ============================================================= */

/**
 * Abre o modal de perfil.
 * - Se logado: exibe dados do usuário + histórico de compras.
 * - Se não logado: exibe formulário de login/cadastro.
 */
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    if (loggedUser) {
        document.getElementById('profile-content').style.display = 'none';
        document.getElementById('profile-logged').style.display = 'block';
        document.getElementById('logged-name').innerText  = loggedUser.name  || 'Olá!';
        document.getElementById('logged-email').innerText = loggedUser.email || '';
        renderOrderHistory();
    } else {
        document.getElementById('profile-content').style.display = 'block';
        document.getElementById('profile-logged').style.display = 'none';
    }

    modal.style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

/** Alterna entre as abas Entrar / Cadastrar no modal de perfil. */
function showAuthTab(tab) {
    document.getElementById('auth-login').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('auth-register').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('tab-login-btn').classList.toggle('active', tab === 'login');
    document.getElementById('tab-reg-btn').classList.toggle('active', tab === 'register');
}

/**
 * Registra um novo usuário.
 * Salva no localStorage (funciona offline) e tenta salvar no Supabase.
 */
async function doRegister() {
    const name  = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const pass  = document.getElementById('reg-pass')?.value.trim();
    const errEl = document.getElementById('reg-error');
    const okEl  = document.getElementById('reg-success');

    if (!name || !email || !pass) {
        if (errEl) { errEl.innerText = 'Preencha todos os campos.'; errEl.style.display = 'block'; }
        return;
    }
    if (errEl) errEl.style.display = 'none';

    // Armazena localmente (garante login offline)
    localStorage.setItem('jhUser_' + email, JSON.stringify({ name, email, phone, pass }));

    // Tenta persistir no Supabase
    try {
        await supabaseQuery('clientes', {
            method: 'POST',
            body: { name, email, phone, password_hash: btoa(pass), created_at: new Date().toISOString() }
        });
    } catch (e) {
        console.warn('Supabase indisponível, cliente salvo apenas localmente:', e.message);
    }

    if (okEl) { okEl.innerText = `Cadastro realizado! Bem-vinda, ${name}!`; okEl.style.display = 'block'; }

    loggedUser = { name, email };
    localStorage.setItem('jhPinkUser', JSON.stringify(loggedUser));
    updateProfileUI();
    setTimeout(() => closeProfileModal(), 2000);
}

/**
 * Realiza login verificando primeiro o Supabase,
 * com fallback para localStorage.
 */
async function doLogin() {
    const email = document.getElementById('login-email')?.value.trim();
    const pass  = document.getElementById('login-pass')?.value.trim();
    const errEl = document.getElementById('login-error');

    if (!email || !pass) {
        if (errEl) { errEl.style.display = 'block'; errEl.innerText = 'Preencha e-mail e senha.'; }
        return;
    }

    // 1. Tenta verificar no Supabase
    try {
        const result = await supabaseQuery('clientes', {
            filters: `&email=eq.${encodeURIComponent(email)}&password_hash=eq.${encodeURIComponent(btoa(pass))}`
        });
        if (result && result.length > 0) {
            _loginSuccess({ name: result[0].name, email });
            return;
        }
    } catch (e) {
        console.warn('Supabase indisponível, verificando localmente:', e.message);
    }

    // 2. Fallback: localStorage
    const stored = localStorage.getItem('jhUser_' + email);
    if (stored) {
        const user = JSON.parse(stored);
        if (user.pass === pass) {
            _loginSuccess({ name: user.name, email });
            return;
        }
    }

    // 3. Conta admin de teste
    if (email === 'admin@jhpink.com' && pass === 'admin') {
        _loginSuccess({ name: 'Admin', email });
        return;
    }

    if (errEl) errEl.style.display = 'block';
}

/**
 * Finaliza o processo de login (usado por doLogin e loginAndPay).
 * @param {object} user - { name, email }
 */
function _loginSuccess(user) {
    loggedUser = user;
    localStorage.setItem('jhPinkUser', JSON.stringify(loggedUser));
    updateProfileUI();
    closeProfileModal();
}

/** Desloga o usuário atual. */
function doLogout() {
    loggedUser = null;
    localStorage.removeItem('jhPinkUser');
    updateProfileUI();
    closeProfileModal();
}

/** Atualiza o ícone de usuário no header (dourado = logado). */
function updateProfileUI() {
    const userIcon = document.querySelector('.icon-action[title="Minha Conta"] i, .icon-btn-prod[title="Minha Conta"] i');
    if (userIcon) userIcon.style.color = loggedUser ? 'var(--gold)' : '';
}

// ── Histórico de Compras ──────────────────────────────────────

/**
 * Busca e renderiza o histórico de pedidos do usuário logado.
 * Exibido no modal de perfil quando logado.
 */
async function renderOrderHistory() {
    const container = document.getElementById('order-history-list');
    if (!container || !loggedUser) return;

    container.innerHTML = '<p style="color:#aaa; font-size:0.85rem; text-align:center; padding:15px">Carregando pedidos...</p>';

    try {
        const orders = await supabaseQuery('pedidos', {
            filters: `&user_email=eq.${encodeURIComponent(loggedUser.email)}`,
            order: '&order=created_at.desc'
        });

        if (!orders || orders.length === 0) {
            container.innerHTML = '<p style="color:#aaa; font-size:0.85rem; text-align:center; padding:15px">Nenhum pedido ainda. Que tal explorar a loja? 💄</p>';
            return;
        }

        container.innerHTML = orders.map(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
            const date  = new Date(order.created_at).toLocaleDateString('pt-BR');
            return `
            <div class="order-history-item">
                <div class="order-history-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-date">${date}</span>
                    <span class="order-status ${order.status || 'pending'}">${_orderStatusLabel(order.status)}</span>
                </div>
                <div class="order-history-products">
                    ${items.slice(0, 3).map(item => `
                        <img src="${item.image_url || item.images?.[0] || 'https://via.placeholder.com/36'}"
                             title="${item.name}"
                             style="width:36px;height:36px;object-fit:contain;border-radius:6px;border:1px solid #eee"
                             onerror="this.src='https://via.placeholder.com/36'">
                    `).join('')}
                    ${items.length > 3 ? `<span style="font-size:0.8rem;color:#aaa;line-height:36px">+${items.length - 3}</span>` : ''}
                </div>
                <div class="order-history-total">${formatMoney(order.total)}</div>
            </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:#aaa; font-size:0.85rem; text-align:center; padding:15px">Não foi possível carregar os pedidos.</p>';
        console.warn('Erro ao buscar pedidos:', e.message);
    }
}

/**
 * Retorna o label legível de um status de pedido.
 * @param {string} status
 * @returns {string}
 */
function _orderStatusLabel(status) {
    const map = {
        pending:    '⏳ Pendente',
        paid:       '✅ Pago',
        shipped:    '🚚 Enviado',
        delivered:  '📦 Entregue',
        cancelled:  '❌ Cancelado'
    };
    return map[status] || '⏳ Pendente';
}


/* =============================================================
   CHECKOUT
   ============================================================= */

/** Abre o modal de checkout com o resumo do carrinho. */
function proceedToCheckout() {
    if (cart.length === 0) return alert('Adicione produtos antes de finalizar.');

    toggleCartSidebar();

    let total = 0;
    cart.forEach(i => total += i.price || 0);

    const cartList = document.getElementById('cartList');
    const totalVal = document.getElementById('totalVal');
    const modal    = document.getElementById('checkModal');

    if (cartList && totalVal && modal) {
        cartList.innerHTML = `
            <div style="text-align:center;padding:10px;background:#f9f9f9;border-radius:5px">
                Você tem <strong>${cart.length}</strong> itens no pedido.
            </div>`;
        totalVal.innerText = `Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        modal.style.display = 'flex';

        // Se já está logado, pula direto para o pagamento
        if (loggedUser) {
            _showCheckoutPaymentStep();
        } else {
            backToAuth();
        }
    }
}

function closeC() {
    document.getElementById('checkModal').style.display = 'none';
}

/** Alterna entre as abas Login e Cadastro dentro do checkout. */
function setTab(t) {
    const isLogin = t === 'login';
    document.getElementById('f-login').classList.toggle('hidden', !isLogin);
    document.getElementById('f-reg').classList.toggle('hidden', isLogin);

    const loginTab = document.getElementById('btn-login-tab');
    const regTab   = document.getElementById('btn-reg-tab');

    if (loginTab) {
        loginTab.style.background = isLogin ? 'var(--pink-vibrant)' : '#f0f0f0';
        loginTab.style.color      = isLogin ? '#fff' : '#666';
    }
    if (regTab) {
        regTab.style.background = !isLogin ? 'var(--pink-vibrant)' : '#f0f0f0';
        regTab.style.color      = !isLogin ? '#fff' : '#666';
    }
}

/** Cadastro rápido no fluxo de checkout. */
function regUser() {
    const email = document.getElementById('r-email').value.trim();
    const pass  = document.getElementById('r-pass').value.trim();
    const name  = document.getElementById('r-name').value.trim();

    if (email && pass && name) {
        localStorage.setItem('jhUser_' + email, JSON.stringify({ name, email, pass }));
        alert(`Cadastro realizado! Bem-vinda, ${name}!`);
        setTab('login');
        document.getElementById('l-email').value = email;
    } else {
        alert('Preencha todos os campos.');
    }
}

/**
 * Login no fluxo de checkout.
 * Verifica Supabase e localStorage, depois avança para pagamento.
 */
async function loginAndPay() {
    const email = document.getElementById('l-email').value.trim();
    const pass  = document.getElementById('l-pass').value.trim();
    const errEl = document.getElementById('login-error-checkout');

    // 1. Tenta Supabase
    try {
        const result = await supabaseQuery('clientes', {
            filters: `&email=eq.${encodeURIComponent(email)}&password_hash=eq.${encodeURIComponent(btoa(pass))}`
        });
        if (result && result.length > 0) {
            loggedUser = { name: result[0].name, email };
            localStorage.setItem('jhPinkUser', JSON.stringify(loggedUser));
            updateProfileUI();
            _showCheckoutPaymentStep();
            return;
        }
    } catch (e) {
        console.warn('Supabase indisponível no checkout:', e.message);
    }

    // 2. Fallback localStorage
    const stored = localStorage.getItem('jhUser_' + email);
    if (stored && JSON.parse(stored).pass === pass) {
        const user = JSON.parse(stored);
        loggedUser = { name: user.name, email };
        localStorage.setItem('jhPinkUser', JSON.stringify(loggedUser));
        updateProfileUI();
        _showCheckoutPaymentStep();
        return;
    }

    // 3. Admin de teste
    if ((email === 'admin@jhpink.com' || email === 'admin') && pass === 'admin') {
        loggedUser = { name: 'Admin', email };
        localStorage.setItem('jhPinkUser', JSON.stringify(loggedUser));
        updateProfileUI();
        _showCheckoutPaymentStep();
        return;
    }

    if (errEl) errEl.style.display = 'block';
}

/** Exibe o step de pagamento e oculta o step de autenticação. */
function _showCheckoutPaymentStep() {
    document.getElementById('flow-auth').classList.add('hidden');
    document.getElementById('flow-pay').classList.remove('hidden');
}

/** Volta para o step de autenticação dentro do checkout. */
function backToAuth() {
    document.getElementById('flow-auth').classList.remove('hidden');
    document.getElementById('flow-pay').classList.add('hidden');
}

/** Exibe campos de cartão ou PIX conforme seleção do usuário. */
function chkPay() {
    const method  = document.getElementById('pay-method').value;
    const isCard  = method === 'card';
    const isPix   = method === 'pix';

    document.getElementById('card-dets').style.display = isCard ? 'block' : 'none';
    document.getElementById('pix-dets').style.display  = isPix  ? 'block' : 'none';

    if (isPix) _generatePixQR();
}

/**
 * Gera o QR Code PIX com o valor do pedido (5% de desconto).
 * Usa a biblioteca QRCode.js via CDN.
 */
function _generatePixQR() {
    const loadingEl = document.getElementById('pix-qr-loading');
    const imgEl     = document.getElementById('pix-qr-img');
    const totalEl   = document.getElementById('pix-total-label');

    if (!imgEl) return;

    // Calcula total com desconto de 5%
    let total = cart.reduce((sum, i) => sum + (i.price || 0), 0);
    const discount = total * 0.05;
    total = total - discount;

    if (totalEl) {
        totalEl.innerHTML = `
            <span style="text-decoration:line-through; color:#bbb">${formatMoney(total / 0.95)}</span>
            &nbsp;→&nbsp;
            <strong style="color:var(--pink-vibrant)">${formatMoney(total)}</strong>
            <span style="color:#2ecc71; font-size:0.75rem;"> (-5%)</span>`;
    }

    // Dados do Pix (EMV simplificado para demo)
    const pixKey    = 'jhpink@pagamentos.com';
    const pixString = `PIX|${pixKey}|JH Pink|${total.toFixed(2)}|Pedido JH Pink`;
    const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=1a1a2e&data=${encodeURIComponent(pixString)}`;

    // Mostra loading, esconde img até carregar
    if (loadingEl) loadingEl.style.display = 'flex';
    imgEl.style.display = 'none';

    imgEl.onload = () => {
        imgEl.style.display = 'block';
        if (loadingEl) loadingEl.style.display = 'none';
    };
    imgEl.onerror = () => {
        if (loadingEl) loadingEl.style.display = 'none';
        imgEl.alt = 'Erro ao gerar QR Code. Use a chave PIX abaixo.';
        imgEl.style.display = 'block';
    };
    imgEl.src = qrUrl;
}


/**
 * Copia a chave PIX para a área de transferência e dá feedback visual.
 */
async function copyPixKey() {
    const keyEl = document.getElementById('pix-key-text');
    const btn   = document.getElementById('btn-copy-pix');
    if (!keyEl || !btn) return;

    const key = keyEl.innerText;

    try {
        await navigator.clipboard.writeText(key);
    } catch (e) {
        // Fallback para navegadores sem suporte à Clipboard API
        const input = document.createElement('input');
        input.value = key;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    }

    // Feedback visual no botão
    btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    btn.style.background = '#2ecc71';
    btn.style.borderColor = '#2ecc71';
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
        btn.style.background = '';
        btn.style.borderColor = '';
    }, 2500);
}

/**
 * Confirma o pedido: salva no Supabase (tabela 'pedidos')
 * e limpa o carrinho.
 */
async function finish() {
    if (!loggedUser) {
        alert('Faça login para confirmar o pedido.');
        return;
    }

    let total = 0;
    cart.forEach(i => total += i.price || 0);

    const payMethod = document.getElementById('pay-method')?.value || 'card';
    if (payMethod === 'pix') total = total * 0.95; // 5% de desconto PIX

    const order = {
        user_email:   loggedUser.email,
        user_name:    loggedUser.name,
        cliente_nome: loggedUser.name,      // campo lido pelo admin
        items:        JSON.stringify(cart),  // produtos como JSON
        items_count:  cart.length,          // contagem lida pelo admin
        pagamento:    payMethod,            // campo lido pelo admin
        total:        parseFloat(total.toFixed(2)),
        status:       'paid',               // pedido confirmado = pago
        payment:      payMethod,
        created_at:   new Date().toISOString()
    };

    // Salva no Supabase (tabela pedidos)
    try {
        await supabaseQuery('pedidos', { method: 'POST', body: order });
        console.log('Pedido salvo no Supabase com sucesso.');
    } catch (e) {
        console.warn('Supabase indisponível, pedido salvo apenas localmente:', e.message);
        // Salva localmente como fallback para não perder o pedido
        const localOrders = JSON.parse(localStorage.getItem('jhPinkOrders') || '[]');
        localOrders.push({ ...order, id: Date.now() });
        localStorage.setItem('jhPinkOrders', JSON.stringify(localOrders));
    }

    alert('✨ Pedido Confirmado! Obrigado por comprar na JH Pink.');
    cart = [];
    saveCart();
    closeC();
    window.location.href = 'index.html';
}


/* =============================================================
   MODAIS AUXILIARES
   ============================================================= */

function openTrackModal()    { document.getElementById('trackModal').style.display = 'flex'; }
function closeTrack()        { document.getElementById('trackModal').style.display = 'none'; }
function openExchangeModal() { document.getElementById('exchangeModal').style.display = 'flex'; }
function closeExchange()     { document.getElementById('exchangeModal').style.display = 'none'; }
function closeInfoModal()    { document.getElementById('infoModal').style.display = 'none'; }

/**
 * Abre o modal informativo com conteúdo dinâmico.
 * @param {string} key - 'about' | 'track' | 'exchange'
 */
function openInfoModal(key) {
    const titles = { about: 'Quem Somos', track: 'Política de Frete', exchange: 'Trocas e Devoluções' };
    document.getElementById('infoModal').style.display = 'flex';
    document.getElementById('info-title').innerText     = titles[key] || '';
    document.getElementById('info-content').innerHTML  = INFO_TEXTS[key] || '';
}


/* =============================================================
   REVIEWS
   ============================================================= */

/** Renderiza as avaliações fixas na página de produto. */
function renderReviews() {
    const reviews = [
        { author: 'Ana C.',   text: 'Produto incrível! Chegou antes do prazo e a embalagem era linda. Super recomendo!', stars: 5, tag: 'Compra Verificada' },
        { author: 'Maria L.', text: 'Qualidade excelente, a cobertura é perfeita e dura o dia todo. Amei!',             stars: 5, tag: 'Compra Verificada' },
        { author: 'Júlia R.', text: 'Cheiro maravilhoso e textura suave. Minha pele amou. Voltarei a comprar!',         stars: 4, tag: 'Compra Verificada' },
    ];

    const container = document.getElementById('reviews-list');
    if (!container) return;

    container.innerHTML = reviews.map(r => `
        <div class="review-card">
            <span class="review-author">${r.author} <span class="review-tag">${r.tag}</span></span>
            <div class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
            <p style="color:#555; font-size:0.9rem; margin-top:5px">${r.text}</p>
        </div>`).join('');
}


/* =============================================================
   UTILITÁRIOS
   ============================================================= */

/**
 * Formata um número como moeda BRL.
 * @param {number} val
 * @returns {string} Ex: "R$ 49,90"
 */
function formatMoney(val) {
    if (!val && val !== 0) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Faz scroll suave até um elemento pelo ID.
 * @param {string} id - ID do elemento alvo
 */
function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}


/* =============================================================
   INICIALIZA
   ============================================================= */
init();
