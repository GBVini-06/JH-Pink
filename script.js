/* =========================================
   ESTADO GLOBAL DA APLICAÇÃO
   ========================================= */
let apiData = []; // Armazena todos os produtos vindos da API
let cart = [];    // Armazena os produtos adicionados ao carrinho

// Função de rolagem suave para a seção de coleção
function scrollToCollection() {
    const el = document.getElementById('collection-target');
    el.scrollIntoView({ behavior: 'smooth' });
}

/* =========================================
   INICIALIZAÇÃO E API
   Busca produtos da API externa (Makeup API)
   ========================================= */
async function init() {
    try {
        // Faz a requisição para a API
        const req = await fetch('https://makeup-api.herokuapp.com/api/v1/products.json?brand=maybelline');
        apiData = await req.json();
        
        // Separa produtos para o carrossel (Top 8)
        const top = apiData.slice(0, 8);
        // Cria um efeito "infinito" duplicando os itens no array
        const infinite = [...top, ...top, ...top];
        
        // Renderiza o Carrossel
        document.getElementById('track').innerHTML = infinite.map(p => `
            <div class="c-item" onclick="viewProduct(${p.id})">
                <img src="${p.image_link}" onerror="this.src='https://via.placeholder.com/150'">
                <p style="font-size:0.75rem; font-weight:700; margin-top:8px; height:30px; overflow:hidden">${p.name}</p>
                <p style="color:var(--pink-vibrant); font-weight:700">R$ ${(p.price * 5.5).toFixed(2)}</p>
            </div>
        `).join('');

        // Renderiza a Grid principal (Produtos 8 ao 28)
        renderGrid(apiData.slice(8, 28));
    } catch(e) { console.log("Erro ao carregar API:", e); }
}

// Renderiza os cards na tela (reutilizável para busca)
function renderGrid(list) {
    document.getElementById('grid').innerHTML = list.map(p => `
        <div class="card">
            <div class="badge-off">NEW</div>
            <img src="${p.image_link}" onclick="viewProduct(${p.id})" style="cursor:pointer" onerror="this.src='https://via.placeholder.com/150'">
            <div class="card-title">${p.name}</div>
            <div class="card-price">R$ ${(p.price * 5.5).toFixed(2)}</div>
            <button class="btn-buy" onclick="addToCart(${p.id})">COMPRAR</button>
        </div>
    `).join('');
}

/* =========================================
   FUNCIONALIDADE DE BUSCA
   Filtra produtos em tempo real enquanto digita
   ========================================= */
document.getElementById('search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filt = apiData.filter(x => x.name.toLowerCase().includes(val));
    renderGrid(filt.slice(0,20)); // Mostra no máximo 20 resultados
});

/* =========================================
   MODAL DE DETALHES DO PRODUTO
   ========================================= */
function viewProduct(id) {
    const p = apiData.find(x => x.id === id);
    // Preenche os dados no modal
    document.getElementById('pm-img').src = p.image_link;
    document.getElementById('pm-title').innerText = p.name;
    document.getElementById('pm-desc').innerText = "Este produto exclusivo da linha JH Pink oferece acabamento profissional e alta durabilidade.";
    document.getElementById('pm-price').innerText = `R$ ${(p.price * 5.5).toFixed(2)}`;
    
    // Configura o botão do modal para adicionar ESSE produto específico
    document.getElementById('pm-btn').onclick = () => { addToCart(p.id); closeP(); };
    
    document.getElementById('prodModal').style.display = 'flex';
}
function closeP() { document.getElementById('prodModal').style.display = 'none'; }

/* =========================================
   LÓGICA DO CARRINHO DE COMPRAS
   ========================================= */
function addToCart(id) {
    const p = apiData.find(x => x.id === id);
    cart.push(p);
    document.getElementById('cart-count').innerText = cart.length;
    
    // Feedback visual no botão (muda texto temporariamente)
    const btn = event.target;
    const oldText = btn.innerText;
    if(btn.tagName === 'BUTTON') {
        btn.innerText = "ADD ✔";
        setTimeout(() => btn.innerText = oldText, 1000);
    }
}

