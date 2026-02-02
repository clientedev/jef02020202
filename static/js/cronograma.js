let eventos = [];
let consultores = [];
let categorias = [];
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataSelecionada = null;
let visualizacaoMobile = 'calendario';

const CATEGORIA_CORES = {
    'C': { nome: 'Consultoria', cor: '#22c55e' },
    'K': { nome: 'Kick-off', cor: '#eab308' },
    'F': { nome: 'Reuniao Final', cor: '#3b82f6' },
    'M': { nome: 'Mentoria', cor: '#ef4444' },
    'T': { nome: 'T0 - Diagnostico', cor: '#f97316' },
    'P': { nome: 'Programado', cor: '#06b6d4' },
    'O': { nome: 'Outros', cor: '#6b7280' }
};

const CONSULTOR_CORES = [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#6366F1', '#84CC16', '#F97316', '#14B8A6'
];

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getConsultorCor(consultorId) {
    return CONSULTOR_CORES[consultorId % CONSULTOR_CORES.length];
}

function getIniciais(nome) {
    if (!nome) return '??';
    const partes = nome.split(' ').filter(p => p.length > 0);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function getPrimeiroNome(nome) {
    if (!nome) return 'Consultor';
    return nome.split(' ')[0];
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth !== 'undefined') checkAuth();
    if (typeof atualizarSidebar !== 'undefined') atualizarSidebar();
    
    const hoje = new Date();
    const filtroMesAno = document.getElementById('filtroMesAno');
    if (filtroMesAno) {
        filtroMesAno.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }
    
    carregarDados();
    
    const formEvento = document.getElementById('formEvento');
    if (formEvento) formEvento.addEventListener('submit', salvarEvento);

    // Lógica de Busca de Empresa
    const inputBusca = document.getElementById('eventoBuscaEmpresa');
    const listaSugestoes = document.getElementById('listaSugestoesEmpresa');

    if (inputBusca) {
        inputBusca.addEventListener('input', async (e) => {
            const busca = e.target.value;
            if (busca.length < 2) {
                listaSugestoes.classList.add('hidden');
                return;
            }

            try {
                const response = await apiRequest(`/api/empresas/?q=${busca}&page_size=5`);
                const data = await response.json();
                const empresas = data.items || [];

                if (empresas.length > 0) {
                    listaSugestoes.innerHTML = empresas.map(emp => `
                        <div class="p-3 hover:bg-dark-hover cursor-pointer border-b border-dark-border/30 last:border-0" 
                             onclick="selecionarEmpresaParaEvento(${emp.id}, '${emp.empresa}', '${emp.sigla || ''}')">
                            <div class="text-white font-medium">${emp.empresa}</div>
                            <div class="text-xs text-gray-400">${emp.sigla || 'Sem sigla'}</div>
                        </div>
                    `).join('');
                    listaSugestoes.classList.remove('hidden');
                } else {
                    listaSugestoes.classList.add('hidden');
                }
            } catch (error) {
                console.error('Erro ao buscar empresas:', error);
            }
        });

        document.addEventListener('click', (e) => {
            if (!inputBusca.contains(e.target) && !listaSugestoes.contains(e.target)) {
                listaSugestoes.classList.add('hidden');
            }
        });
    }
});

function selecionarEmpresaParaEvento(id, nome, sigla) {
    document.getElementById('eventoBuscaEmpresa').value = nome;
    document.getElementById('eventoEmpresaId').value = id;
    document.getElementById('eventoSigla').value = sigla;
    document.getElementById('listaSugestoesEmpresa').classList.add('hidden');
}

