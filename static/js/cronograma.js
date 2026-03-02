let eventos = [];
let consultores = [];
let categorias = [];
let feriados = [];
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

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("CRONOGRAMA_DEBUG: DOMContentLoaded fired");
    if (typeof checkAuth !== 'undefined') {
        checkAuth();
    } else {
        console.error("CRONOGRAMA_DEBUG: checkAuth not found!");
    }

    const hoje = new Date();
    const filtroMesAno = document.getElementById('filtroMesAno');
    if (filtroMesAno) {
        filtroMesAno.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }

    // Carregar dados iniciais
    carregarDados();

    // Event Listeners para Formulários
    const formEvento = document.getElementById('formEvento');
    if (formEvento) formEvento.addEventListener('submit', salvarEvento);

    const formFeriado = document.getElementById('formFeriado');
    if (formFeriado) {
        formFeriado.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = document.getElementById('feriadoData').value;
            const dataFim = document.getElementById('feriadoDataFim').value;
            const desc = document.getElementById('feriadoDescricao').value;

            try {
                const res = await apiRequest('/api/feriados/', {
                    method: 'POST',
                    body: JSON.stringify({
                        data: data,
                        data_fim: dataFim || null,
                        descricao: desc
                    })
                });
                if (res.ok) {
                    formFeriado.reset();
                    await carregarFeriados();
                    await carregarDados();
                } else {
                    const err = await res.json();
                    alert(err.detail || "Erro ao criar");
                }
            } catch (e) {
                console.error(e);
            }
        });
    }

    // Busca de Empresa (Autocomplete)
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
                const response = await apiRequest(`/api/empresas/?nome=${busca}&page_size=50`);
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

// --- UTILITY FUNCTIONS ---

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

function selecionarEmpresaParaEvento(id, nome, sigla) {
    const bus = document.getElementById('eventoBuscaEmpresa');
    const eid = document.getElementById('eventoEmpresaId');
    const sig = document.getElementById('eventoSigla');
    const sug = document.getElementById('listaSugestoesEmpresa');

    if (bus) bus.value = nome;
    if (eid) eid.value = id;
    if (sig) sig.value = sigla;
    if (sug) sug.classList.add('hidden');
}

// --- DATA LOADING ---

