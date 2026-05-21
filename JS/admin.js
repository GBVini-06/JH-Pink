const SUPABASE_URL = 'https://cloyzqoyhenmalrsrwxo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsb3l6cW95aGVubWFscnNyd3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjAwNTIsImV4cCI6MjA5NDc5NjA1Mn0.ZE7DRRqpf-Kw-FM7fvggqL2EOwbj0dfVfzpdoHj-GDg';

const ADMIN_CREDENTIALS = { email: 'admin@jhpink.com', senha: 'admin123' };

let allProdutos = [];
let allClientes = [];
let allPedidos = [];
let deletingId = null;

/* =========================================
   SUPABASE HELPER
   ========================================= */
async function sb(table, opts = {}) {
    const { method = 'GET', body, filters = '', select = '*', order = '' } = opts;
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters}${order}`;
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : ''
    };
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(await res.text());
    if (method === 'DELETE' || method === 'PATCH') return null;
    return res.json();
}

/* =========================================
   LOGIN / LOGOUT
   ========================================= */
function adminLogin() {
    const email = document.getElementById('adm-email').value.trim();
    const pass = document.getElementById('adm-pass').value.trim();
    const errEl = document.getElementById('login-err');

    if (email === ADMIN_CREDENTIALS.email && pass === ADMIN_CREDENTIALS.senha) {
        sessionStorage.setItem('jhpink_admin', '1');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-app').style.display = 'flex';
        loadDashboard();
        errEl.style.display = 'none';
    } else {
        errEl.style.display = 'block';
    }
}

function adminLogout() {
    sessionStorage.removeItem('jhpink_admin');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-app').style.display = 'none';
}

document.getElementById('adm-pass').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

// Auto-login se sessão ativa
if (sessionStorage.getItem('jhpink_admin')) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'flex';
    loadDashboard();
}

/* =========================================
   NAVEGAÇÃO
   ========================================= */
const sectionTitles = { dashboard: 'Dashboard', produtos: 'Produtos', pedidos: 'Pedidos', clientes: 'Clientes' };

function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-' + name).classList.add('active');
    event.currentTarget.classList.add('active');
    document.getElementById('section-title').innerText = sectionTitles[name];

    if (name === 'produtos') loadProdutos();
    if (name === 'clientes') loadClientes();
    if (name === 'pedidos') loadPedidos();
}

/* =========================================
   DASHBOARD
   ========================================= */
async function loadDashboard() {
    try {
        const [prods, clis, peds] = await Promise.all([
            sb('produtos', { select: 'id,category,promo' }).catch(() => []),
            sb('clientes', { select: 'id,name,email,created_at', order: '&order=created_at.desc&limit=5' }).catch(() => []),
            sb('pedidos', { select: 'id,total,status,cliente_nome,items_count,pagamento,created_at', order: '&order=created_at.desc' }).catch(() => []),
        ]);

        allProdutos = prods;
        allClientes = clis;
        allPedidos = peds;

        document.getElementById('stat-produtos').innerText = prods.length;
        document.getElementById('stat-clientes').innerText = clis.length;
        document.getElementById('stat-pedidos').innerText = peds.length;
        document.getElementById('stat-promos').innerText = prods.filter(p => p.promo).length;

        renderCategoryChart(prods);
        renderUltimosClientes(clis.slice(0, 5));
    } catch(e) {
        // Demo se não há conexão
        document.getElementById('stat-produtos').innerText = '12';
        document.getElementById('stat-clientes').innerText = '—';
        document.getElementById('stat-pedidos').innerText = '—';
        document.getElementById('stat-promos').innerText = '5';
        renderCategoryChart([
            {category:'labios'},{category:'labios'},{category:'labios'},
            {category:'olhos'},{category:'olhos'},
            {category:'rosto'},{category:'rosto'},{category:'rosto'},{category:'rosto'},
            {category:'pele'},{category:'perfume'},{category:'kits'}
        ]);
        document.getElementById('tb-ultimos-clientes').innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#aaa; font-size:0.82rem">Conecte o Supabase para ver os dados reais.</td></tr>`;
    }
}

function renderCategoryChart(prods) {
    const cats = { labios:'💄 Lábios', olhos:'👁️ Olhos', rosto:'🌸 Rosto', pele:'✨ Pele', perfume:'🌺 Perfume', kits:'🎁 Kits' };
    const counts = {};
    prods.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);
    const html = Object.entries(cats).map(([key, label]) => {
        const count = counts[key] || 0;
        const pct = Math.round((count / max) * 100);
        return `<div class="chart-bar-row">
            <div class="chart-bar-label">${label}</div>
            <div class="chart-bar-bg">
                <div class="chart-bar-fill" style="width:${pct}%">${count > 0 ? count : ''}</div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('chart-categorias').innerHTML = html;
}

function renderUltimosClientes(clis) {
    const tb = document.getElementById('tb-ultimos-clientes');
    if (!clis.length) { tb.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:#aaa;font-size:0.82rem">Nenhum cliente ainda.</td></tr>`; return; }
    tb.innerHTML = clis.map(c => `
        <tr>
            <td><strong>${c.name || '—'}</strong></td>
            <td style="color:#888; font-size:0.8rem">${c.email}</td>
            <td style="color:#888; font-size:0.78rem">${formatDate(c.created_at)}</td>
        </tr>`).join('');
}

