/* =========================================
   1. ESTADO GLOBAL, DADOS E TEXTOS
   ========================================= */
let apiData = [];
let cart = JSON.parse(localStorage.getItem('jhPinkCart')) || []; // Persistência do carrinho

// Textos das Políticas (Para os Modais do Rodapé)
const infoTexts = {
    about: `
        <p>A <strong>JH Pink</strong> nasceu com uma missão clara: democratizar o acesso à beleza de alta qualidade.</p>
        <p>Nossa curadoria é feita por especialistas que buscam as tendências globais e as trazem até você com exclusividade. Cada produto é testado e aprovado para garantir o selo de qualidade Pink.</p>
    `,
    track: `
        <p><strong>Prazos e Rastreamento</strong></p>
        <p>O código de rastreio é enviado para seu e-mail em até 24h após o faturamento do pedido.</p>
        <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">
        <p><strong>Estimativa de Entrega:</strong></p>
        <ul style="text-align:left; font-size:0.9rem; list-style:none; padding-left:10px;">
            <li style="margin-bottom:5px">📍 <strong>Sudeste:</strong> 1 a 3 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Sul:</strong> 3 a 5 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Centro-Oeste:</strong> 4 a 6 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Nordeste:</strong> 6 a 9 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Norte:</strong> 8 a 15 dias úteis</li>
        </ul>
    `,
    exchange: `
        <p><strong>Política de Trocas e Devoluções</strong></p>
        <p>Você tem até <strong>7 dias corridos</strong> após o recebimento para solicitar a devolução por arrependimento.</p>
        <p>Para defeitos de fabricação, o prazo é de 30 dias. Utilize o formulário "Trocas e Devoluções" no topo do site para agilizar seu atendimento.</p>
    `
};

/* =========================================
   2. INICIALIZAÇÃO (DETECTA A PÁGINA)
   ========================================= */
async function init() {
    updateCartUI(); // Atualiza a bolinha do carrinho imediatamente

    try {
        // Carrega produtos (Simulação API)
        const req = await fetch('https://makeup-api.herokuapp.com/api/v1/products.json?brand=maybelline');
        apiData = await req.json();

        // Verifica em qual página estamos procurando um elemento exclusivo da página de produto
        const isProductPage = document.getElementById('pp-name');
        
        if (isProductPage) {
            loadProductDetails(); // Lógica da Página de Produto
        } else {
            loadHomePage(); // Lógica da Home (Grid, Carrossel, Promoção)
        }

    } catch(e) {
        console.error("Erro API:", e);
    }
}

/* =========================================
   3. FUNÇÕES ESPECÍFICAS DA HOME (index.html)
   ========================================= */
function loadHomePage() {
    // 1. Carrossel
    const trackElement = document.getElementById('track');
    if(trackElement) {
        const top = apiData.slice(0, 8);
        const infinite = [...top, ...top]; // Duplica para efeito infinito
        trackElement.innerHTML = infinite.map(p => `
            <div class="c-item" onclick="goToProduct(${p.id})">
                <img src="${p.image_link}" onerror="this.src='https://via.placeholder.com/150'">
                <p style="font-size:0.75rem; font-weight:700; margin-top:8px; height:30px; overflow:hidden">${p.name}</p>
                <p style="color:var(--pink-vibrant); font-weight:700">${formatMoney(p.price)}</p>
            </div>
        `).join('');
    }

    // 2. Grid Principal
    renderGrid(apiData.slice(8, 28));

    // 3. Promoção Relâmpago (Apenas na Home)
    triggerPromo();
}

function renderGrid(list) {
    const grid = document.getElementById('grid');
    if(!grid) return;

    grid.innerHTML = list.map(p => `
        <div class="card">
            <div class="badge-off">NEW</div>
            <img src="${p.image_link}" onclick="goToProduct(${p.id})" style="cursor:pointer" onerror="this.src='https://via.placeholder.com/150'">
            <div class="card-title">${p.name}</div>
            <div class="card-price">${formatMoney(p.price)}</div>
            
            <div style="display:flex; gap:5px; width:100%; margin-top:10px;">
                <button class="btn-buy" style="flex:1; background:#333;" onclick="addToCart(${p.id})">
                    <i class="fas fa-shopping-bag"></i>
                </button>
                <button class="btn-buy" style="flex:3;" onclick="goToProduct(${p.id})">
                    COMPRAR
                </button>
            </div>
        </div>
    `).join('');
}