async function carregarDados() {
    try {
        // Atualizar interface ANTES de carregar eventos para garantir que os parâmetros de data estejam corretos
        const mesAnoAtual = document.getElementById('mesAnoAtual');
        if (mesAnoAtual) mesAnoAtual.textContent = `${MESES[mesAtual]} ${anoAtual}`;

        const filtroMesAno = document.getElementById('filtroMesAno');
        if (filtroMesAno) {
            filtroMesAno.value = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
        }

        await Promise.all([
            carregarConsultores(),
            carregarCategorias(),
            carregarFeriados()
        ]);
        await carregarEventos();

        const timelineActive = document.getElementById('timelineDesktop') && !document.getElementById('timelineDesktop').classList.contains('hidden');
        const listActive = document.getElementById('listaDesktop') && !document.getElementById('listaDesktop').classList.contains('hidden');

        if (timelineActive) renderizarTimeline();
        else if (listActive) renderizarLista();
        else renderizarCalendario();

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
        // Usar formato YYYY-MM-DD local para evitar problemas de fuso horário
        const dataInicioStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`;
        const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        const dataFimStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;

        params.append('data_inicio', dataInicioStr);
        params.append('data_fim', dataFimStr);

        const fConsultor = document.getElementById('filtroConsultor')?.value;
        if (fConsultor) params.append('consultor_id', fConsultor);
        const response = await apiRequest(`/api/cronograma/eventos?${params}`);
        if (!response.ok) throw new Error('Falha ao carregar eventos');
        eventos = await response.json();
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        eventos = [];
    }
}

async function carregarFeriados() {
    try {
        const response = await apiRequest('/api/feriados/');
        feriados = await response.json();
        renderizarListaFeriados();
    } catch (e) {
        console.error("Erro ao carregar feriados", e);
    }
}

// --- RENDERING FUNCTIONS ---

function renderizarCalendario() {
    const container = document.getElementById('diasCalendario');
    if (!container) return;

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
        const diaSemana = new Date(anoAtual, mesAtual, dia).getDay();
        const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

        const hasAlterado = eventosDoDia.some(e => e.alterado);
        const feriadoDoDia = feriados.find(f => f.data === dataStr);

        let classesDia = 'min-h-[140px] rounded-xl p-2.5 transition cursor-pointer hover:ring-2 hover:ring-blue-500/50 hover:scale-[1.02] ';

        if (feriadoDoDia) classesDia += 'bg-red-900/10 border border-red-500/30 ';
        else if (isHoje) classesDia += 'bg-gradient-to-br from-blue-900/60 to-blue-800/40 ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 ';
        else if (hasAlterado) classesDia += 'bg-red-900/20 border-2 border-red-500/50 ';
        else if (isFimDeSemana) classesDia += 'bg-dark-bg/30 ';
        else classesDia += 'bg-dark-bg/50 hover:bg-dark-bg/70 ';

        html += `<div class="${classesDia}" onclick="abrirDetalhesDia('${dataStr}', ${dia})">`;
        html += `<div class="flex justify-between items-center mb-2">
            <span class="text-sm font-bold ${feriadoDoDia ? 'text-red-400' : (isHoje ? 'text-blue-400' : (isFimDeSemana ? 'text-gray-500' : 'text-white'))}">
                ${dia} ${feriadoDoDia ? '<i class="fas fa-flag text-[10px] ml-1"></i>' : ''}
            </span>
            ${eventosDoDia.length > 0 ? `<span class="w-5 h-5 rounded-full bg-blue-500/30 text-blue-400 text-[10px] font-bold flex items-center justify-center">${eventosDoDia.length}</span>` : ''}
        </div>`;

        if (feriadoDoDia) {
            html += `<div class="text-[10px] text-red-300 font-bold uppercase tracking-wider mb-1 text-center bg-red-500/10 rounded py-0.5">${feriadoDoDia.descricao}</div>`;
        }

        if (eventosDoDia.length > 0) {
            html += '<div class="space-y-1.5">';
            eventosDoDia.slice(0, 3).forEach(evento => {
                const consultorCor = getConsultorCor(evento.consultor_id);
                const corCat = CATEGORIA_CORES[evento.categoria]?.cor || '#6b7280';
                const programa = evento.program_nome ? evento.program_nome.substring(0, 20) : '';
                const alteradoBadge = evento.alterado ? '<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-auto"></span>' : '';
                html += `
                    <div class="flex items-center gap-1.5 p-1.5 rounded-lg bg-dark-card/90 border ${evento.alterado ? 'border-red-500/50' : 'border-dark-border/40'} shadow-sm hover:brightness-125 transition-all"
                         onclick="event.stopPropagation(); exibirDetalhesAgendamento(${evento.id})">
                        <div class="w-1 h-8 rounded-full flex-shrink-0" style="background-color: ${corCat}"></div>
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-[11px] text-white truncate">${evento.empresa_nome || evento.sigla_empresa}</div>
                             <div class="flex items-center gap-1 mt-0.5">
                                <div class="w-4 h-4 rounded-md text-[8px] flex items-center justify-center text-white font-bold flex-shrink-0" style="background-color: ${consultorCor}">${getIniciais(evento.consultor_nome)}</div>
                                <span class="text-[10px] text-gray-300 truncate">${evento.consultor_nome}</span>
                                ${alteradoBadge}
                            </div>
                            ${programa ? `<div class="text-[9px] text-blue-400 font-medium truncate mt-0.5 border-t border-white/10 pt-0.5">${programa}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            if (eventosDoDia.length > 3) html += `<div class="text-[10px] text-blue-400 text-center mt-1 font-medium">+${eventosDoDia.length - 3} mais</div>`;
            html += '</div>';
        } else if (!isFimDeSemana && !feriadoDoDia) {
            html += '<div class="text-[10px] text-gray-600 text-center mt-4 italic">Sem agendamentos</div>';
        }
        html += '</div>';
    }
    container.innerHTML = html;
    atualizarMetricasEvolucao();
}

function renderizarLista() {
    const container = document.getElementById('listaDesktop');
    if (!container) return;

    const eventosOrdenados = [...eventos].sort((a, b) => new Date(a.data) - new Date(b.data));

    if (eventosOrdenados.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">Nenhum evento agendado para este período.</div>';
        return;
    }

    let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="border-b border-dark-border/50 text-gray-400 text-xs">
                        <th class="py-3 px-4">DATA</th>
                        <th class="py-3 px-4">CONSULTOR</th>
                        <th class="py-3 px-4">EMPRESA</th>
                        <th class="py-3 px-4">PROGRAMA/ATIVIDADE</th>
                    </tr>
                </thead>
                <tbody class="text-sm">
    `;

    eventosOrdenados.forEach(e => {
        const dataFormatada = new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR');
        html += `
            <tr class="border-b border-dark-border/30 hover:bg-dark-bg/30 cursor-pointer" onclick="exibirDetalhesAgendamento(${e.id})">
                <td class="py-3 px-4 text-white font-medium">${dataFormatada}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2 text-gray-300">
                        <div class="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style="background-color: ${getConsultorCor(e.consultor_id)}">
                            ${getIniciais(e.consultor_nome)}
                        </div>
                        ${e.consultor_nome}
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                        ${e.sigla_empresa || 'SEM SIGLA'}
                    </span>
                </td>
                <td class="py-3 px-4 text-gray-400">${e.program_nome || e.titulo || '-'}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
    atualizarMetricasEvolucao();
}

function renderizarTimeline() {
    const container = document.getElementById('timelineDesktop');
    if (!container) return;

    const primeiroDia = new Date(anoAtual, mesAtual, 1);
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
    const diasNoMes = ultimoDia.getDate();

    let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse table-fixed min-w-[1200px]">
                <thead>
                    <tr class="border-b border-dark-border/50 text-gray-400 text-[10px]">
                        <th class="py-3 px-4 w-[200px] sticky left-0 bg-dark-card z-10">CONSULTOR</th>
    `;

    for (let d = 1; d <= diasNoMes; d++) {
        html += `<th class="py-3 text-center border-l border-dark-border/30">${d}</th>`;
    }

    html += '</tr></thead><tbody class="text-[10px]">';

    consultores.forEach(c => {
        html += `
            <tr class="border-b border-dark-border/20 group">
                <td class="py-3 px-4 sticky left-0 bg-dark-card group-hover:bg-dark-hover z-10 border-r border-dark-border/30">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded flex items-center justify-center text-white font-bold" style="background-color: ${getConsultorCor(c.id)}">
                            ${getIniciais(c.nome)}
                        </div>
                        <span class="text-white truncate">${c.nome}</span>
                    </div>
                </td>
        `;

        for (let d = 1; d <= diasNoMes; d++) {
            const dataStr = new Date(anoAtual, mesAtual, d).toISOString().split('T')[0];
            const ev = eventos.find(e => e.consultor_id === c.id && e.data === dataStr);

            if (ev) {
                const corCat = CATEGORIA_CORES[ev.categoria]?.cor || '#6b7280';
                html += `
                    <td class="p-0.5 border-l border-dark-border/30 align-top">
                        <div class="p-1 rounded text-white h-full min-h-[40px] cursor-pointer hover:brightness-110 overflow-hidden" 
                             style="background-color: ${corCat}" 
                             onclick="exibirDetalhesAgendamento(${ev.id})"
                             title="${ev.sigla_empresa}: ${ev.program_nome || ev.titulo}">
                            <div class="font-bold truncate">${ev.sigla_empresa || '?'}</div>
                            <div class="text-[8px] opacity-80 truncate">${ev.program_nome || ''}</div>
                        </div>
                    </td>
                `;
            } else {
                html += `<td class="p-0.5 border-l border-dark-border/30"></td>`;
            }
        }
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
    atualizarMetricasEvolucao();
}

function renderizarListaFeriados() {
    const lista = document.getElementById('listaFeriados');
    if (!lista) return;

    lista.innerHTML = feriados.map(f => {
        const dataF = new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR');
        return `
            <div class="flex items-center justify-between p-2 rounded-lg bg-dark-bg/50 border border-dark-border/30 hover:bg-dark-hover transition">
                <div>
                    <span class="text-red-400 font-bold text-xs mr-2">${dataF}</span>
                    <span class="text-white text-sm">${f.descricao}</span>
                </div>
                <button onclick="deletarFeriado(${f.id})" class="text-gray-500 hover:text-red-400 transition ml-2">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        `;
    }).join('');
}

// --- MODAL & UI ACTIONS ---

function abrirModalFeriados() {
    console.log("CRONOGRAMA_DEBUG: abrirModalFeriados called");
    const modal = document.getElementById('modalFeriados');
    if (modal) {
        carregarFeriados();
        modal.classList.remove('hidden');
    } else {
        console.error("CRONOGRAMA_DEBUG: modalFeriados element not found");
    }
}
window.abrirModalFeriados = abrirModalFeriados;
window.fecharModalFeriados = fecharModalFeriados;
window.abrirModalProgramas = abrirModalProgramas;
window.fecharModalProgramas = fecharModalProgramas;
window.abrirModalNovoEvento = abrirModalNovoEvento;
window.fecharModalEvento = fecharModalEvento;
window.abrirDetalhesDia = abrirDetalhesDia;
window.fecharModalDetalhes = fecharModalDetalhes;
window.mesAnterior = mesAnterior;
window.proximoMes = proximoMes;
window.irParaHoje = irParaHoje;
window.setVisualizacao = setVisualizacao;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.toggleFiltros = toggleFiltros;
window.exibirDetalhesAgendamento = exibirDetalhesAgendamento;
window.selecionarEmpresaParaEvento = selecionarEmpresaParaEvento;
window.excluirEventoCronograma = excluirEventoCronograma;
window.excluirTodosEventosProgramaCronograma = excluirTodosEventosProgramaCronograma;
window.editarEvento = editarEvento;
window.reagendarAgendamento = (id) => { alert('Função em desenvolvimento'); };

function fecharModalFeriados() {
    document.getElementById('modalFeriados').classList.add('hidden');
}

function abrirDetalhesDia(data, dia) {
    const evs = eventos.filter(e => e.data === data);
    const conteudo = document.getElementById('conteudoDetalhesEvento');
    if (!conteudo) return;

    if (evs.length > 0) {
        if (evs.length === 1) {
            exibirDetalhesAgendamento(evs[0].id);
        } else {
            // Show list of events for the day
            const dataFm = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            let html = `
                <div class="mb-4">
                    <h4 class="text-white font-bold text-lg capitalize font-outfit">${dataFm}</h4>
                    <p class="text-gray-400 text-xs">${evs.length} agendamentos encontrados</p>
                </div>
                <div class="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
            `;

            evs.forEach(ev => {
                const corCat = CATEGORIA_CORES[ev.categoria]?.cor || '#6b7280';
                html += `
                    <div class="group flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/30 hover:bg-dark-hover transition-all cursor-pointer" 
                         onclick="exibirDetalhesAgendamento(${ev.id})">
                        <div class="w-1.5 h-10 rounded-full" style="background-color: ${corCat}"></div>
                        <div class="flex-1 min-w-0">
                            <div class="text-white font-bold text-sm truncate">${ev.empresa_nome || ev.sigla_empresa || 'N/A'}</div>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[8px]">
                                    ${getIniciais(ev.consultor_nome)}
                                </div>
                                <span class="text-[11px] text-gray-400 truncate">${ev.consultor_nome}</span>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-600 group-hover:text-blue-400 transition ml-2"></i>
                    </div>
                `;
            });

            html += `
                </div>
                <div class="pt-6 border-t border-dark-border/30 mt-6 grid grid-cols-1 gap-2">
                    <button onclick="abrirModalNovoEvento('${data}')" class="w-full py-3 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 transition text-sm flex items-center justify-center gap-2">
                        <i class="fas fa-plus"></i> ADICIONAR NOVO AGENDAMENTO
                    </button>
                    <button onclick="excluirTodosAgendamentosDoDia('${data}')" class="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition text-sm flex items-center justify-center gap-2">
                        <i class="fas fa-trash-alt"></i> LIMPAR TUDO DESTE DIA
                    </button>
                </div>
            `;
            conteudo.innerHTML = html;
            document.getElementById('modalDetalhesEvento').classList.remove('hidden');
        }
    } else {
        const inputData = document.getElementById('eventoData');
        if (inputData) inputData.value = data;

        // Reset form
        const eid = document.getElementById('eventoId'); if (eid) eid.value = '';
        const bus = document.getElementById('eventoBuscaEmpresa'); if (bus) bus.value = '';
        const emid = document.getElementById('eventoEmpresaId'); if (emid) emid.value = '';
        const sig = document.getElementById('eventoSigla'); if (sig) sig.value = '';

        abrirModalNovoEvento();
    }
}

async function excluirTodosAgendamentosDoDia(data) {
    const dataFm = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
    if (!confirm(`ATENÇÃO: Deseja realmente excluir TODOS os agendamentos de ${dataFm}?\nEsta ação não poderá ser desfeita.`)) return;

    try {
        const res = await apiRequest(`/api/cronograma/eventos/bulk?data=${data}`, { method: 'DELETE' });
        if (res.ok) {
            const result = await res.json();
            showToast(result.message || 'Agendamentos excluídos!', 'success');
            fecharModalDetalhes();
            carregarDados();
        } else {
            throw new Error('Falha ao excluir agendamentos');
        }
    } catch (error) {
        console.error('Erro ao excluir agendamentos:', error);
        showToast('Erro ao excluir agendamentos', 'error');
    }
}
window.excluirTodosAgendamentosDoDia = excluirTodosAgendamentosDoDia;

let eventoSelecionadoDetalhes = null;

async function exibirDetalhesAgendamento(id) {
    if (!id) return;
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${id}`);
        if (!response.ok) throw new Error('Falha ao carregar evento');
        const evento = await response.json();
        eventoSelecionadoDetalhes = evento;

        const conteudo = document.getElementById('conteudoDetalhesEvento');
        const btnEditar = document.getElementById('btnEditarDesdeDetalhes');

        if (btnEditar) {
            btnEditar.onclick = () => {
                fecharModalDetalhes();
                editarEvento(id);
            };
        }

        const dataFormatada = new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR');
        const corCat = CATEGORIA_CORES[evento.categoria]?.cor || '#6b7280';
        const nomeCat = CATEGORIA_CORES[evento.categoria]?.nome || 'Outros';

        if (conteudo) {
            conteudo.innerHTML = `
                ${evento.alterado ? `
                <div class="p-2 mb-2 rounded-lg bg-red-500/20 border border-red-500/30 text-center">
                    <span class="text-xs text-red-400 font-bold uppercase"><i class="fas fa-exclamation-triangle mr-1"></i> Data Alterada</span>
                </div>
                ` : ''}
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-400">Data</span>
                    <span class="text-sm ${evento.alterado ? 'text-red-400 font-bold' : 'text-white font-medium'}">${dataFormatada}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-400">Categoria</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${corCat}">${nomeCat}</span>
                </div>
                <div class="space-y-1">
                    <span class="text-xs text-gray-400 block">Consultor</span>
                    <div class="flex items-center gap-2 p-2 rounded-lg bg-dark-bg/50 border border-dark-border/30">
                        <div class="w-8 h-8 rounded flex items-center justify-center text-white font-bold" style="background-color: ${getConsultorCor(evento.consultor_id)}">
                            ${getIniciais(evento.consultor_nome)}
                        </div>
                        <span class="text-sm text-white">${evento.consultor_nome}</span>
                    </div>
                </div>
                <div class="space-y-1">
                    <span class="text-xs text-gray-400 block">Empresa</span>
                    <div class="p-2 rounded-lg bg-dark-bg/50 border border-dark-border/30">
                        <div class="text-sm text-white font-bold">${evento.empresa_nome || 'N/A'}</div>
                        <div class="text-xs text-blue-400">${evento.sigla_empresa || 'Sem sigla'}</div>
                    </div>
                </div>
                ${evento.program_nome ? `
                <div class="space-y-1">
                    <span class="text-xs text-gray-400 block">Programa</span>
                    <div class="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div class="text-sm text-green-400 font-bold">${evento.program_nome}</div>
                    </div>
                </div>
                ` : ''}
                ${evento.descricao ? `
                <div class="space-y-1">
                    <span class="text-xs text-gray-400 block">Descrição</span>
                    <div class="p-3 rounded-lg bg-dark-bg/50 border border-dark-border/30 text-xs text-gray-300 italic">
                        ${evento.descricao}
                    </div>
                </div>
                ` : ''}
                <div class="grid grid-cols-2 gap-2 mt-6">
                    <button onclick="editarEvento(${evento.id})" class="py-2.5 bg-blue-500/20 text-blue-400 rounded-xl font-bold hover:bg-blue-500/30 transition text-sm">
                        <i class="fas fa-edit mr-2"></i> EDITAR
                    </button>
                    <button onclick="excluirEventoCronograma(${evento.id})" class="py-2.5 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition text-sm">
                        <i class="fas fa-trash-alt mr-2"></i> EXCLUIR
                    </button>
                </div>
                ${evento.program_id ? `
                    <button onclick="excluirTodosEventosProgramaCronograma(${evento.program_id}, '${evento.program_nome}')" class="w-full mt-2 py-2.5 border border-red-500/30 text-red-400/80 rounded-xl font-bold hover:bg-red-500/10 transition text-xs">
                        <i class="fas fa-layer-group mr-2"></i> EXCLUIR TODOS DESTE PROGRAMA
                    </button>
                ` : ''}
            `;
        }

        document.getElementById('modalDetalhesEvento').classList.remove('hidden');
    } catch (e) {
        console.error('Erro ao exibir detalhes:', e);
    }
}

async function excluirEventoCronograma(id) {
    const eid = id || (eventoSelecionadoDetalhes ? eventoSelecionadoDetalhes.id : null);
    if (!eid) return;
    if (!confirm(`Confirmar exclusão deste agendamento?`)) return;

    try {
        const res = await apiRequest(`/api/cronograma/eventos/${eid}`, { method: 'DELETE' });
        if (res.ok) {
            fecharModalDetalhes();
            carregarDados();
        } else {
            alert("Erro ao excluir");
        }
    } catch (e) { console.error(e); }
}

async function excluirTodosEventosProgramaCronograma(pid, nome) {
    const programId = pid || (eventoSelecionadoDetalhes ? eventoSelecionadoDetalhes.program_id : null);
    const programNome = nome || (eventoSelecionadoDetalhes ? eventoSelecionadoDetalhes.program_nome : 'este programa');

    if (!programId) return;
    if (!confirm(`ATENÇÃO: Excluir TODOS os agendamentos deste programa?\n"${programNome}"`)) return;

    try {
        const res = await apiRequest(`/api/cronograma/eventos/bulk?program_id=${programId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            alert(data.message || "Excluídos com sucesso");
            fecharModalDetalhes();
            carregarDados();
        } else {
            alert("Erro ao excluir em massa");
        }
    } catch (e) { console.error(e); }
}


function fecharModalDetalhes() {
    document.getElementById('modalDetalhesEvento').classList.add('hidden');
}

async function editarEvento(id) {
    if (!id) return;
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${id}`);
        if (!response.ok) throw new Error('Falha ao carregar evento');
        const evento = await response.json();

        const form = document.getElementById('formEvento');
        if (form) form.reset();

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('eventoId', evento.id);
        setVal('eventoData', evento.data);
        setVal('eventoConsultor', evento.consultor_id);
        setVal('eventoBuscaEmpresa', evento.empresa_nome || '');
        setVal('eventoEmpresaId', evento.empresa_id || '');
        setVal('eventoSigla', evento.sigla_empresa || '');
        setVal('eventoCategoria', evento.categoria);
        setVal('eventoDescricao', evento.descricao || '');

        const campoProg = document.getElementById('campoEventoPrograma');
        const selectProg = document.getElementById('eventoPrograma');

        if (evento.program_nome && campoProg && selectProg) {
            campoProg.classList.remove('hidden');
            selectProg.innerHTML = `<option value="${evento.program_id}">${evento.program_nome}</option>`;
            selectProg.disabled = true;
        } else if (campoProg && selectProg) {
            campoProg.classList.add('hidden');
            selectProg.disabled = false;
        }

        const configDist = document.getElementById('configuracaoDistribuicao');
        if (configDist) configDist.classList.add('hidden');

        const modal = document.getElementById('modalEvento');
        if (modal) modal.classList.remove('hidden');
    } catch (e) {
        console.error('Erro ao editar evento:', e);
        alert('Erro ao carregar detalhes do evento');
    }
}

async function salvarEvento(e) {
    if (e) e.preventDefault();
    const programId = document.getElementById('eventoPrograma')?.value;
    const empresaId = document.getElementById('eventoEmpresaId')?.value;
    const eventoId = document.getElementById('eventoId')?.value;

    if (eventoId) {
        const dados = {
            data: document.getElementById('eventoData').value,
            categoria: document.getElementById('eventoCategoria').value,
            consultor_id: parseInt(document.getElementById('eventoConsultor').value),
            empresa_id: empresaId ? parseInt(empresaId) : null,
            sigla_empresa: document.getElementById('eventoSigla').value || null,
            descricao: document.getElementById('eventoDescricao').value
        };
        const response = await apiRequest(`/api/cronograma/eventos/${eventoId}`, { method: 'PUT', body: JSON.stringify(dados) });
        if (response.ok) {
            fecharModalEvento(); await carregarEventos(); await carregarDados();
        }
        return;
    }

    if (programId) {
        const distribuirCarga = document.getElementById('eventoDistribuirCarga') ? document.getElementById('eventoDistribuirCarga').checked : true;

        if (distribuirCarga) {
            const diasCheckboxes = document.querySelectorAll('input[name="eventoDiasSemana"]:checked');
            if (diasCheckboxes.length === 0) { alert('Selecione os dias'); return; }

            const dadosAuto = {
                program_id: parseInt(programId),
                consultor_id: parseInt(document.getElementById('eventoConsultor').value),
                empresa_id: empresaId ? parseInt(empresaId) : null,
                data_inicio: document.getElementById('eventoData').value,
                dias_semana: Array.from(diasCheckboxes).map(cb => parseInt(cb.value)),
                horas_por_dia: parseFloat(document.getElementById('eventoHorasDia').value || 8),
                categoria: document.getElementById('eventoCategoria').value
            };

            const response = await apiRequest('/api/programs/auto-schedule', { method: 'POST', body: JSON.stringify(dadosAuto) });
            if (response.ok) {
                fecharModalEvento(); await carregarEventos(); await carregarDados();
            } else {
                const err = await response.json(); alert(err.detail || 'Erro ao gerar');
            }
            return;
        } else {
            const dados = {
                data: document.getElementById('eventoData').value,
                categoria: document.getElementById('eventoCategoria').value,
                consultor_id: parseInt(document.getElementById('eventoConsultor').value),
                empresa_id: empresaId ? parseInt(empresaId) : null,
                program_id: parseInt(programId),
                carga_horaria: parseFloat(document.getElementById('eventoHorasDia').value || 8),
                sigla_empresa: document.getElementById('eventoSigla').value || null,
                descricao: document.getElementById('eventoDescricao').value
            };

            const response = await apiRequest('/api/cronograma/eventos', { method: 'POST', body: JSON.stringify(dados) });
            if (response.ok) {
                fecharModalEvento(); await carregarEventos(); await carregarDados();
            }
            return;
        }
    }

    const dados = {
        data: document.getElementById('eventoData').value,
        categoria: document.getElementById('eventoCategoria').value,
        consultor_id: parseInt(document.getElementById('eventoConsultor').value),
        empresa_id: empresaId ? parseInt(empresaId) : null,
        sigla_empresa: document.getElementById('eventoSigla').value || null,
        descricao: document.getElementById('eventoDescricao').value
    };

    const response = await apiRequest('/api/cronograma/eventos', { method: 'POST', body: JSON.stringify(dados) });
    if (response.ok) {
        fecharModalEvento(); await carregarEventos(); await carregarDados();
    }
}

function abrirModalNovoEvento() {
    const modal = document.getElementById('modalEvento');
    if (!modal) return;
    const form = document.getElementById('formEvento');
    if (form) form.reset();

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('eventoId', '');
    setVal('eventoEmpresaId', '');
    setVal('eventoBuscaEmpresa', '');

    const cp = document.getElementById('campoEventoPrograma');
    if (cp) cp.classList.remove('hidden');

    const sp = document.getElementById('eventoPrograma');
    if (sp) sp.disabled = false;

    const cd = document.getElementById('configuracaoDistribuicao');
    if (cd) cd.classList.remove('hidden');

    carregarProgramasNoEvento();
    modal.classList.remove('hidden');
}

function fecharModalEvento() {
    const modal = document.getElementById('modalEvento');
    if (modal) modal.classList.add('hidden');
}

async function reagendarAgendamento(agendamentoId) {
    const novaDataStr = prompt("Informe a nova data (AAAA-MM-DD):");
    if (!novaDataStr) return;

    const observacoes = prompt("Observações do reagendamento:");

    try {
        const response = await fetch(`/api/agendamentos/${agendamentoId}/reagendar?nova_data=${novaDataStr}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nova_data: novaDataStr, observacoes: observacoes })
        });

        if (response.ok) {
            alert("Agendamento reagendado com sucesso!");
            carregarEventos();
            renderizarCalendario();
        } else {
            const err = await response.json();
            alert("Erro ao reagendar: " + (err.detail || "Erro desconhecido"));
        }
    } catch (error) {
        console.error('Erro ao reagendar:', error);
    }
}

