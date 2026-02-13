let consultoresAgenda = [];
let eventosAgenda = [];
let dataInicioAgenda = null;
let eventoSelecionado = null;
const DIAS_EXIBIR = 35;

const CATEGORIA_CORES_AGENDA = {
    'C': { nome: 'Consultoria', cor: '#22c55e', corTexto: '#ffffff' },
    'K': { nome: 'Kick-off', cor: '#eab308', corTexto: '#000000' },
    'F': { nome: 'Reunião Final', cor: '#3b82f6', corTexto: '#ffffff' },
    'M': { nome: 'Mentoria', cor: '#ef4444', corTexto: '#ffffff' },
    'T': { nome: 'Diagnóstico', cor: '#f97316', corTexto: '#ffffff' },
    'P': { nome: 'Programado', cor: '#06b6d4', corTexto: '#ffffff' },
    'O': { nome: 'Outros', cor: '#6b7280', corTexto: '#ffffff' }
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth !== 'undefined') checkAuth();
    if (typeof atualizarSidebar !== 'undefined') atualizarSidebar();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay();
    dataInicioAgenda = new Date(hoje);
    dataInicioAgenda.setDate(hoje.getDate() - diaSemana - 7);

    carregarDadosAgenda();
});

let feriadosAgenda = [];

async function carregarDadosAgenda() {
    try {
        const dataFim = new Date(dataInicioAgenda);
        dataFim.setDate(dataInicioAgenda.getDate() + DIAS_EXIBIR);

        const params = new URLSearchParams({
            data_inicio: dataInicioAgenda.toISOString().split('T')[0],
            data_fim: dataFim.toISOString().split('T')[0]
        });

        // Also fetch holidays
        // We can just fetch all holidays or filter by range if API supports it
        // The API I created supports inicio/fim params
        const paramsFeriado = new URLSearchParams({
            inicio: dataInicioAgenda.toISOString().split('T')[0],
            fim: dataFim.toISOString().split('T')[0]
        });

        const [consultoresRes, eventosRes, feriadosRes] = await Promise.all([
            apiRequest('/api/consultores/?page_size=100'),
            apiRequest(`/api/cronograma/eventos?${params}`),
            apiRequest(`/api/feriados/?${paramsFeriado}`)
        ]);

        const consultoresData = await consultoresRes.json();
        consultoresAgenda = consultoresData.items || [];
        eventosAgenda = await eventosRes.json();
        feriadosAgenda = await feriadosRes.json();

        renderizarScheduler();
        renderizarTabelaMetricas();
        atualizarPeriodoExibido();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('schedulerGrid').innerHTML = `
            <div class="text-center py-20 text-red-400">
                <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                <p>Erro ao carregar dados</p>
            </div>
        `;
    }
}