// Redireciona para a nova página de produto
function goToProduct(id) {
    window.location.href = `produto.html?id=${id}`;
}

// Promoção Relâmpago (Popup)
function triggerPromo() {
    if(apiData.length < 3) return;
    const shuffled = [...apiData].sort(() => 0.5 - Math.random());
    const promoItems = shuffled.slice(0, 3);
    
    const promoGrid = document.getElementById('promoGrid');
    if(promoGrid) {
        promoGrid.innerHTML = promoItems.map(p => `
            <div style="background:white; padding:10px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.05); display:flex; flex-direction:column; align-items:center;">
                <img src="${p.image_link}" style="width:60px; height:60px; object-fit:contain" onerror="this.src='https://via.placeholder.com/60'">
                <p style="font-size:0.7rem; margin:5px 0; height:30px; overflow:hidden; text-align:center;">${p.name}</p>
                <div style="margin-top:auto; width:100%">
                    <p style="text-decoration:line-through; color:#aaa; font-size:0.7rem; text-align:center;">${formatMoney(p.price)}</p>
                    <p style="color:red; font-weight:bold; font-size:0.9rem; text-align:center;">${(p.price * 4.0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <button onclick="addToCart(${p.id}); closePromo()" style="background:var(--pink-vibrant); color:white; border:none; width:100%; padding:5px; border-radius:5px; margin-top:5px; cursor:pointer; font-size:0.7rem">PEGAR</button>
                </div>
            </div>
        `).join('');
    }
    
    setTimeout(() => {
        const promoModal = document.getElementById('promoModal');
        if(promoModal) promoModal.style.display = 'flex';
    }, 5000); // Aparece após 5 segundos
}
function closePromo() { 
    const pm = document.getElementById('promoModal');
    if(pm) pm.style.display = 'none'; 
}

/* =========================================
   4. FUNÇÕES ESPECÍFICAS DE PRODUTO (produto.html)
   ========================================= */
let currentQty = 1;
let currentProduct = null;

function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    currentProduct = apiData.find(p => p.id === id);

    if(!currentProduct) {
        document.querySelector('.product-page-container').innerHTML = "<h2 style='text-align:center; margin-top:50px'>Produto não encontrado.</h2>";
        return;
    }

    // --- Preenche textos ---
    document.getElementById('pp-name').innerText = currentProduct.name;
    
    // --- Preenche Imagem Principal (Sem Galeria/Miniaturas) ---
    const mainImg = document.getElementById('main-image');
    mainImg.src = currentProduct.image_link;
    mainImg.onerror = () => { mainImg.src = 'https://via.placeholder.com/400?text=JH+Pink'; };
    
    // --- Preços ---
    const realPrice = currentProduct.price * 5.5;
    document.getElementById('pp-price').innerText = realPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('pp-old-price').innerText = (realPrice * 1.4).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('pp-installments').innerText = `ou 6x de ${(realPrice/6).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} sem juros`;

    // --- Ação do Botão Adicionar ---
    const btnAdd = document.getElementById('btn-add-cart');
    if(btnAdd) {
        btnAdd.onclick = () => {
            for(let i=0; i<currentQty; i++) {
                cart.push(currentProduct);
            }
            saveCart();
            toggleCartSidebar(); // Abre o carrinho
        };
    }

    renderReviews();
}

function changeQty(amount) {
    currentQty += amount;
    if(currentQty < 1) currentQty = 1;
    document.getElementById('qty-val').innerText = currentQty;
}

function switchTab(tabName) {
    // Esconde todos
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-header span').forEach(el => el.classList.remove('active'));
    
    // Mostra o selecionado
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    event.target.classList.add('active');
}