/* =========================================
   PRODUTOS
   ========================================= */
async function loadProdutos() {
    try {
        allProdutos = await sb('produtos', { order: '&order=created_at.desc' });
        renderProdTable(allProdutos);
    } catch(e) {
        document.getElementById('tb-produtos').innerHTML = `<tr class="loading-row"><td colspan="8" style="color:#e53935">Erro ao carregar: ${e.message}</td></tr>`;
    }
}

function renderProdTable(prods) {
    const tb = document.getElementById('tb-produtos');
    if (!prods.length) { tb.innerHTML = `<tr class="loading-row"><td colspan="8"><i class="fas fa-box-open" style="opacity:0.3"></i><br>Nenhum produto cadastrado.</td></tr>`; return; }
    const catLabel = { labios:'Lábios', olhos:'Olhos', rosto:'Rosto', pele:'Pele', perfume:'Perfume', kits:'Kits' };
    tb.innerHTML = prods.map(p => `
        <tr>
            <td><img class="tb-img" src="${p.image_url || 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td><strong>${p.name}</strong></td>
            <td><span class="tb-badge cat">${catLabel[p.category] || p.category || '—'}</span></td>
            <td><strong>R$ ${Number(p.price).toFixed(2)}</strong>${p.old_price ? `<br><span style="text-decoration:line-through;color:#bbb;font-size:0.75rem">R$ ${Number(p.old_price).toFixed(2)}</span>` : ''}</td>
            <td>${p.promo ? `<span class="tb-badge promo">🔥 Sim ${p.discount ? '(-'+p.discount+'%)' : ''}</span>` : '<span class="tb-badge no">Não</span>'}</td>
            <td>${p.querido ? '<span class="tb-badge yes">❤️ Sim</span>' : '<span class="tb-badge no">Não</span>'}</td>
            <td>${p.bestseller ? '<span class="tb-badge yes">⭐ Sim</span>' : '<span class="tb-badge no">Não</span>'}</td>
            <td>
                <div class="tb-actions">
                    <button class="btn-tbl edit" onclick="editProduto(${p.id})"><i class="fas fa-pen"></i> Editar</button>
                    <button class="btn-tbl del" onclick="askDelete(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function filterProdTable(q) {
    const filtered = allProdutos.filter(p => p.name?.toLowerCase().includes(q.toLowerCase()) || (p.category||'').toLowerCase().includes(q.toLowerCase()));
    renderProdTable(filtered);
}

/* MODAL PRODUTO */
function openProdModal(prod = null) {
    document.getElementById('prod-id').value = prod?.id || '';
    document.getElementById('prod-name').value = prod?.name || '';
    document.getElementById('prod-cat').value = prod?.category || 'labios';
    document.getElementById('prod-price').value = prod?.price || '';
    document.getElementById('prod-old-price').value = prod?.old_price || '';
    document.getElementById('prod-discount').value = prod?.discount || '';
    document.getElementById('prod-img').value = prod?.image_url || '';
    document.getElementById('prod-imgs').value = Array.isArray(prod?.images) ? prod.images.join('\n') : (prod?.images || '');
    document.getElementById('prod-desc').value = prod?.description || '';
    document.getElementById('prod-promo').checked = prod?.promo || false;
    document.getElementById('prod-querido').checked = prod?.querido || false;
    document.getElementById('prod-bestseller').checked = prod?.bestseller || false;
    document.getElementById('modal-prod-title').innerText = prod ? 'Editar Produto' : 'Novo Produto';
    document.getElementById('btn-save-label').innerText = prod ? 'Salvar Alterações' : 'Salvar Produto';
    document.getElementById('prod-form-err').style.display = 'none';
    previewMainImg();
    document.getElementById('prodModal').classList.add('open');
}

function closeProdModal() { document.getElementById('prodModal').classList.remove('open'); }

function previewMainImg() {
    const url = document.getElementById('prod-img').value.trim();
    const preview = document.getElementById('main-img-preview');
    if (url) { preview.src = url; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
}

function editProduto(id) {
    const p = allProdutos.find(x => x.id === id);
    if (p) openProdModal(p);
}

async function saveProduto() {
    const name = document.getElementById('prod-name').value.trim();
    const price = parseFloat(document.getElementById('prod-price').value);
    const errEl = document.getElementById('prod-form-err');

    if (!name || isNaN(price)) {
        errEl.innerText = 'Nome e Preço são obrigatórios.';
        errEl.style.display = 'block';
        return;
    }

    const imgsRaw = document.getElementById('prod-imgs').value.trim();
    const imagesArr = imgsRaw ? imgsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

    const data = {
        name,
        category: document.getElementById('prod-cat').value,
        price,
        old_price: parseFloat(document.getElementById('prod-old-price').value) || null,
        discount: parseInt(document.getElementById('prod-discount').value) || 0,
        image_url: document.getElementById('prod-img').value.trim() || null,
        images: imagesArr.length > 0 ? imagesArr : null,
        description: document.getElementById('prod-desc').value.trim(),
        promo: document.getElementById('prod-promo').checked,
        querido: document.getElementById('prod-querido').checked,
        bestseller: document.getElementById('prod-bestseller').checked,
    };

    const id = document.getElementById('prod-id').value;
    const btnLabel = document.getElementById('btn-save-label');
    btnLabel.innerText = 'Salvando...';

    try {
        if (id) {
            await fetch(`${SUPABASE_URL}/rest/v1/produtos?id=eq.${id}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            showToast('Produto atualizado!', 'success');
        } else {
            await sb('produtos', { method: 'POST', body: data });
            showToast('Produto cadastrado!', 'success');
        }
        closeProdModal();
        loadProdutos();
    } catch(e) {
        errEl.innerText = 'Erro ao salvar: ' + e.message;
        errEl.style.display = 'block';
    } finally {
        btnLabel.innerText = id ? 'Salvar Alterações' : 'Salvar Produto';
    }
}