async function deletarFeriado(id) {
    if (!confirm("Remover este feriado?")) return;
    try {
        await apiRequest(`/api/feriados/${id}`, { method: 'DELETE' });
        carregarFeriados();
        carregarDados();
    } catch (e) {
        alert("Erro ao remover");
    }
}

async function carregarProgramasNoEvento() {
    const select = document.getElementById('eventoPrograma');
    if (!select) return;
    try {
        const response = await apiRequest('/api/programs/');
        const programs = await response.json();
        select.innerHTML = '<option value="">Selecione um programa...</option>' +
            programs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    } catch (e) { console.error(e); }
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
    const hoj = new Date();
    mesAtual = hoj.getMonth();
    anoAtual = hoj.getFullYear();
    carregarDados();
}

function setVisualizacao(tipo) {
    const cal = document.getElementById('calendarioDesktop');
    const list = document.getElementById('listaDesktop');
    const timeline = document.getElementById('timelineDesktop');

    if (cal) cal.classList.add('hidden');
    if (list) list.classList.add('hidden');
    if (timeline) timeline.classList.add('hidden');

    if (tipo === 'calendario') {
        if (cal) cal.classList.remove('hidden');
        renderizarCalendario();
    } else if (tipo === 'lista') {
        if (list) list.classList.remove('hidden');
        renderizarLista();
    } else if (tipo === 'timeline') {
        if (timeline) timeline.classList.remove('hidden');
        renderizarTimeline();
    }
}