// Controla as setas do carrossel
function scrollC(dir) {
    document.getElementById('track').scrollBy({ left: dir * 220, behavior: 'smooth' });
}

/* =========================================
   CHECKOUT E FLUXO DE PAGAMENTO
   ========================================= */
function openCheckout() {
    if(!cart.length) return alert("Sua sacola está vazia.");
    
    // Calcula total e gera lista visual do carrinho
    let t = 0;
    document.getElementById('cartList').innerHTML = cart.map(i => {
        t += i.price * 5.5;
        return `<div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:8px">
            <span style="color:#555">${i.name.substring(0,20)}...</span>
            <b>R$ ${(i.price * 5.5).toFixed(2)}</b>
        </div>`;
    }).join('');
    
    document.getElementById('totalVal').innerText = `Total: R$ ${t.toFixed(2)}`;
    document.getElementById('checkModal').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none'; 
}
function closeC() { document.getElementById('checkModal').style.display = 'none'; }

// Alterna entre abas de Login e Cadastro
function setTab(t) {
    const isLogin = t === 'login';
    document.getElementById('f-login').classList.toggle('hidden', !isLogin);
    document.getElementById('f-reg').classList.toggle('hidden', isLogin);
    
    // Estilização das abas ativas
    document.getElementById('btn-login-tab').style.background = isLogin ? 'var(--pink-vibrant)' : '#f0f0f0';
    document.getElementById('btn-login-tab').style.color = isLogin ? '#fff' : '#666';
    document.getElementById('btn-reg-tab').style.background = !isLogin ? 'var(--pink-vibrant)' : '#f0f0f0';
    document.getElementById('btn-reg-tab').style.color = !isLogin ? '#fff' : '#666';
}

/* =========================================
   SISTEMA DE AUTH (SIMULADO C/ LOCALSTORAGE)
   ========================================= */
function regUser() {
    const email = document.getElementById('r-email').value.trim();
    const pass = document.getElementById('r-pass').value.trim();
    const name = document.getElementById('r-name').value.trim();

    if(email && pass && name) {
        // Salva credenciais no navegador (Simulação)
        localStorage.setItem(email, pass);
        alert(`Parabéns, ${name}! Cadastro realizado. Agora faça o login.`);
        setTab('login');
        document.getElementById('l-email').value = email;
    } else {
        alert("Por favor, preencha todos os campos.");
    }
}

function loginAndPay() {
    const email = document.getElementById('l-email').value.trim();
    const pass = document.getElementById('l-pass').value.trim();
    const errorMsg = document.getElementById('login-error');

    if(!email || !pass) {
        errorMsg.innerText = "Preencha e-mail e senha.";
        errorMsg.style.display = 'block';
        return;
    }

    const storedPass = localStorage.getItem(email);

    if(storedPass && storedPass === pass) {
        // Sucesso: Esconde login e mostra pagamento
        errorMsg.style.display = 'none';
        document.getElementById('flow-auth').classList.add('hidden');
        document.getElementById('flow-pay').classList.remove('hidden');
    } else {
        errorMsg.innerText = "E-mail não cadastrado ou senha incorreta.";
        errorMsg.style.display = 'block';
    }
}

function backToAuth() {
    document.getElementById('flow-auth').classList.remove('hidden');
    document.getElementById('flow-pay').classList.add('hidden');
}

// Alterna visualização entre Cartão e PIX
function chkPay() {
    const m = document.getElementById('pay-method').value;
    document.getElementById('card-dets').style.display = m === 'card' ? 'block' : 'none';
    document.getElementById('pix-dets').style.display = m === 'pix' ? 'block' : 'none';
}

function finish() {
    alert("Pedido Confirmado! Você receberá os detalhes por e-mail. ✨");
    cart = [];
    document.getElementById('cart-count').innerText = 0;
    closeC();
    backToAuth();
}

// Inicia a aplicação
init();