function atualizarPeriodoExibido() {
    const dataFim = new Date(dataInicioAgenda);
    dataFim.setDate(dataInicioAgenda.getDate() + DIAS_EXIBIR - 1);

    const formatarData = (d) => `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
    document.getElementById('periodoAtual').textContent =
        `${formatarData(dataInicioAgenda)} - ${formatarData(dataFim)} ${dataFim.getFullYear()}`;
}

function renderizarScheduler() {
    const container = document.getElementById('schedulerGrid');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const datas = [];
    for (let i = 0; i < DIAS_EXIBIR; i++) {
        const d = new Date(dataInicioAgenda);
        d.setDate(dataInicioAgenda.getDate() + i);
        datas.push(d);
    }

    const numCols = datas.length + 1;

    let html = `<div class="scheduler-grid" style="grid-template-columns: 200px repeat(${datas.length}, minmax(90px, 1fr));">`;

    html += `<div class="scheduler-corner scheduler-cell p-3 border-b-2 border-r-2 border-dark-border/50">
        <div class="text-sm font-bold text-white">CONSULTORES</div>
        <div class="text-[10px] text-gray-400">NIF / Período</div>
    </div>`;

    let ultimoMes = -1;
    datas.forEach((data, idx) => {
        const dataStr = data.toISOString().split('T')[0];
        const feriado = feriadosAgenda.find(f => f.data === dataStr);

        const diaSemana = data.getDay();
        const isHoje = data.getTime() === hoje.getTime();
        const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
        const isInicioSemana = diaSemana === 0;
        const mesAtual = data.getMonth();
        const mostraMes = mesAtual !== ultimoMes;
        ultimoMes = mesAtual;

        let classes = 'scheduler-header-cell scheduler-cell p-2 text-center border-b-2 border-dark-border/50 ';
        if (feriado) classes += 'bg-red-900/10 border-red-500/30 '; // Holiday style
        else if (isHoje) classes += 'today-col ';
        else if (isFimDeSemana) classes += 'weekend-col ';

        if (isInicioSemana && idx > 0) classes += 'week-separator ';

        html += `<div class="${classes}" ${feriado ? `title="${feriado.descricao}"` : ''}>
            ${mostraMes ? `<div class="text-[9px] text-blue-400 font-bold uppercase">${MESES_CURTOS[mesAtual]}</div>` : ''}
            <div class="text-lg font-bold ${feriado ? 'text-red-400' : (isHoje ? 'text-blue-400' : (isFimDeSemana ? 'text-gray-500' : 'text-white'))}">
                ${data.getDate()} ${feriado ? '<i class="fas fa-flag text-[8px] align-top"></i>' : ''}
            </div>
            <div class="text-[10px] ${feriado ? 'text-red-300' : (isHoje ? 'text-blue-300' : (isFimDeSemana ? 'text-gray-600' : 'text-gray-400'))}">
                ${DIAS_SEMANA[diaSemana]}
            </div>
        </div>`;
    });

    consultoresAgenda.forEach(consultor => {
        const iniciais = getIniciaisAgenda(consultor.nome);
        const corConsultor = getCorConsultor(consultor.id);

        html += `<div class="scheduler-row-header scheduler-cell p-3 border-r-2 border-dark-border/50 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style="background-color: ${corConsultor}">
                ${iniciais}
            </div>
            <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-white truncate">${consultor.nome}</div>
                <div class="text-[10px] text-gray-400">${consultor.nif || ''}</div>
            </div>
        </div>`;

        datas.forEach((data, idx) => {
            const dataStr = data.toISOString().split('T')[0];
            const diaSemana = data.getDay();
            const isHoje = data.getTime() === hoje.getTime();
            const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
            const isInicioSemana = diaSemana === 0;

            const eventosCell = eventosAgenda.filter(e =>
                e.consultor_id === consultor.id && e.data === dataStr
            );

            const feriado = feriadosAgenda.find(f => f.data === dataStr);

            let classes = 'scheduler-cell ';
            if (feriado) classes += 'bg-red-900/5 '; // Weaker holiday style for body
            else if (isHoje) classes += 'today-col ';
            else if (isFimDeSemana) classes += 'weekend-col ';

            if (isInicioSemana && idx > 0) classes += 'week-separator ';

            html += `<div class="${classes}">`;

            if (eventosCell.length > 0) {
                eventosCell.forEach(evento => {
                    const cat = CATEGORIA_CORES_AGENDA[evento.categoria] || CATEGORIA_CORES_AGENDA['O'];
                    const sigla = evento.sigla_empresa || 'N/A';
                    const empresaPrimeiroNome = evento.empresa_nome ? evento.empresa_nome.split(' ')[0] : sigla;
                    const consultorPrimeiroNome = evento.consultor_nome ? evento.consultor_nome.split(' ')[0] : 'N/A';
                    const programa = evento.program_nome ? evento.program_nome.substring(0, 12) : '';

                    html += `<div class="scheduler-cell-content" 
                        style="background-color: ${cat.cor}; color: ${cat.corTexto};"
                        onclick="mostrarDetalheEvento(${evento.id})"
                        onmouseenter="mostrarTooltip(event, ${evento.id})"
                        onmouseleave="esconderTooltip()">
                        <div class="font-bold truncate text-[11px]">${empresaPrimeiroNome}</div>
                        <div class="text-[9px] truncate opacity-90">${consultorPrimeiroNome}</div>
                        ${programa ? `<div class="text-[8px] opacity-80 truncate border-t border-white/20 mt-1 pt-0.5">${programa}</div>` : ''}
                    </div>`;
                });
            }

            html += '</div>';
        });
    });

    html += '</div>';
    container.innerHTML = html;
}

function getIniciaisAgenda(nome) {
    if (!nome) return '??';
    const partes = nome.split(' ').filter(p => p.length > 0);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function getCorConsultor(id) {
    const cores = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#84CC16', '#F97316', '#14B8A6'];
    return cores[id % cores.length];
}

function navegarSemanas(semanas) {
    dataInicioAgenda.setDate(dataInicioAgenda.getDate() + (semanas * 7));
    carregarDadosAgenda();
}

function irParaHojeAgenda() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay();
    dataInicioAgenda = new Date(hoje);
    dataInicioAgenda.setDate(hoje.getDate() - diaSemana - 7);
    carregarDadosAgenda();
}

function toggleLegenda() {
    const container = document.getElementById('legendaContainer');
    container.classList.toggle('hidden');
}

function mostrarTooltip(event, eventoId) {
    const evento = eventosAgenda.find(e => e.id === eventoId);
    if (!evento) return;

    const tooltip = document.getElementById('tooltipAgenda');
    const content = document.getElementById('tooltipContent');
    const cat = CATEGORIA_CORES_AGENDA[evento.categoria] || CATEGORIA_CORES_AGENDA['O'];

    const dataFormatada = new Date(evento.data + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    content.innerHTML = `
        <div class="space-y-2">
            <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${cat.cor}">${evento.categoria} - ${cat.nome}</span>
            </div>
            <div>
                <div class="text-xs text-gray-400">Empresa</div>
                <div class="text-sm text-white font-medium">${evento.empresa_nome || 'N/A'}</div>
                <div class="text-xs text-blue-400">${evento.sigla_empresa || ''}</div>
            </div>
            <div>
                <div class="text-xs text-gray-400">Consultor</div>
                <div class="text-sm text-white">${evento.consultor_nome || 'N/A'}</div>
            </div>
            <div>
                <div class="text-xs text-gray-400">Data</div>
                <div class="text-sm text-white capitalize">${dataFormatada}</div>
            </div>
            ${evento.program_nome ? `
            <div>
                <div class="text-xs text-gray-400">Programa</div>
                <div class="text-sm text-green-400">${evento.program_nome}</div>
            </div>
            ` : ''}
            ${evento.descricao ? `
            <div>
                <div class="text-xs text-gray-400">Descrição</div>
                <div class="text-xs text-gray-300 italic">${evento.descricao}</div>
            </div>
            ` : ''}
        </div>
    `;

    tooltip.style.left = `${event.pageX + 15}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.classList.remove('hidden');
}

