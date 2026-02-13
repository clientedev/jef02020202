let consultoresAgenda = [];
let eventosAgenda = [];
let dataInicioAgenda = null;
let eventoSelecionado = null;
const DIAS_EXIBIR = 35;

const CATEGORIA_CORES_AGENDA = {
    'C': { nome: 'Consultoria', cor: '#22c55e', corTexto: '#ffffff' },
    'K': { nome: 'Kick-off', cor: '#eab308', corTexto: '#101827' },
    'F': { nome: 'Reunião Final', cor: '#3b82f6', corTexto: '#ffffff' },
    'M': { nome: 'Mentoria', cor: '#ef4444', corTexto: '#ffffff' },
    'T': { nome: 'Diagnóstico', cor: '#f97316', corTexto: '#ffffff' },
    'P': { nome: 'Programado', cor: '#06b6d4', corTexto: '#ffffff' },
    'O': { nome: 'Outros', cor: '#6b7280', corTexto: '#ffffff' }
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-2';

    if (type === 'success') {
        toast.classList.add('bg-green-500/90', 'text-white');
        toast.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    } else if (type === 'error') {
        toast.classList.add('bg-red-500/90', 'text-white');
        toast.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
    } else {
        toast.classList.add('bg-blue-500/90', 'text-white');
        toast.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth !== 'undefined') checkAuth();
    if (typeof atualizarSidebar !== 'undefined') atualizarSidebar();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay();
    dataInicioAgenda = new Date(hoje);
    dataInicioAgenda.setDate(hoje.getDate() - diaSemana - 7);

    carregarDadosAgenda();

    // Busca de Empresa no Modal
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
                             onclick="selecionarEmpresaParaEventoAgenda(${emp.id}, '${emp.empresa}', '${emp.sigla || ''}')">
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

    const formEvento = document.getElementById('formEvento');
    if (formEvento) formEvento.addEventListener('submit', salvarEventoAgenda);
});

function selecionarEmpresaParaEventoAgenda(id, nome, sigla) {
    document.getElementById('eventoBuscaEmpresa').value = nome;
    document.getElementById('eventoEmpresaId').value = id;
    document.getElementById('eventoSigla').value = sigla;
    document.getElementById('listaSugestoesEmpresa').classList.add('hidden');
    carregarProgramasPorEmpresaAgenda(id);
}

async function carregarProgramasPorEmpresaAgenda(empresaId) {
    const select = document.getElementById('eventoPrograma');
    if (!select || !empresaId) return;

    try {
        const response = await apiRequest(`/api/prospeccao/empresa/${empresaId}`);
        const prospeccoes = await response.json();
        const options = prospeccoes
            .filter(p => p.program_id)
            .map(p => `<option value="${p.program_id}">${p.program_nome}</option>`);

        select.innerHTML = '<option value="">Selecione um programa...</option>' + options.join('');
        document.getElementById('campoEventoPrograma').classList.toggle('hidden', options.length === 0);
    } catch (error) {
        console.error('Erro ao carregar programas:', error);
    }
}

let feriadosAgenda = [];

