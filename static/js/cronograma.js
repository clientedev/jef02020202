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
    const bus = document.getElementById('eventoBuscaEmpresa');
    const eid = document.getElementById('eventoEmpresaId');
    const sig = document.getElementById('eventoSigla');
    const sug = document.getElementById('listaSugestoesEmpresa');
    
    if (bus) bus.value = nome;
    if (eid) eid.value = id;
    if (sig) sig.value = sigla;
    if (sug) sug.classList.add('hidden');
}

async function carregarDados() {
    try {
        await Promise.all([
            carregarConsultores(),
            carregarCategorias()
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
        const primeiroDia = new Date(anoAtual, mesAtual, 1);
        const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
        params.append('data_inicio', primeiroDia.toISOString().split('T')[0]);
        params.append('data_fim', ultimoDia.toISOString().split('T')[0]);
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

function abrirDetalhesDia(data, dia) {
    const evs = eventos.filter(e => e.data === data);
    if (evs.length > 0) {
        exibirDetalhesAgendamento(evs[0].id);
    } else {
        const inputData = document.getElementById('eventoData');
        if (inputData) inputData.value = data;
        abrirModalNovoEvento();
    }
}

async function exibirDetalhesAgendamento(id) {
    if (!id) return;
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${id}`);
        if (!response.ok) throw new Error('Falha ao carregar evento');
        const evento = await response.json();
        
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
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-400">Data</span>
                    <span class="text-sm text-white font-medium">${dataFormatada}</span>
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
            `;
        }

        document.getElementById('modalDetalhesEvento').classList.remove('hidden');
    } catch (e) {
        console.error('Erro ao exibir detalhes:', e);
    }
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhesEvento').classList.add('hidden');
}

function atualizarMetricasEvolucao() {
    const container = document.getElementById('metricasEvolucao');
    if (!container) return;

    const grupos = {};
    eventos.forEach(ev => {
        if (ev.program_id && ev.empresa_id) {
            const key = `${ev.empresa_id}-${ev.program_id}`;
            if (!grupos[key]) {
                grupos[key] = {
                    empresa: ev.empresa_nome || ev.sigla_empresa,
                    programa: ev.program_nome,
                    total: 0,
                    realizado: 0
                };
            }
            grupos[key].total++;
            const hoje = new Date();
            const dataEv = new Date(ev.data + 'T23:59:59');
            if (dataEv <= hoje) {
                grupos[key].realizado++;
            }
        }
    });

    const lista = Object.values(grupos);
    if (lista.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-gray-500 col-span-full">Nenhum programa vinculado encontrado.</div>';
        return;
    }

    container.innerHTML = lista.map(item => {
        const porcentagem = Math.round((item.realizado / item.total) * 100);
        return `
            <div class="p-4 rounded-xl bg-dark-card border border-dark-border/50 space-y-3">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0 flex-1">
                        <h4 class="text-sm font-bold text-white truncate">${item.empresa}</h4>
                        <p class="text-[10px] text-gray-400 truncate">${item.programa}</p>
                    </div>
                    <span class="text-lg font-bold text-blue-400 ml-2">${porcentagem}%</span>
                </div>
                <div class="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border/30">
                    <div class="h-full bg-blue-500 transition-all duration-500" style="width: ${porcentagem}%"></div>
                </div>
                <div class="flex justify-between text-[10px] text-gray-500">
                    <span>${item.realizado} de ${item.total} sessões</span>
                    <span>${item.total - item.realizado} restantes</span>
                </div>
            </div>
        `;
    }).join('');
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
    e.preventDefault();
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
        const diasCheckboxes = document.querySelectorAll('input[name="eventoDiasSemana"]:checked');
        if (diasCheckboxes.length === 0) { alert('Selecione os dias'); return; }
        
        const dadosAuto = {
            program_id: parseInt(programId),
            consultor_id: parseInt(document.getElementById('eventoConsultor').value),
            empresa_id: empresaId ? parseInt(empresaId) : null,
            data_inicio: document.getElementById('eventoData').value,
            dias_semana: Array.from(diasCheckboxes).map(cb => parseInt(cb.value)),
            horas_por_dia: parseFloat(document.getElementById('eventoHorasDia').value || 8)
        };
        
        const response = await apiRequest('/api/programs/auto-schedule', { method: 'POST', body: JSON.stringify(dadosAuto) });
        if (response.ok) {
            fecharModalEvento(); await carregarEventos(); await carregarDados();
        } else {
            const err = await response.json(); alert(err.detail || 'Erro ao gerar');
        }
        return;
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
    console.log("Abrindo modal novo evento...");
    const modal = document.getElementById('modalEvento');
    if (!modal) {
        console.error("Modal 'modalEvento' não encontrado!");
        return;
    }
    const form = document.getElementById('formEvento');
    if (form) form.reset();
    
    const inputId = document.getElementById('eventoId');
    if (inputId) inputId.value = '';
    
    const inputEmpresaId = document.getElementById('eventoEmpresaId');
    if (inputEmpresaId) inputEmpresaId.value = '';
    
    const inputBusca = document.getElementById('eventoBuscaEmpresa');
    if (inputBusca) inputBusca.value = '';
    
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
    document.getElementById('modalEvento').classList.add('hidden');
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