function esconderTooltip() {
    document.getElementById('tooltipAgenda').classList.add('hidden');
}

async function mostrarDetalheEvento(eventoId) {
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${eventoId}`);
        if (!response.ok) throw new Error('Erro ao carregar evento');
        eventoSelecionado = await response.json();

        const cat = CATEGORIA_CORES_AGENDA[eventoSelecionado.categoria] || CATEGORIA_CORES_AGENDA['O'];
        const dataFormatada = new Date(eventoSelecionado.data + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });

        const content = document.getElementById('modalDetalheConteudo');
        content.innerHTML = `
            <div class="flex items-center gap-3 p-4 rounded-xl" style="background-color: ${cat.cor}20; border: 1px solid ${cat.cor}50;">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style="background-color: ${cat.cor}">
                    ${eventoSelecionado.categoria}
                </div>
                <div>
                    <div class="text-lg font-bold text-white">${cat.nome}</div>
                    <div class="text-sm text-gray-400 capitalize">${dataFormatada}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/30">
                    <div class="text-xs text-gray-400 mb-1">Empresa</div>
                    <div class="text-white font-medium text-lg leading-tight mb-0.5">${eventoSelecionado.empresa_nome || 'N/A'}</div>
                    <div class="text-blue-400 text-sm">${eventoSelecionado.sigla_empresa || ''}</div>
                </div>
                <div class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/30">
                    <div class="text-xs text-gray-400 mb-1">Consultor</div>
                    <div class="flex items-center gap-2 mt-1">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style="background-color: ${getCorConsultor(eventoSelecionado.consultor_id)}">
                            ${getIniciaisAgenda(eventoSelecionado.consultor_nome)}
                        </div>
                        <span class="text-white font-medium text-lg">${eventoSelecionado.consultor_nome || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            ${eventoSelecionado.program_nome ? `
            <div class="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div class="text-xs text-gray-400 mb-1">Programa Vinculado</div>
                <div class="text-green-400 font-medium">${eventoSelecionado.program_nome}</div>
            </div>
            ` : ''}
            
            ${eventoSelecionado.descricao ? `
            <div class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/30">
                <div class="text-xs text-gray-400 mb-2">Descrição</div>
                <div class="text-gray-300 text-sm">${eventoSelecionado.descricao}</div>
            </div>
            ` : ''}
            
            <div class="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <i class="fas fa-clock"></i>
                <span>Período: ${eventoSelecionado.periodo === 'D' ? 'Dia todo' : eventoSelecionado.periodo === 'M' ? 'Manhã' : 'Tarde'}</span>
            </div>

            <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div class="font-medium text-blue-400 mb-3 flex items-center gap-2">
                    <i class="fas fa-calendar-alt"></i> Reagendar Atividade
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="date" id="novaDataReagendamento" 
                        class="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        value="${eventoSelecionado.data}">
                    <button onclick="salvarReagendamento(${eventoSelecionado.id})" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                        <i class="fas fa-save"></i> Confirmar Nova Data
                    </button>
                </div>
            </div>
        `;

        document.getElementById('modalDetalheEvento').classList.remove('hidden');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function salvarReagendamento(id) {
    const input = document.getElementById('novaDataReagendamento');
    const novaData = input.value;

    if (!novaData) return;

    try {
        const btn = event.target.closest('button');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        const response = await apiRequest(`/api/cronograma/eventos/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: novaData })
        });

        if (!response.ok) throw new Error('Erro ao reagendar');

        showToast('Sucesso', 'Atividade reagendada com sucesso', 'success');
        fecharModalDetalhe();
        carregarDadosAgenda(); // Recarrega o grid

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro', 'Não foi possível reagendar a atividade', 'error');
        if (event.target.closest('button')) {
            const btn = event.target.closest('button');
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }
    }
}