async function carregarDadosAgenda() {
    try {
        const dataFim = new Date(dataInicioAgenda);
        dataFim.setDate(dataInicioAgenda.getDate() + DIAS_EXIBIR);
        const params = new URLSearchParams({
            data_inicio: dataInicioAgenda.toISOString().split('T')[0],
            data_fim: dataFim.toISOString().split('T')[0]
        });

        const [consultoresRes, eventosRes, feriadosRes] = await Promise.all([
            apiRequest('/api/consultores/?page_size=100'),
            apiRequest(`/api/cronograma/eventos?${params}`),
            apiRequest(`/api/feriados/?inicio=${params.get('data_inicio')}&fim=${params.get('data_fim')}`)
        ]);

        consultoresAgenda = (await consultoresRes.json()).items || [];
        eventosAgenda = await eventosRes.json();
        feriadosAgenda = await feriadosRes.json();

        renderizarScheduler();
        renderizarTabelaMetricas();
        atualizarPeriodoExibido();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
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

    let html = `<div class="scheduler-grid" style="grid-template-columns: 200px repeat(${datas.length}, minmax(90px, 1fr));">`;

    html += `<div class="scheduler-corner scheduler-cell p-3 border-b-2 border-r-2 border-dark-border/50">
        <div class="text-sm font-bold text-white uppercase tracking-wider">Consultores</div>
    </div>`;

    datas.forEach(data => {
        const dataStr = data.toISOString().split('T')[0];
        const isHoje = data.getTime() === hoje.getTime();
        const diaSemana = data.getDay();
        const feriado = feriadosAgenda.find(f => f.data === dataStr);

        let classes = 'scheduler-header-cell scheduler-cell p-2 text-center border-b-2 border-dark-border/50 ';
        if (feriado) classes += 'bg-red-900/10 border-red-500/30 ';
        else if (isHoje) classes += 'today-col ';
        else if (diaSemana === 0 || diaSemana === 6) classes += 'weekend-col ';

        html += `<div class="${classes}">
            <div class="text-lg font-bold ${isHoje ? 'text-blue-400' : 'text-white'}">${data.getDate()}</div>
            <div class="text-[10px] text-gray-400">${DIAS_SEMANA[diaSemana]}</div>
        </div>`;
    });

    consultoresAgenda.forEach(consultor => {
        html += `<div class="scheduler-row-header scheduler-cell p-3 border-r-2 border-dark-border/50 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style="background-color: ${getCorConsultor(consultor.id)}">
                ${getIniciaisAgenda(consultor.nome)}
            </div>
            <div class="truncate text-sm font-medium text-white">${consultor.nome}</div>
        </div>`;

        datas.forEach(data => {
            const dataStr = data.toISOString().split('T')[0];
            const eventosCell = eventosAgenda.filter(e => e.consultor_id === consultor.id && e.data === dataStr);

            html += `<div class="scheduler-cell group relative" onclick="abrirModalNovoEvento('${dataStr}', ${consultor.id})">`;

            if (eventosCell.length > 0) {
                eventosCell.forEach(evento => {
                    const cat = CATEGORIA_CORES_AGENDA[evento.categoria] || CATEGORIA_CORES_AGENDA['O'];
                    const empresaNome = evento.empresa_nome ? evento.empresa_nome.split(' ')[0] : (evento.sigla_empresa || 'N/A');
                    const consultorNome = evento.consultor_nome ? evento.consultor_nome.split(' ')[0] : 'N/A';
                    const programa = evento.program_nome ? evento.program_nome.substring(0, 15) : '';

                    html += `<div class="scheduler-cell-content" 
                        style="background-color: ${cat.cor}; color: ${cat.corTexto};"
                        onclick="event.stopPropagation(); mostrarDetalheEvento(${evento.id})"
                        onmouseenter="mostrarTooltip(event, ${evento.id})"
                        onmouseleave="esconderTooltip()">
                        <div class="font-bold truncate text-[11px]">${empresaNome}</div>
                        <div class="text-[9px] truncate opacity-90">${consultorNome}</div>
                        ${programa ? `<div class="text-[8px] opacity-80 truncate border-t border-white/20 mt-1 pt-0.5">${programa}</div>` : ''}
                    </div>`;
                });
            } else {
                html += `<div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-plus text-blue-500/50"></i>
                </div>`;
            }
            html += `</div>`;
        });
    });

    html += '</div>';
    container.innerHTML = html;
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
            ${evento.program_nome ? `<div><div class="text-xs text-gray-400">Programa</div><div class="text-sm text-green-400">${evento.program_nome}</div></div>` : ''}
            ${evento.descricao ? `<div><div class="text-xs text-gray-400">Descrição</div><div class="text-xs text-gray-300 italic">${evento.descricao}</div></div>` : ''}
        </div>
    `;

    tooltip.style.left = `${event.pageX + 15}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.classList.remove('hidden');
}

function esconderTooltip() {
    const t = document.getElementById('tooltipAgenda');
    if (t) t.classList.add('hidden');
}

function abrirModalNovoEvento(data, consultorId) {
    const modal = document.getElementById('modalEvento');
    const form = document.getElementById('formEvento');
    form.reset();

    document.getElementById('modalEventoTitulo').textContent = 'Novo Agendamento';
    document.getElementById('eventoId').value = '';
    document.getElementById('eventoData').value = data;

    const selectConsultor = document.getElementById('eventoConsultor');
    if (selectConsultor) {
        selectConsultor.innerHTML = consultoresAgenda.map(c =>
            `<option value="${c.id}" ${c.id === consultorId ? 'selected' : ''}>${c.nome}</option>`
        ).join('');
    }

    document.getElementById('configuracaoDistribuicao').classList.remove('hidden');
    modal.classList.remove('hidden');
}

function fecharModalEvento() {
    document.getElementById('modalEvento').classList.add('hidden');
}

async function salvarEventoAgenda(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('btnSalvarEvento');
    btn.disabled = true;

    try {
        const eventoId = document.getElementById('eventoId').value;
        const programId = document.getElementById('eventoPrograma').value;
        const empresaId = document.getElementById('eventoEmpresaId').value;

        if (eventoId) {
            const dados = {
                data: document.getElementById('eventoData').value,
                categoria: document.getElementById('eventoCategoria').value,
                consultor_id: parseInt(document.getElementById('eventoConsultor').value),
                empresa_id: empresaId ? parseInt(empresaId) : null,
                sigla_empresa: document.getElementById('eventoSigla').value || null,
                descricao: document.getElementById('eventoDescricao').value
            };
            await apiRequest(`/api/cronograma/eventos/${eventoId}`, { method: 'PUT', body: JSON.stringify(dados) });
        } else if (programId) {
            const diasCheckboxes = document.querySelectorAll('input[name="eventoDiasSemana"]:checked');
            const dadosAuto = {
                program_id: parseInt(programId),
                consultor_id: parseInt(document.getElementById('eventoConsultor').value),
                empresa_id: empresaId ? parseInt(empresaId) : null,
                data_inicio: document.getElementById('eventoData').value,
                dias_semana: Array.from(diasCheckboxes).map(cb => parseInt(cb.value)),
                horas_por_dia: parseFloat(document.getElementById('eventoHorasDia').value || 8)
            };
            await apiRequest('/api/programs/auto-schedule', { method: 'POST', body: JSON.stringify(dadosAuto) });
        } else {
            throw new Error('Selecione uma empresa e um programa.');
        }

        showToast('Operação realizada com sucesso!', 'success');
        fecharModalEvento();
        carregarDadosAgenda();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function mostrarDetalheEvento(eventoId) {
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${eventoId}`);
        eventoSelecionado = await response.json();
        const cat = CATEGORIA_CORES_AGENDA[eventoSelecionado.categoria] || CATEGORIA_CORES_AGENDA['O'];
        const dataFormatada = new Date(eventoSelecionado.data + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        });

        document.getElementById('modalDetalheConteudo').innerHTML = `
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
                    <div class="text-white font-medium text-lg">${eventoSelecionado.consultor_nome || 'N/A'}</div>
                </div>
            </div>
            
            ${eventoSelecionado.program_nome ? `<div class="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-medium">Programa: ${eventoSelecionado.program_nome}</div>` : ''}
            ${eventoSelecionado.descricao ? `<div class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/30 text-sm text-gray-300">${eventoSelecionado.descricao}</div>` : ''}

            <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 mt-2">
                <div class="font-medium text-blue-400 mb-2 flex items-center gap-2 text-sm">
                    <i class="fas fa-calendar-alt"></i> Reagendar Atividade
                </div>
                <div class="flex gap-2">
                    <input type="date" id="novaDataReagendamento" class="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" value="${eventoSelecionado.data}">
                    <button onclick="salvarReagendamento(${eventoSelecionado.id})" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Confirmar</button>
                </div>
            </div>
        `;
        document.getElementById('modalDetalheEvento').classList.remove('hidden');
    } catch (e) { console.error(e); }
}

async function salvarReagendamento(id) {
    const novaData = document.getElementById('novaDataReagendamento').value;
    if (!novaData) return;
    try {
        await apiRequest(`/api/cronograma/eventos/${id}`, { method: 'PUT', body: JSON.stringify({ data: novaData }) });
        showToast('Reagendado com sucesso!', 'success');
        fecharModalDetalhe();
        carregarDadosAgenda();
    } catch (e) { showToast('Erro ao reagendar', 'error'); }
}

function fecharModalDetalhe() {
    document.getElementById('modalDetalheEvento').classList.add('hidden');
}

function editarEventoAgenda() {
    if (!eventoSelecionado) return;
    fecharModalDetalhe();
    const modal = document.getElementById('modalEvento');
    document.getElementById('modalEventoTitulo').textContent = 'Editar Agendamento';
    document.getElementById('eventoId').value = eventoSelecionado.id;
    document.getElementById('eventoData').value = eventoSelecionado.data;
    document.getElementById('eventoBuscaEmpresa').value = eventoSelecionado.empresa_nome || '';
    document.getElementById('eventoEmpresaId').value = eventoSelecionado.empresa_id || '';
    document.getElementById('eventoSigla').value = eventoSelecionado.sigla_empresa || '';
    document.getElementById('eventoCategoria').value = eventoSelecionado.categoria || 'P';
    document.getElementById('eventoDescricao').value = eventoSelecionado.descricao || '';
    document.getElementById('configuracaoDistribuicao').classList.add('hidden');
    modal.classList.remove('hidden');
}

async function excluirEventoAgenda() {
    if (!eventoSelecionado || !confirm('Deseja realmente excluir este agendamento?')) return;
    try {
        await apiRequest(`/api/cronograma/eventos/${eventoSelecionado.id}`, { method: 'DELETE' });
        showToast('Agendamento excluído!', 'success');
        fecharModalDetalhe();
        carregarDadosAgenda();
    } catch (e) { showToast('Erro ao excluir', 'error'); }
}

async function excluirTodosEventosPrograma() {
    if (!eventoSelecionado?.program_id || !confirm('ATENÇÃO: Isso excluirá TODOS os agendamentos deste programa. Continuar?')) return;
    try {
        await apiRequest(`/api/cronograma/eventos/bulk?program_id=${eventoSelecionado.program_id}`, { method: 'DELETE' });
        showToast('Todos os eventos do programa foram excluídos!', 'success');
        fecharModalDetalhe();
        carregarDadosAgenda();
    } catch (e) { showToast('Erro ao excluir em massa', 'error'); }
}

function getIniciaisAgenda(nome) {
    if (!nome) return '??';
    const partes = nome.split(' ').filter(p => p.length > 0);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function getCorConsultor(id) {
    const cores = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
    return cores[id % cores.length];
}

function navegarSemanas(n) {
    dataInicioAgenda.setDate(dataInicioAgenda.getDate() + (n * 7));
    carregarDadosAgenda();
}

function irParaHojeAgenda() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataInicioAgenda = new Date(hoje);
    dataInicioAgenda.setDate(hoje.getDate() - hoje.getDay() - 7);
    carregarDadosAgenda();
}

function toggleLegenda() {
    document.getElementById('legendaContainer').classList.toggle('hidden');
}

function atualizarPeriodoExibido() {
    const f = (d) => `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}`;
    const fim = new Date(dataInicioAgenda);
    fim.setDate(dataInicioAgenda.getDate() + DIAS_EXIBIR - 1);
    document.getElementById('periodoAtual').textContent = `${f(dataInicioAgenda)} - ${f(fim)} ${fim.getFullYear()}`;
}

async function renderizarTabelaMetricas() {
    const container = document.getElementById('metricsContainer');
    if (!container) return;

    try {
        const response = await apiRequest('/api/cronograma/metrics');
        if (!response.ok) throw new Error('Erro ao carregar métricas');
        const metrics = await response.json();

        // Suporta tanto o array simples quanto o objeto { programas: [] }
        const listaProgramas = metrics.programas || metrics;

        let html = `
        <div class="glass-effect rounded-xl overflow-hidden border border-dark-border/30 mt-8">
            <div class="bg-dark-card/50 px-6 py-4 border-b border-dark-border/30 flex justify-between items-center">
                <h3 class="text-white font-bold text-lg"><i class="fas fa-chart-bar mr-2 text-blue-400"></i>Gestão Global de Programas</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-dark-card/30 text-xs text-gray-400 uppercase border-b border-dark-border/30">
                            <th class="px-6 py-3">Consultor</th>
                            <th class="px-6 py-3">Empresa</th>
                            <th class="px-6 py-3">Programa</th>
                            <th class="px-6 py-3 text-center">Carga Total</th>
                            <th class="px-6 py-3">Status Execução</th>
                            <th class="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-dark-border/20">
        `;

        listaProgramas.forEach(m => {
            // Mapeia propriedades dependendo do formato do objeto
            const consultor = m.consultor_nome || m.consultor;
            const empresa = m.projeto_nome || m.empresa;
            const programa = m.programa_nome || m.nome;
            const cargaTotal = m.carga_total || m.meta_total;
            const horasRealizadas = m.horas_contabilizadas || m.horas_realizadas || 0;
            const progresso = (horasRealizadas / cargaTotal) * 100;

            html += `
                <tr class="hover:bg-dark-hover/30 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                                ${getIniciaisAgenda(consultor)}
                            </div>
                            <span class="text-xs text-white font-medium">${consultor}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-xs text-gray-300 font-medium">${empresa}</td>
                    <td class="px-6 py-4">
                        <div class="text-[11px] text-green-400 font-bold">${programa}</div>
                    </td>
                    <td class="px-6 py-4 text-center text-xs text-white font-bold">${cargaTotal}h</td>
                    <td class="px-6 py-4">
                        <div class="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden mb-1">
                            <div class="h-full bg-blue-500 rounded-full" style="width: ${Math.min(progresso, 100)}%"></div>
                        </div>
                        <span class="text-[9px] text-gray-400">${Math.round(progresso)}% executado</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                         <span class="text-[10px] text-gray-500">${m.ultima_data ? new Date(m.ultima_data).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error(error);
    }
}