function renderReviews() {
    // Dados falsos para compor o layout
    const reviews = [
        { name: "Ana Clara", title: "Cheiro de Perigosa", txt: "Cheiro de mulher decidida, um doce confortável e suculento. Amei!", stars: 5 },
        { name: "Beatriz S.", title: "Muito bom só comprem", txt: "Minha irmã usa esse perfume e eu tive que comprar um igual. Fixação ótima.", stars: 5 },
        { name: "Fernanda L.", title: "Tem cheiro de flor", txt: "Um dos meus cheiros favoritos. Chegou super rápido.", stars: 4 }
    ];
    const list = document.getElementById('reviews-list');
    if(list) {
        list.innerHTML = reviews.map(r => `
            <div class="review-card">
                <span class="review-author">${r.name} <span class="review-tag"><i class="fas fa-check"></i> Compra Verificada</span></span>
                <div class="stars">${'★'.repeat(r.stars)}</div>
                <strong>${r.title}</strong>
                <p style="color:#666; font-size:0.9rem; margin-top:5px">${r.txt}</p>
            </div>
        `).join('');
    }
}

/* =========================================
   5. MODAIS GLOBAIS (HEADER E FOOTER)
   ========================================= */

// --- HEADER: Rastreio ---
function openTrackModal() { document.getElementById('trackModal').style.display = 'flex'; }
function closeTrack() { document.getElementById('trackModal').style.display = 'none'; }

// --- HEADER: Trocas ---
function openExchangeModal() { document.getElementById('exchangeModal').style.display = 'flex'; }
function closeExchange() { document.getElementById('exchangeModal').style.display = 'none'; }

// --- FOOTER: Informações (Políticas) ---
function openInfoModal(type) {
    const modal = document.getElementById('infoModal');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');

    if (type === 'about') {
        title.innerText = "Nossa História";
        content.innerHTML = infoTexts.about;
    } else if (type === 'track') {
        title.innerText = "Política de Frete";
        content.innerHTML = infoTexts.track;
    } else if (type === 'exchange') {
        title.innerText = "Trocas e Devoluções";
        content.innerHTML = infoTexts.exchange;
    }
    modal.style.display = 'flex';
}
function closeInfoModal() { document.getElementById('infoModal').style.display = 'none'; }

/* =========================================
   6. CARRINHO (SIDEBAR) E UTILITÁRIOS
   ========================================= */
