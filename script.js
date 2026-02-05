/* =========================================
   1. ESTADO GLOBAL E DADOS
   ========================================= */
let apiData = [];
let cart = [];

// Textos das Políticas (Para o Rodapé e Info)
const infoTexts = {
    about: `
        <p>A <strong>JH Pink</strong> nasceu com uma missão clara: democratizar o acesso à beleza de alta qualidade.</p>
        <p>Nossa curadoria é feita por especialistas que buscam as tendências globais e as trazem até você com exclusividade.</p>
        <p>Mais do que uma loja, somos uma comunidade apaixonada por autocuidado e autoestima.</p>
    `,
    track: `
        <p><strong>Prazos e Rastreamento</strong></p>
        <p>O código de rastreio é enviado para seu e-mail em até 24h após o faturamento.</p>
        <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">
        <p><strong>Estimativa de Entrega por Região:</strong></p>
        <ul style="text-align:left; font-size:0.9rem; list-style:none; padding-left:10px;">
            <li style="margin-bottom:5px">📍 <strong>Sudeste:</strong> 1 a 3 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Sul:</strong> 3 a 5 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Centro-Oeste:</strong> 4 a 6 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Nordeste:</strong> 6 a 9 dias úteis</li>
            <li style="margin-bottom:5px">📍 <strong>Norte:</strong> 8 a 15 dias úteis</li>
        </ul>
        <p style="margin-top:15px; font-size:0.8rem; color:#888;">*Prazos contados a partir da postagem.</p>
    `,
    exchange: `
        <p><strong>Política de Trocas e Devoluções</strong></p>
        <p>Queremos que você ame seu produto! Caso contrário, você tem até <strong>7 dias corridos</strong> após o recebimento para solicitar a devolução por arrependimento.</p>
        <p>Para defeitos de fabricação, o prazo é de 30 dias.</p>
        <p>O produto deve estar lacrado e sem uso. Use o formulário no topo do site ou envie e-mail para <em>trocas@jhpink.com</em>.</p>
    `
};

/* =========================================
   2. INICIALIZAÇÃO (API E GRID)
   ========================================= */
async function init() {
    try {
        document.getElementById('grid').innerHTML = '<p style="text-align:center; padding:20px; width:100%; color:#888;">Carregando Coleção Exclusiva...</p>';

        const req = await fetch('https://makeup-api.herokuapp.com/api/v1/products.json?brand=maybelline');
        apiData = await req.json();
        
        // Carrossel
        const top = apiData.slice(0, 8);
        const infinite = [...top, ...top, ...top];
        const trackElement = document.getElementById('track');
        if(trackElement) {
            trackElement.innerHTML = infinite.map(p => `
                <div class="c-item" onclick="viewProduct(${p.id})">
                    <img src="${p.image_link}" onerror="this.src='https://via.placeholder.com/150'">
                    <p style="font-size:0.75rem; font-weight:700; margin-top:8px; height:30px; overflow:hidden">${p.name}</p>
                    <p style="color:var(--pink-vibrant); font-weight:700">${formatMoney(p.price)}</p>
                </div>
            `).join('');
        }

        // Grid Principal
        renderGrid(apiData.slice(8, 28));
        
        // Promoção Relâmpago
        triggerPromo();

    } catch(e) { 
        console.error("Erro API:", e);
        document.getElementById('grid').innerHTML = '<p style="text-align:center">Erro ao carregar produtos.</p>';
    }
}

function renderGrid(list) {
    document.getElementById('grid').innerHTML = list.map(p => `
        <div class="card">
            <div class="badge-off">NEW</div>
            <img src="${p.image_link}" onclick="viewProduct(${p.id})" style="cursor:pointer" onerror="this.src='https://via.placeholder.com/150'">
            <div class="card-title">${p.name}</div>
            <div class="card-price">${formatMoney(p.price)}</div>
            <button class="btn-buy" onclick="addToCart(${p.id})">COMPRAR</button>
        </div>
    `).join('');
}

function formatMoney(val) {
    const price = val ? val * 5.5 : 0;
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Busca
const searchInput = document.getElementById('search');
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filt = apiData.filter(x => x.name.toLowerCase().includes(val));
        renderGrid(filt.slice(0,20));
    });
}

/* =========================================
   3. SIDEBAR E CARRINHO
   ========================================= */
function addToCart(id) {
    const p = apiData.find(x => x.id === id);
    if(p) {
        cart.push(p);
        updateCartUI();
        
        const btn = event.target;
        if(btn.tagName === 'BUTTON') {
            const oldText = btn.innerText;
            btn.innerText = "ADD ✔";
            btn.style.background = "var(--pink-vibrant)";
            btn.style.color = "white";
            setTimeout(() => {
                btn.innerText = oldText;
                btn.style.background = "";
                btn.style.color = "";
            }, 1000);
        }
    }
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    if(document.getElementById('cartSidebar').classList.contains('open')) {
        renderSidebarItems();
    }
}

function toggleCartSidebar() {
    const sb = document.getElementById('cartSidebar');
    const ov = document.getElementById('overlaySidebar');
    sb.classList.toggle('open');
    ov.classList.toggle('open');
    if(sb.classList.contains('open')) renderSidebarItems();
}