function fecharModalDetalhe() {
    document.getElementById('modalDetalheEvento').classList.add('hidden');
    eventoSelecionado = null;
}

function editarEventoAgenda() {
    if (eventoSelecionado) {
        window.location.href = `/cronograma?edit=${eventoSelecionado.id}`;
    }
}

async function renderizarTabelaMetricas() {
    const container = document.getElementById('metricsContainer');
    if (!container) return;

    try {
        const response = await apiRequest('/api/cronograma/metrics');
        if (!response.ok) throw new Error('Erro ao carregar métricas');
        const metrics = await response.json();

        let html = `
        <div class="glass-effect rounded-xl overflow-hidden border border-dark-border/30 mt-8">
            <div class="bg-dark-card/50 px-6 py-4 border-b border-dark-border/30 flex justify-between items-center">
                <h3 class="text-white font-bold text-lg"><i class="fas fa-chart-bar mr-2 text-blue-400"></i>Gestão Global de Programas</h3>
                <div class="text-xs text-gray-400">Status total acumulado de cada programa</div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-dark-card/30 text-xs text-gray-400 uppercase border-b border-dark-border/30">
                            <th class="px-6 py-3 font-semibold">Consultor</th>
                            <th class="px-6 py-3 font-semibold">Empresa</th>
                            <th class="px-6 py-3 font-semibold">Programa</th>
                            <th class="px-6 py-3 font-semibold text-center">Meta Total</th>
                            <th class="px-6 py-3 font-semibold text-center">Horas Agendadas</th>
                            <th class="px-6 py-3 font-semibold text-center">Horas Realizadas</th>
                            <th class="px-6 py-3 font-semibold text-center">Saldo Restante</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-dark-border/10 text-sm">
        `;

        if (metrics.programas.length === 0) {
            html += `<tr><td colspan="7" class="px-6 py-10 text-center text-gray-500 italic">Nenhum programa cadastrado</td></tr>`;
        }

        metrics.programas.forEach(prog => {
            const percAgendado = prog.meta_total > 0 ? (prog.total_horas / prog.meta_total * 100).toFixed(0) : 0;
            const saldoAgendar = prog.meta_total - prog.total_horas;

            html += `
            <tr class="hover:bg-dark-hover/50 transition duration-150">
                <td class="px-6 py-4 text-white font-medium">${prog.consultor}</td>
                <td class="px-6 py-4 text-gray-300">${prog.empresa}</td>
                <td class="px-6 py-4">
                    <div class="font-medium text-white text-base">${prog.nome}</div>
                    <div class="text-[10px] text-gray-400 mt-1">Progresso agendamento: ${percAgendado}%</div>
                    <div class="w-full h-1 bg-dark-border/30 rounded-full mt-1">
                        <div class="h-full bg-blue-500 rounded-full" style="width: ${Math.min(percAgendado, 100)}%"></div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center font-bold text-lg text-white">${prog.meta_total}h</td>
                <td class="px-6 py-4 text-center text-blue-300 font-medium">${prog.total_horas}h</td>
                <td class="px-6 py-4 text-center text-green-400 font-medium">${prog.horas_realizadas}h</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-3 py-1 rounded-lg ${saldoAgendar <= 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'} font-bold">
                        ${saldoAgendar}h
                    </span>
                </td>
            </tr>
        `;
        });
        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar métricas:', error);
        if (container) {
            container.innerHTML = `<div class="p-6 text-red-400 italic text-center">Erro ao carregar métricas globais</div>`;
        }
    }
}