/* DELETE */
function askDelete(id) {
    deletingId = id;
    document.getElementById('confirmModal').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmModal').classList.remove('open'); deletingId = null; }

async function confirmDelete() {
    if (!deletingId) return;
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/produtos?id=eq.${deletingId}`, {
            method: 'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        showToast('Produto excluído.', 'success');
        closeConfirm();
        loadProdutos();
    } catch(e) {
        showToast('Erro ao excluir.', 'error');
    }
}

/* =========================================
   CLIENTES
   ========================================= */
async function loadClientes() {
    try {
        allClientes = await sb('clientes', { order: '&order=created_at.desc' });
        renderCliTable(allClientes);
    } catch(e) {
        document.getElementById('tb-clientes').innerHTML = `<tr class="loading-row"><td colspan="5" style="color:#e53935">Configure o Supabase para ver os clientes.</td></tr>`;
    }
}

function renderCliTable(clis) {
    const tb = document.getElementById('tb-clientes');
    if (!clis.length) { tb.innerHTML = `<tr class="loading-row"><td colspan="5"><i class="fas fa-users" style="opacity:0.3"></i><br>Nenhum cliente cadastrado ainda.</td></tr>`; return; }
    tb.innerHTML = clis.map(c => `
        <tr>
            <td><div class="client-avatar">${(c.name||'?')[0].toUpperCase()}</div></td>
            <td><strong>${c.name || '—'}</strong></td>
            <td style="color:#888">${c.email}</td>
            <td style="color:#888">${c.phone || '—'}</td>
            <td style="color:#888; font-size:0.8rem">${formatDate(c.created_at)}</td>
        </tr>`).join('');
}

function filterCliTable(q) {
    const filtered = allClientes.filter(c => (c.name||'').toLowerCase().includes(q.toLowerCase()) || (c.email||'').toLowerCase().includes(q.toLowerCase()));
    renderCliTable(filtered);
}

/* =========================================
   PEDIDOS
   ========================================= */
async function loadPedidos() {
    try {
        allPedidos = await sb('pedidos', { order: '&order=created_at.desc' });
        renderPedTable(allPedidos);
    } catch(e) {
        document.getElementById('tb-pedidos').innerHTML = `<tr class="loading-row"><td colspan="7" style="color:#aaa; font-size:0.82rem">Nenhum pedido registrado ainda. Para registrar pedidos automaticamente, crie a tabela <strong>pedidos</strong> no Supabase.</td></tr>`;
    }
}

function renderPedTable(peds) {
    const tb = document.getElementById('tb-pedidos');
    if (!peds.length) {
        tb.innerHTML = `<tr class="loading-row"><td colspan="7"><i class="fas fa-shopping-bag" style="opacity:0.3"></i><br>Nenhum pedido registrado.</td></tr>`;
        return;
    }
    const statusLabel = { entregue:'entregue', enviado:'enviado', pendente:'pendente', cancelado:'cancelado' };
    tb.innerHTML = peds.map(p => `
        <tr>
            <td style="font-weight:700; color:var(--pink)">#${p.id}</td>
            <td>${p.cliente_nome || '—'}</td>
            <td>${p.items_count || '—'} itens</td>
            <td><strong>R$ ${Number(p.total||0).toFixed(2)}</strong></td>
            <td style="color:#888; font-size:0.82rem">${p.pagamento || '—'}</td>
            <td><span class="order-status ${p.status}">${p.status || 'pendente'}</span></td>
            <td style="color:#888; font-size:0.78rem">${formatDate(p.created_at)}</td>
        </tr>`).join('');
}

function filterPedTable(q) {
    const filtered = allPedidos.filter(p => (p.cliente_nome||'').toLowerCase().includes(q.toLowerCase()) || String(p.id).includes(q));
    renderPedTable(filtered);
}

/* =========================================
   UTILITÁRIOS
   ========================================= */
function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    document.getElementById('toast-msg').innerText = msg;
    t.className = `toast ${type} show`;
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Fechar modais clicando fora
document.getElementById('prodModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeProdModal(); });
document.getElementById('confirmModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeConfirm(); });