function renderSidebarItems() {
    const container = document.getElementById('cartSidebarList');
    const totalEl = document.getElementById('sidebarTotal');
    
    if(cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:40px">Sua sacola está vazia.</p>';
        totalEl.innerText = "R$ 0,00";
        return;
    }

    let t = 0;
    container.innerHTML = cart.map((item, index) => {
        const price = item.price ? item.price * 5.5 : 0;
        t += price;
        return `
            <div class="cart-item-side">
                <img src="${item.image_link}" onerror="this.src='https://via.placeholder.com/50'">
                <div style="text-align:left; flex:1">
                    <p style="font-size:0.8rem; font-weight:600; margin-bottom:5px">${item.name}</p>
                    <p style="color:var(--pink-vibrant); font-size:0.9rem">${formatMoney(item.price)}</p>
                </div>
                <i class="fas fa-trash" onclick="removeFromCart(${index})" style="cursor:pointer; color:#ccc; font-size:0.9rem; align-self:center; padding:10px;"></i>
            </div>
        `;
    }).join('');
    
    totalEl.innerText = t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

/* =========================================
   4. PROMOÇÃO RELÂMPAGO
   ========================================= */
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
                    <button onclick="addToCart(${p.id}); closePromo()" style="background:var(--pink-vibrant); color:white; border:none; width:100%; padding:5px; border-radius:5px; margin-top:5px; cursor:pointer; font-size:0.7rem">PEGAR OFERTA</button>
                </div>
            </div>
        `).join('');
    }
    setTimeout(() => {
        const promoModal = document.getElementById('promoModal');
        if(promoModal) promoModal.style.display = 'flex';
    }, 1500);
}
function closePromo() { 
    const pm = document.getElementById('promoModal');
    if(pm) pm.style.display = 'none'; 
}

/* =========================================
   5. GERENCIAMENTO DE MODAIS (Forms vs Textos)
   ========================================= */

// --- MODAIS DE FORMULÁRIO (Ação do Header) ---
function openTrackModal() { document.getElementById('trackModal').style.display = 'flex'; }
function closeTrack() { document.getElementById('trackModal').style.display = 'none'; }

function openExchangeModal() { document.getElementById('exchangeModal').style.display = 'flex'; }
function closeExchange() { document.getElementById('exchangeModal').style.display = 'none'; }

// --- MODAIS DE INFORMAÇÃO (Rodapé) ---
function openInfoModal(type) {
    const modal = document.getElementById('infoModal');
    const title = document.getElementById('info-title');
    const content = document.getElementById('info-content');

    if (type === 'about') {
        title.innerText = "Nossa História";
        content.innerHTML = infoTexts.about;
    } else if (type === 'track') {
        title.innerText = "Política de Frete";
        content.innerHTML = infoTexts.track; // Aqui contém os novos prazos
    } else if (type === 'exchange') {
        title.innerText = "Trocas e Devoluções";
        content.innerHTML = infoTexts.exchange;
    }
    modal.style.display = 'flex';
}

function closeInfoModal() {
    document.getElementById('infoModal').style.display = 'none';
}

/* =========================================
   6. DETALHES DO PRODUTO
   ========================================= */
function viewProduct(id) {
    const p = apiData.find(x => x.id === id);
    if(!p) return;
    document.getElementById('pm-img').src = p.image_link;
    document.getElementById('pm-title').innerText = p.name;
    document.getElementById('pm-desc').innerText = "Este produto exclusivo da linha JH Pink oferece acabamento profissional, longa duração e pigmentação intensa.";
    document.getElementById('pm-price').innerText = formatMoney(p.price);
    const btn = document.getElementById('pm-btn');
    btn.onclick = () => { addToCart(p.id); closeP(); };
    btn.innerText = "ADICIONAR À SACOLA";
    document.getElementById('prodModal').style.display = 'flex';
}
function closeP() { document.getElementById('prodModal').style.display = 'none'; }
function scrollC(dir) { document.getElementById('track').scrollBy({ left: dir * 220, behavior: 'smooth' }); }

/* =========================================
   7. CHECKOUT
   ========================================= */
function proceedToCheckout() {
    if(cart.length === 0) return alert("Adicione produtos antes de finalizar.");
    toggleCartSidebar();
    let t = 0;
    cart.forEach(i => t += (i.price ? i.price * 5.5 : 0));
    
    document.getElementById('cartList').innerHTML = `
        <div style="background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:15px;">
            <p style="text-align:center; color:#555;">Resumo do Pedido</p>
            <p style="text-align:center; font-weight:bold; font-size:1.2rem; margin-top:5px;">${cart.length} Itens</p>
        </div>
    `;
    document.getElementById('totalVal').innerText = `Total Final: ${t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    document.getElementById('checkModal').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none';
    backToAuth(); 
}
function closeC() { document.getElementById('checkModal').style.display = 'none'; }
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
function regUser() {
    const email = document.getElementById('r-email').value.trim();
    const pass = document.getElementById('r-pass').value.trim();
    const name = document.getElementById('r-name').value.trim();
    if(email && pass && name) {
        localStorage.setItem(email, pass);
        alert(`Parabéns, ${name}! Cadastro realizado.`);
        setTab('login');
        document.getElementById('l-email').value = email;
    } else { alert("Por favor, preencha todos os campos."); }
}
function loginAndPay() {
    const email = document.getElementById('l-email').value.trim();
    const pass = document.getElementById('l-pass').value.trim();
    const errorMsg = document.getElementById('login-error');
    const storedPass = localStorage.getItem(email);
    if(storedPass && storedPass === pass) {
        document.getElementById('flow-auth').classList.add('hidden');
        document.getElementById('flow-pay').classList.remove('hidden');
    } else {
        errorMsg.style.display = 'block'; errorMsg.innerText = "Dados incorretos.";
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
    cart = []; updateCartUI(); closeC();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

init();