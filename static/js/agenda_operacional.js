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

    // Event Listeners para Busca de Empresa
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

    // Header corner
    html += `<div class="scheduler-corner scheduler-cell p-3 border-b-2 border-r-2 border-dark-border/50">
        <div class="text-sm font-bold text-white uppercase tracking-wider">Consultores</div>
    </div>`;

    // Header dates
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

    // Rows
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
                    html += `<div class="scheduler-cell-content" 
                        style="background-color: ${cat.cor}; color: ${cat.corTexto};"
                        onclick="event.stopPropagation(); mostrarDetalheEvento(${evento.id})">
                        <div class="truncate">${evento.sigla_empresa || evento.empresa_nome || 'N/A'}</div>
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

function abrirModalNovoEvento(data, consultorId) {
    const modal = document.getElementById('modalEvento');
    const form = document.getElementById('formEvento');
    form.reset();

    document.getElementById('modalEventoTitulo').textContent = 'Novo Agendamento';
    document.getElementById('eventoId').value = '';
    document.getElementById('eventoData').value = data;

    const selectConsultor = document.getElementById('eventoConsultor');
    selectConsultor.innerHTML = consultoresAgenda.map(c =>
        `<option value="${c.id}" ${c.id === consultorId ? 'selected' : ''}>${c.nome}</option>`
    ).join('');

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

        showToast('Sucesso!', 'success');
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
        const dataFormatada = new Date(eventoSelecionado.data + 'T12:00:00').toLocaleDateString('pt-BR');

        document.getElementById('modalDetalheConteudo').innerHTML = `
            <div class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/30 space-y-4">
                <div class="flex items-center gap-3">
                    <div class="px-3 py-1 rounded-lg font-bold text-white" style="background-color: ${cat.cor}">${eventoSelecionado.categoria}</div>
                    <div class="text-white font-bold">${cat.nome}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400">Empresa</div>
                    <div class="text-blue-400 font-bold">${eventoSelecionado.empresa_nome || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400">Consultor</div>
                    <div class="text-white">${eventoSelecionado.consultor_nome}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-400">Data</div>
                    <div class="text-white">${dataFormatada}</div>
                </div>
            </div>
        `;
        document.getElementById('modalDetalheEvento').classList.remove('hidden');
    } catch (e) { console.error(e); }
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
    if (!eventoSelecionado || !confirm('Excluir?')) return;
    try {
        await apiRequest(`/api/cronograma/eventos/${eventoSelecionado.id}`, { method: 'DELETE' });
        showToast('Sucesso!', 'success');
        fecharModalDetalhe();
        carregarDadosAgenda();
    } catch (e) { showToast('Erro', 'error'); }
}

async function excluirTodosEventosPrograma() {
    if (!eventoSelecionado?.program_id || !confirm('Excluir todos?')) return;
    try {
        await apiRequest(`/api/cronograma/eventos/bulk?program_id=${eventoSelecionado.program_id}`, { method: 'DELETE' });
        showToast('Sucesso!', 'success');
        fecharModalDetalhe();
        carregarDadosAgenda();
    } catch (e) { showToast('Erro', 'error'); }
}

function getIniciaisAgenda(nome) {
    if (!nome) return '??';
    const p = nome.split(' ').filter(x => x).map(x => x[0]).join('');
    return p.substring(0, 2).toUpperCase();
}

function getCorConsultor(id) {
    const cores = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B'];
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
        const res = await apiRequest('/api/cronograma/metrics');
        const metrics = await res.json();
        let h = `<div class="glass-effect rounded-xl overflow-hidden border border-dark-border/30 mt-8">
            <div class="bg-dark-card/50 px-6 py-4 border-b border-dark-border/30 font-bold text-white">Metas por Programa</div>
            <div class="overflow-x-auto"><table class="w-full text-left">
            <thead class="text-xs text-gray-400 uppercase border-b border-dark-border/20">
            <tr><th class="px-6 py-3">Consultor/Empresa</th><th class="px-6 py-3 text-center">Meta</th><th class="px-6 py-3 text-center">Saldo</th></tr>
            </thead><tbody>`;
        metrics.programas.forEach(p => {
            h += `<tr class="border-b border-dark-border/10">
                <td class="px-6 py-4"><div class="text-white font-medium">${p.nome}</div><div class="text-xs text-gray-500">${p.consultor} / ${p.empresa}</div></td>
                <td class="px-6 py-4 text-center text-white font-bold">${p.meta_total}h</td>
                <td class="px-6 py-4 text-center"><span class="px-2 py-1 rounded bg-blue-500/10 text-blue-400">${p.total_horas}h</span></td>
            </tr>`;
        });
        h += `</tbody></table></div></div>`;
        container.innerHTML = h;
    } catch (e) { }
}