function aplicarFiltros() {
    const filtroMesAno = document.getElementById('filtroMesAno')?.value;
    if (filtroMesAno) {
        const [ano, mes] = filtroMesAno.split('-').map(Number);
        if (ano && mes) {
            anoAtual = ano;
            mesAtual = mes - 1;
        }
    }
    carregarDados();
}

function limparFiltros() {
    const fc = document.getElementById('filtroConsultor');
    const fcat = document.getElementById('filtroCategoria');
    if (fc) fc.value = '';
    if (fcat) fcat.value = '';
    carregarDados();
}

function toggleFiltros() {
    const container = document.getElementById('filtrosContainer');
    if (container) container.classList.toggle('hidden');
}

function atualizarMetricasEvolucao() {
    // Placeholder para métricas futuras
    console.log("Métricas atualizadas.");
}

// Funções mobile (Placeholders se não utilizadas)
function renderizarCalendarioMobile() { }
function atualizarResumo() { }
function renderizarLegendaConsultores() { }
async function acionarResetGlobal() {
    const code = prompt("MODO DE MANUTENÇÃO: Digite o código de segurança 'RESET99' para LIMPAR TODO O CRONOGRAMA:");
    if (code !== "RESET99") {
        if (code) alert("Código incorreto. Operação cancelada.");
        return;
    }

    if (!confirm("TEM CERTEZA? Isso excluirá TODOS os agendamentos e projetos do sistema permanentemente.")) return;
    if (!confirm("CONFIRMAÇÃO FINAL: Esta ação NÃO pode ser desfeita. Deseja continuar?")) return;

    try {
        const res = await apiRequest('/api/cronograma/reset-global', { method: 'DELETE' });
        if (res.ok) {
            showToast("Cronograma resetado com sucesso!", "success");
            location.reload();
        } else {
            const err = await res.json();
            alert("Erro: " + (err.detail || "Falha ao resetar"));
        }
    } catch (e) {
        showToast("Erro crítico ao resetar", "error");
    }
}
