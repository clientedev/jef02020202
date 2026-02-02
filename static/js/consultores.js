checkAuth();
atualizarSidebar();

const usuario = getUsuario();

if (usuario.tipo === 'admin') {
    document.getElementById('btnNovoConsultor').classList.remove('hidden');
}

let paginaAtual = 1;
const itensPorPagina = 20;
let consultorParaExcluir = null;

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function carregarConsultores(pagina = 1) {
    try {
        paginaAtual = pagina;
        const response = await apiRequest(`/api/consultores/?page=${pagina}&page_size=${itensPorPagina}`);
        const data = await response.json();
        
        const tbody = document.getElementById('tabelaConsultores');
        const isAdmin = usuario.tipo === 'admin';
        
        if (!data.items || data.items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">Nenhum consultor encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        data.items.forEach(consultor => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-dark-hover cursor-pointer';
            tr.addEventListener('click', () => {
                window.location.href = `/consultor/${consultor.id}`;
            });
            
            const tdNome = document.createElement('td');
            tdNome.className = 'px-6 py-4 text-gray-300';
            tdNome.textContent = consultor.nome;
            
            const tdEmail = document.createElement('td');
            tdEmail.className = 'px-6 py-4 text-gray-300';
            tdEmail.textContent = consultor.email;
            
            const tdPlaca = document.createElement('td');
            tdPlaca.className = 'px-6 py-4 text-gray-300';
            tdPlaca.textContent = consultor.placa_carro || '-';
            
            const tdAcoes = document.createElement('td');
            tdAcoes.className = 'px-6 py-4';
            
            const divAcoes = document.createElement('div');
            divAcoes.className = 'flex gap-2';
            
            const btnPerfil = document.createElement('button');
            btnPerfil.className = 'text-blue-400 hover:text-blue-300';
            btnPerfil.textContent = 'Ver Perfil';
            btnPerfil.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `/consultor/${consultor.id}`;
            });
            divAcoes.appendChild(btnPerfil);
            
            if (isAdmin) {
                const btnExcluir = document.createElement('button');
                btnExcluir.className = 'text-red-400 hover:text-red-300';
                btnExcluir.textContent = 'Excluir';
                btnExcluir.addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirModalExclusao(consultor.id, consultor.nome);
                });
                divAcoes.appendChild(btnExcluir);
            }
            
            tdAcoes.appendChild(divAcoes);
            
            tr.appendChild(tdNome);
            tr.appendChild(tdEmail);
            tr.appendChild(tdPlaca);
            tr.appendChild(tdAcoes);
            
            tbody.appendChild(tr);
        });
        
        atualizarPaginacao(data);
    } catch (error) {
        console.error('Erro ao carregar consultores:', error);
        document.getElementById('tabelaConsultores').innerHTML = 
            '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400">Erro ao carregar consultores</td></tr>';
    }
}

function atualizarPaginacao(data) {
    const info = document.getElementById('paginacaoInfo');
    const controles = document.getElementById('paginacaoControles');
    
    const inicio = (data.page - 1) * data.page_size + 1;
    const fim = Math.min(data.page * data.page_size, data.total_count);
    
    info.textContent = `Mostrando ${inicio} a ${fim} de ${data.total_count} consultores`;
    
    controles.innerHTML = '';
    
    if (data.page > 1) {
        const btnPrimeira = document.createElement('button');
        btnPrimeira.className = 'px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover';
        btnPrimeira.textContent = 'Primeira';
        btnPrimeira.addEventListener('click', () => carregarConsultores(1));
        controles.appendChild(btnPrimeira);
        
        const btnAnterior = document.createElement('button');
        btnAnterior.className = 'px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover';
        btnAnterior.textContent = 'Anterior';
        btnAnterior.addEventListener('click', () => carregarConsultores(data.page - 1));
        controles.appendChild(btnAnterior);
    }
    
    const maxBotoes = 5;
    let inicioPagina = Math.max(1, data.page - Math.floor(maxBotoes / 2));
    let fimPagina = Math.min(data.total_pages, inicioPagina + maxBotoes - 1);
    
    if (fimPagina - inicioPagina < maxBotoes - 1) {
        inicioPagina = Math.max(1, fimPagina - maxBotoes + 1);
    }
    
    for (let i = inicioPagina; i <= fimPagina; i++) {
        const btn = document.createElement('button');
        if (i === data.page) {
            btn.className = 'px-3 py-1 bg-blue-600 text-white rounded';
        } else {
            btn.className = 'px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover';
            btn.addEventListener('click', () => carregarConsultores(i));
        }
        btn.textContent = i;
        controles.appendChild(btn);
    }
    
    if (data.page < data.total_pages) {
        const btnProxima = document.createElement('button');
        btnProxima.className = 'px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover';
        btnProxima.textContent = 'Próxima';
        btnProxima.addEventListener('click', () => carregarConsultores(data.page + 1));
        controles.appendChild(btnProxima);
        
        const btnUltima = document.createElement('button');
        btnUltima.className = 'px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover';
        btnUltima.textContent = 'Última';
        btnUltima.addEventListener('click', () => carregarConsultores(data.total_pages));
        controles.appendChild(btnUltima);
    }
}

function abrirModalNovoConsultor() {
    document.getElementById('formNovoConsultor').reset();
    document.getElementById('modalNovoConsultor').classList.remove('hidden');
    document.getElementById('modalNovoConsultor').classList.add('flex');
}

function fecharModalNovoConsultor() {
    document.getElementById('modalNovoConsultor').classList.add('hidden');
    document.getElementById('modalNovoConsultor').classList.remove('flex');
}

async function criarConsultor(event) {
    event.preventDefault();
    
    const form = event.target;
    const dados = {
        nome: form.nome.value,
        email: form.email.value,
        senha: form.senha.value,
        tipo: 'consultor'
    };
    
    try {
        const response = await apiRequest('/api/consultores/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            fecharModalNovoConsultor();
            carregarConsultores(paginaAtual);
            alert('Consultor criado com sucesso!');
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao criar consultor');
        }
    } catch (error) {
        console.error('Erro ao criar consultor:', error);
        alert('Erro ao criar consultor');
    }
}

function abrirModalExclusao(consultorId, consultorNome) {
    consultorParaExcluir = consultorId;
    document.getElementById('nomeConsultorExcluir').textContent = consultorNome;
    document.getElementById('modalConfirmarExclusao').classList.remove('hidden');
    document.getElementById('modalConfirmarExclusao').classList.add('flex');
}

function fecharModalExclusao() {
    consultorParaExcluir = null;
    document.getElementById('modalConfirmarExclusao').classList.add('hidden');
    document.getElementById('modalConfirmarExclusao').classList.remove('flex');
}

async function confirmarExclusao() {
    if (!consultorParaExcluir) return;
    
    try {
        const response = await apiRequest(`/api/consultores/${consultorParaExcluir}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            fecharModalExclusao();
            carregarConsultores(paginaAtual);
            alert('Consultor excluído com sucesso!');
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao excluir consultor');
        }
    } catch (error) {
        console.error('Erro ao excluir consultor:', error);
        alert('Erro ao excluir consultor');
    }
}

carregarConsultores();