async function carregarDados() {
    try {
        await Promise.all([
            carregarConsultores(),
            carregarCategorias()
        ]);
        await carregarEventos();
        renderizarCalendario();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

async function carregarConsultores() {
    try {
        const response = await apiRequest('/api/consultores/?page_size=100');
        const data = await response.json();
        consultores = data.items || [];
        
        const selectFiltro = document.getElementById('filtroConsultor');
        const selectEvento = document.getElementById('eventoConsultor');
        
        if (selectFiltro) selectFiltro.innerHTML = '<option value="">Todos os consultores</option>';
        if (selectEvento) selectEvento.innerHTML = '<option value="">Selecione o consultor...</option>';
        
        consultores.forEach(c => {
            if (selectFiltro) {
                const opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.nome;
                selectFiltro.appendChild(opt);
            }
            if (selectEvento) {
                const opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.nome;
                selectEvento.appendChild(opt);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar consultores:', error);
    }
}

async function carregarCategorias() {
    try {
        const response = await apiRequest('/api/cronograma/categorias');
        categorias = await response.json();
        const select = document.getElementById('filtroCategoria');
        if (select) {
            select.innerHTML = '<option value="">Todas as categorias</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.codigo; option.textContent = `${cat.codigo} - ${cat.nome}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

async function carregarEventos() {
    try {
        const params = new URLSearchParams();
        const primeiroDia = new Date(anoAtual, mesAtual, 1);
        const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
        params.append('data_inicio', primeiroDia.toISOString().split('T')[0]);
        params.append('data_fim', ultimoDia.toISOString().split('T')[0]);
        const fConsultor = document.getElementById('filtroConsultor')?.value;
        if (fConsultor) params.append('consultor_id', fConsultor);
        const response = await apiRequest(`/api/cronograma/eventos?${params}`);
        eventos = await response.json();
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
    }
}

function renderizarCalendario() {
    const container = document.getElementById('diasCalendario');
    if (!container) return;
    const mesAnoAtual = document.getElementById('mesAnoAtual');
    if (mesAnoAtual) mesAnoAtual.textContent = `${MESES[mesAtual]} ${anoAtual}`;
    
    const primeiroDia = new Date(anoAtual, mesAtual, 1);
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let html = '';
    for (let i = 0; i < diaSemanaInicio; i++) {
        html += '<div class="min-h-[120px] bg-dark-bg/30 rounded-lg"></div>';
    }
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataStr = new Date(anoAtual, mesAtual, dia).toISOString().split('T')[0];
        const eventosDoDia = eventos.filter(e => e.data === dataStr);
        const isHoje = new Date(dataStr + 'T12:00:00').getTime() === hoje.getTime();
        
        let classesDia = 'min-h-[120px] rounded-lg p-2 transition cursor-pointer hover:ring-2 hover:ring-blue-500/50 ';
        if (isHoje) classesDia += 'bg-blue-900/40 ring-2 ring-blue-500 ';
        else classesDia += 'bg-dark-bg/50 ';
        
        html += `<div class="${classesDia}" onclick="abrirDetalhesDia('${dataStr}', ${dia})">`;
        html += `<div class="text-sm font-bold mb-2 ${isHoje ? 'text-blue-400' : 'text-white'}">${dia}</div>`;
        
        if (eventosDoDia.length > 0) {
            html += '<div class="space-y-1.5 pointer-events-none">';
            eventosDoDia.slice(0, 3).forEach(evento => {
                const consultorCor = getConsultorCor(evento.consultor_id);
                const titulo = (evento.sigla_empresa || 'Empresa') + (evento.program_nome ? ` - ${evento.program_nome}` : '');
                html += `
                    <div class="flex items-center gap-1 p-1 rounded bg-dark-bg/80 border border-dark-border/30">
                        <div class="w-4 h-4 rounded text-[8px] flex items-center justify-center text-white font-bold" style="background-color: ${consultorCor}">${getIniciais(evento.consultor_nome)}</div>
                        <span class="text-[9px] text-gray-200 truncate flex-1">${titulo}</span>
                    </div>
                `;
            });
            if (eventosDoDia.length > 3) html += `<div class="text-[9px] text-blue-400 text-center">+${eventosDoDia.length - 3} mais</div>`;
            html += '</div>';
        }
        html += '</div>';
    }
    container.innerHTML = html;
}

function abrirDetalhesDia(data, dia) {
    const eventosDoDia = eventos.filter(e => e.data === data);
    
    if (eventosDoDia.length > 0) {
        // Se houver eventos, abre o primeiro para edição (ou poderíamos abrir uma lista)
        // Por padrão, vamos abrir o primeiro para mostrar os dados conforme solicitado
        editarEvento(eventosDoDia[0].id);
    } else {
        // Se não houver eventos, abre o modal de novo evento para aquela data
        document.getElementById('eventoData').value = data;
        abrirModalNovoEvento();
    }
}

function mesAnterior() {
    if (mesAtual === 0) { mesAtual = 11; anoAtual--; } else { mesAtual--; }
    carregarDados();
}

function proximoMes() {
    if (mesAtual === 11) { mesAtual = 0; anoAtual++; } else { mesAtual++; }
    carregarDados();
}

function irParaHoje() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    carregarDados();
}

function renderizarCalendarioMobile() {}
function atualizarResumo() {}
function renderizarLegendaConsultores() {}
function aplicarFiltros() { carregarDados(); }
function limparFiltros() {
    document.getElementById('filtroConsultor').value = '';
    document.getElementById('filtroCategoria').value = '';
    carregarDados();
}
function toggleFiltros() {
    const container = document.getElementById('filtrosContainer');
    if (container) container.classList.toggle('hidden');
}
