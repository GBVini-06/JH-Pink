/* =========================================
   ESTADO GLOBAL
   ========================================= */
let apiData = [];
let cart = [];

/* =========================================
   INICIALIZAÇÃO E API
   ========================================= */
async function init() {
    try {
        // Carregando
        document.getElementById('grid').innerHTML = '<p style="text-align:center; padding:20px; width:100%">Carregando Coleção Exclusiva...</p>';

        const req = await fetch('https://makeup-api.herokuapp.com/api/v1/products.json?brand=maybelline');
        apiData = await req.json();
        
        // 1. Configura Carrossel
        const top = apiData.slice(0, 8);
        const infinite = [...top, ...top, ...top];
        document.getElementById('track').innerHTML = infinite.map(p => `
            <div class="c-item" onclick="viewProduct(${p.id})">
                <img src="${p.image_link}" onerror="this.src='https://via.placeholder.com/150'">
                <p style="font-size:0.75rem; font-weight:700; margin-top:8px; height:30px; overflow:hidden">${p.name}</p>
                <p style="color:var(--pink-vibrant); font-weight:700">${formatMoney(p.price)}</p>
            </div>
        `).join('');

        // 2. Configura Grid
        renderGrid(apiData.slice(8, 28));
        
        // 3. Dispara Promoção Relâmpago (Pop-up)
        triggerPromo();

    } catch(e) { 
        console.log("Erro API:", e);
        document.getElementById('grid').innerHTML = '<p>Erro ao carregar produtos. Tente recarregar.</p>';
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

// Utilitário para formatar dinheiro (BRL)
function formatMoney(val) {
    const price = val ? val * 5.5 : 0;
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Busca em Tempo Real
document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filt = apiData.filter(x => x.name.toLowerCase().includes(val));
    renderGrid(filt.slice(0,20));
});

/* =========================================
   SIDEBAR E CARRINHO (NOVA LÓGICA)
   ========================================= */
function addToCart(id) {
    const p = apiData.find(x => x.id === id);
    cart.push(p);
    updateCartUI();
    
    // Feedback no botão
    const btn = event.target;
    if(btn.tagName === 'BUTTON') {
        const oldText = btn.innerText;
        btn.innerText = "ADD ✔";
        setTimeout(() => btn.innerText = oldText, 1000);
    }
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    // Se a sidebar estiver aberta, renderiza novamente
    if(document.getElementById('cartSidebar').classList.contains('open')) {
        renderSidebarItems();
    }
}

function toggleCartSidebar() {
    const sb = document.getElementById('cartSidebar');
    const ov = document.getElementById('overlaySidebar');
    sb.classList.toggle('open');
    ov.classList.toggle('open');
    renderSidebarItems();
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
        const price = item.price * 5.5;
        t += price;
        return `
            <div class="cart-item-side">
                <img src="${item.image_link}" onerror="this.src='https://via.placeholder.com/50'">
                <div style="text-align:left; flex:1">
                    <p style="font-size:0.8rem; font-weight:600; margin-bottom:5px">${item.name}</p>
                    <p style="color:var(--pink-vibrant); font-size:0.9rem">${formatMoney(item.price)}</p>
                </div>
                <i class="fas fa-trash" onclick="removeFromCart(${index})" style="cursor:pointer; color:#ccc; font-size:0.9rem; align-self:center; padding:10px"></i>
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
   PROMOÇÃO RELÂMPAGO (NOVO)
   ========================================= */
function triggerPromo() {
    // Sorteia 3 produtos
    if(apiData.length < 3) return;
    const shuffled = [...apiData].sort(() => 0.5 - Math.random());
    const promoItems = shuffled.slice(0, 3);
    
    document.getElementById('promoGrid').innerHTML = promoItems.map(p => `
        <div style="background:white; padding:10px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.05)">
            <img src="${p.image_link}" style="width:60px; height:60px; object-fit:contain" onerror="this.src='https://via.placeholder.com/60'">
            <p style="font-size:0.7rem; margin:5px 0; height:30px; overflow:hidden">${p.name}</p>
            <p style="color:red; font-weight:bold; font-size:0.9rem">${(p.price * 4.0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <button onclick="addToCart(${p.id}); closePromo()" style="background:var(--pink-vibrant); color:white; border:none; width:100%; padding:5px; border-radius:5px; margin-top:5px; cursor:pointer; font-size:0.7rem">PEGAR</button>
        </div>
    `).join('');
    
    // Mostra após 1.5 segundos
    setTimeout(() => {
        document.getElementById('promoModal').style.display = 'flex';
    }, 1500);
}
function closePromo() { document.getElementById('promoModal').style.display = 'none'; }

/* =========================================
   MODAIS DE TOPO (RASTREIO E TROCAS)
   ========================================= */
function openTrackModal() { document.getElementById('trackModal').style.display = 'flex'; }
function closeTrack() { document.getElementById('trackModal').style.display = 'none'; }

function openExchangeModal() { document.getElementById('exchangeModal').style.display = 'flex'; }
function closeExchange() { document.getElementById('exchangeModal').style.display = 'none'; }

/* =========================================
   MODAL DE DETALHES DO PRODUTO
   ========================================= */
function viewProduct(id) {
    const p = apiData.find(x => x.id === id);
    document.getElementById('pm-img').src = p.image_link;
    document.getElementById('pm-title').innerText = p.name;
    document.getElementById('pm-desc').innerText = "Este produto exclusivo da linha JH Pink oferece acabamento profissional.";
    document.getElementById('pm-price').innerText = formatMoney(p.price);
    document.getElementById('pm-btn').onclick = () => { addToCart(p.id); closeP(); };
    document.getElementById('prodModal').style.display = 'flex';
}
function closeP() { document.getElementById('prodModal').style.display = 'none'; }
function scrollC(dir) { document.getElementById('track').scrollBy({ left: dir * 220, behavior: 'smooth' }); }
function scrollToCollection() { document.getElementById('collection-target').scrollIntoView({ behavior: 'smooth' }); }

/* =========================================
   CHECKOUT E AUTH (SÓ AO FINALIZAR)
   ========================================= */
function proceedToCheckout() {
    if(cart.length === 0) return alert("Adicione produtos antes de finalizar.");
    
    // Fecha Sidebar, abre Auth
    toggleCartSidebar();
    
    let t = 0;
    cart.forEach(i => t += i.price * 5.5);
    
    document.getElementById('cartList').innerHTML = `<p style="text-align:center">Você está finalizando a compra de <b>${cart.length}</b> itens.</p>`;
    document.getElementById('totalVal').innerText = `Total Final: ${t.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    
    document.getElementById('checkModal').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none';
    // Reinicia estado do modal
    backToAuth();
}
function closeC() { document.getElementById('checkModal').style.display = 'none'; }

// Lógica de Tabs e Login (Mantida do original)
function setTab(t) {
    const isLogin = t === 'login';
    document.getElementById('f-login').classList.toggle('hidden', !isLogin);
    document.getElementById('f-reg').classList.toggle('hidden', isLogin);
    document.getElementById('btn-login-tab').style.background = isLogin ? 'var(--pink-vibrant)' : '#f0f0f0';
    document.getElementById('btn-login-tab').style.color = isLogin ? '#fff' : '#666';
    document.getElementById('btn-reg-tab').style.background = !isLogin ? 'var(--pink-vibrant)' : '#f0f0f0';
    document.getElementById('btn-reg-tab').style.color = !isLogin ? '#fff' : '#666';
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
    } else { alert("Preencha todos os campos."); }
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
        errorMsg.style.display = 'block';
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
    alert("Pedido Confirmado! ✨");
    cart = [];
    updateCartUI();
    closeC();
}

// Inicia App
init();