function saveCart() {
    localStorage.setItem('jhPinkCart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(id) {
    const p = apiData.find(x => x.id === id);
    if(p) {
        cart.push(p);
        saveCart();
        
        // Efeito visual no botão
        const btn = event.target.closest('button');
        if(btn) {
            const oldColor = btn.style.background;
            btn.style.background = "#2ecc71"; // Verde
            setTimeout(() => btn.style.background = oldColor, 500);
        }
        updateCartUI();
        toggleCartSidebar();
    }
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    if(countEl) countEl.innerText = cart.length;
    
    // Se a sidebar estiver aberta, atualiza a lista visualmente
    const sb = document.getElementById('cartSidebar');
    if(sb && sb.classList.contains('open')) {
        renderSidebarItems();
    }
}

function toggleCartSidebar() {
    const sb = document.getElementById('cartSidebar');
    const ov = document.getElementById('overlaySidebar');
    if(sb && ov) {
        sb.classList.toggle('open');
        ov.classList.toggle('open');
        if(sb.classList.contains('open')) renderSidebarItems();
    }
}

function renderSidebarItems() {
    const container = document.getElementById('cartSidebarList');
    const totalEl = document.getElementById('sidebarTotal');
    
    if(!container) return;

    if(cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:40px">Sua sacola está vazia.</p>';
        if(totalEl) totalEl.innerText = "R$ 0,00";
        return;
    }

    let t = 0;
    container.innerHTML = cart.map((item, index) => {
        const price = item.price ? item.price * 5.5 : 0;
        t += price;
        return `
            <div class="cart-item-side">
                <img src="${item.image_link}" onerror="this.src='https://via.placeholder.com/50'">
                <div style="flex:1; margin-left:10px;">
                    <p style="font-size:0.8rem; font-weight:600;">${item.name}</p>
                    <p style="color:var(--pink-vibrant); font-size:0.9rem">${formatMoney(item.price)}</p>
                </div>
                <i class="fas fa-trash" onclick="removeFromCart(${index})" style="cursor:pointer; color:#ccc;"></i>
            </div>
        `;
    }).join('');
    
    if(totalEl) totalEl.innerText = t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
}

/* =========================================
   7. CHECKOUT (LOGIN E PAGAMENTO)
   ========================================= */
function proceedToCheckout() {
    if(cart.length === 0) return alert("Adicione produtos antes de finalizar.");
    
    toggleCartSidebar(); // Fecha sidebar
    
    let t = 0;
    cart.forEach(i => t += (i.price ? i.price * 5.5 : 0));
    
    const cartList = document.getElementById('cartList');
    const totalVal = document.getElementById('totalVal');
    const modal = document.getElementById('checkModal');

    if(cartList && totalVal && modal) {
        cartList.innerHTML = `<div style="text-align:center; padding:10px; background:#f9f9f9; border-radius:5px">Você tem <strong>${cart.length}</strong> itens no pedido.</div>`;
        totalVal.innerText = `Total: ${t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        
        modal.style.display = 'flex';
        // Reseta estado do modal
        backToAuth();
        const err = document.getElementById('login-error');
        if(err) err.style.display = 'none';
    }
}

function closeC() { document.getElementById('checkModal').style.display = 'none'; }

// Sistema de Abas (Login / Cadastro)
function setTab(t) {
    const isLogin = t === 'login';
    document.getElementById('f-login').classList.toggle('hidden', !isLogin);
    document.getElementById('f-reg').classList.toggle('hidden', isLogin);
    
    const btnLogin = document.getElementById('btn-login-tab');
    const btnReg = document.getElementById('btn-reg-tab');
    
    if(isLogin) {
        btnLogin.style.background = 'var(--pink-vibrant)'; btnLogin.style.color = '#fff';
        btnReg.style.background = '#f0f0f0'; btnReg.style.color = '#666';
    } else {
        btnReg.style.background = 'var(--pink-vibrant)'; btnReg.style.color = '#fff';
        btnLogin.style.background = '#f0f0f0'; btnLogin.style.color = '#666';
    }
}

// Simula Cadastro
function regUser() {
    const email = document.getElementById('r-email').value.trim();
    const pass = document.getElementById('r-pass').value.trim();
    const name = document.getElementById('r-name').value.trim();
    
    if(email && pass && name) {
        localStorage.setItem(email, pass);
        alert(`Parabéns, ${name}! Cadastro realizado com sucesso.`);
        setTab('login');
        document.getElementById('l-email').value = email;
    } else { 
        alert("Preencha todos os campos."); 
    }
}

// Simula Login
function loginAndPay() {
    const email = document.getElementById('l-email').value.trim();
    const pass = document.getElementById('l-pass').value.trim();
    const errorMsg = document.getElementById('login-error');
    const storedPass = localStorage.getItem(email);

    // Login genérico para teste se não houver cadastro: admin/admin
    if((storedPass && storedPass === pass) || (email === 'admin' && pass === 'admin')) {
        document.getElementById('flow-auth').classList.add('hidden');
        document.getElementById('flow-pay').classList.remove('hidden');
    } else {
        errorMsg.style.display = 'block';
        errorMsg.innerText = "E-mail ou senha incorretos.";
    }
}

function backToAuth() {
    document.getElementById('flow-auth').classList.remove('hidden');
    document.getElementById('flow-pay').classList.add('hidden');
}

function chkPay() {
    const m = document.getElementById('pay-method').value;
    document.getElementById('card-dets').style.display = m === 'card' ? 'block' : 'none';
    document.getElementById('pix-dets').style.display = m === 'pix' ? 'block' : 'none';
}

function finish() {
    alert("✨ Pedido Confirmado! Obrigado por comprar na JH Pink.");
    cart = [];
    saveCart();
    closeC();
    window.location.href = "index.html"; // Volta para a home limpa
}

/* =========================================
   8. UTILITÁRIOS GERAIS
   ========================================= */
function scrollC(dir) { 
    const t = document.getElementById('track');
    if(t) t.scrollBy({ left: dir * 220, behavior: 'smooth' }); 
}

function scrollToCollection() { 
    const el = document.getElementById('collection-target');
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}

function formatMoney(val) {
    const price = val ? val * 5.5 : 0;
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicializa o sistema
init();