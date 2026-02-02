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

async function carregarDadosAgenda() {
    try {
        const dataFim = new Date(dataInicioAgenda);
        dataFim.setDate(dataInicioAgenda.getDate() + DIAS_EXIBIR);
        
        const params = new URLSearchParams({
            data_inicio: dataInicioAgenda.toISOString().split('T')[0],
            data_fim: dataFim.toISOString().split('T')[0]
        });
        
        const [consultoresRes, eventosRes] = await Promise.all([
            apiRequest('/api/consultores/?page_size=100'),
            apiRequest(`/api/cronograma/eventos?${params}`)
        ]);
        
        const consultoresData = await consultoresRes.json();
        consultoresAgenda = consultoresData.items || [];
        eventosAgenda = await eventosRes.json();
        
        renderizarScheduler();
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
        const diaSemana = data.getDay();
        const isHoje = data.getTime() === hoje.getTime();
        const isFimDeSemana = diaSemana === 0 || diaSemana === 6;
        const isInicioSemana = diaSemana === 0;
        const mesAtual = data.getMonth();
        const mostraMes = mesAtual !== ultimoMes;
        ultimoMes = mesAtual;
        
        let classes = 'scheduler-header-cell scheduler-cell p-2 text-center border-b-2 border-dark-border/50 ';
        if (isHoje) classes += 'today-col ';
        if (isFimDeSemana) classes += 'weekend-col ';
        if (isInicioSemana && idx > 0) classes += 'week-separator ';
        
        html += `<div class="${classes}">
            ${mostraMes ? `<div class="text-[9px] text-blue-400 font-bold uppercase">${MESES_CURTOS[mesAtual]}</div>` : ''}
            <div class="text-lg font-bold ${isHoje ? 'text-blue-400' : isFimDeSemana ? 'text-gray-500' : 'text-white'}">${data.getDate()}</div>
            <div class="text-[10px] ${isHoje ? 'text-blue-300' : isFimDeSemana ? 'text-gray-600' : 'text-gray-400'}">${DIAS_SEMANA[diaSemana]}</div>
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
            
            let classes = 'scheduler-cell ';
            if (isHoje) classes += 'today-col ';
            if (isFimDeSemana) classes += 'weekend-col ';
            if (isInicioSemana && idx > 0) classes += 'week-separator ';
            
            html += `<div class="${classes}">`;
            
            if (eventosCell.length > 0) {
                eventosCell.forEach(evento => {
                    const cat = CATEGORIA_CORES_AGENDA[evento.categoria] || CATEGORIA_CORES_AGENDA['O'];
                    const sigla = evento.sigla_empresa || 'N/A';
                    const programa = evento.program_nome ? evento.program_nome.substring(0, 12) : '';
                    
                    html += `<div class="scheduler-cell-content" 
                        style="background-color: ${cat.cor}; color: ${cat.corTexto};"
                        onclick="mostrarDetalheEvento(${evento.id})"
                        onmouseenter="mostrarTooltip(event, ${evento.id})"
                        onmouseleave="esconderTooltip()">
                        <div class="font-bold truncate">${evento.categoria}-${sigla}</div>
                        ${programa ? `<div class="text-[8px] opacity-80 truncate">${programa}</div>` : ''}
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
                    <div class="text-white font-medium">${eventoSelecionado.empresa_nome || 'N/A'}</div>
                    <div class="text-blue-400 text-sm">${eventoSelecionado.sigla_empresa || ''}</div>
                </div>
                <div class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/30">
                    <div class="text-xs text-gray-400 mb-1">Consultor</div>
                    <div class="flex items-center gap-2 mt-1">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style="background-color: ${getCorConsultor(eventoSelecionado.consultor_id)}">
                            ${getIniciaisAgenda(eventoSelecionado.consultor_nome)}
                        </div>
                        <span class="text-white">${eventoSelecionado.consultor_nome || 'N/A'}</span>
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
            
            <div class="flex items-center gap-2 text-xs text-gray-500">
                <i class="fas fa-clock"></i>
                <span>Período: ${eventoSelecionado.periodo === 'D' ? 'Dia todo' : eventoSelecionado.periodo === 'M' ? 'Manhã' : 'Tarde'}</span>
            </div>
        `;
        
        document.getElementById('modalDetalheEvento').classList.remove('hidden');
    } catch (error) {
        console.error('Erro:', error);
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
