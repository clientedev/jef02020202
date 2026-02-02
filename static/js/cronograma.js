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
    if (typeof checkAuth !== 'undefined') {
        checkAuth();
    }
    
    if (typeof atualizarSidebar !== 'undefined') {
        atualizarSidebar();
    }
    
    const hoje = new Date();
    document.getElementById('filtroMesAno').value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    carregarDados();
    
    document.getElementById('formEvento').addEventListener('submit', salvarEvento);
});

async function carregarDados() {
    try {
        await Promise.all([
            carregarConsultores(),
            carregarCategorias()
        ]);
        
        await carregarEventos();
        renderizarCalendario();
        renderizarCalendarioMobile();
        atualizarResumo();
        renderizarLegendaConsultores();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

function toggleFiltros() {
    const container = document.getElementById('filtrosContainer');
    if (container) {
        container.classList.toggle('hidden');
        container.classList.toggle('lg:block');
    }
}

function setVisualizacao(tipo) {
    visualizacaoMobile = tipo;
    
    const btnCalendario = document.getElementById('btnVisualizacaoCalendario');
    const btnLista = document.getElementById('btnVisualizacaoLista');
    const calendarioMobile = document.getElementById('calendarioMobile');
    const listaMobile = document.getElementById('listaEventosMobile');
    
    if (tipo === 'calendario') {
        btnCalendario.classList.add('bg-blue-500/20', 'text-blue-400');
        btnCalendario.classList.remove('text-gray-400');
        btnLista.classList.remove('bg-blue-500/20', 'text-blue-400');
        btnLista.classList.add('text-gray-400');
        calendarioMobile.classList.remove('hidden');
        listaMobile.classList.add('hidden');
    } else {
        btnLista.classList.add('bg-blue-500/20', 'text-blue-400');
        btnLista.classList.remove('text-gray-400');
        btnCalendario.classList.remove('bg-blue-500/20', 'text-blue-400');
        btnCalendario.classList.add('text-gray-400');
        calendarioMobile.classList.add('hidden');
        listaMobile.classList.remove('hidden');
        renderizarListaEventosMobile();
    }
}

function renderizarListaEventosMobile() {
    const container = document.getElementById('listaEventosMobile');
    if (!container) return;
    
    const eventosPorData = {};
    eventos.forEach(e => {
        if (!eventosPorData[e.data]) {
            eventosPorData[e.data] = [];
        }
        eventosPorData[e.data].push(e);
    });
    
    const datasOrdenadas = Object.keys(eventosPorData).sort();
    
    if (datasOrdenadas.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-calendar-times text-3xl text-gray-600 mb-3"></i>
                <p class="text-gray-400 text-sm">Nenhum evento neste mes</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    datasOrdenadas.forEach(dataStr => {
        const dataObj = new Date(dataStr + 'T12:00:00');
        const dia = dataObj.getDate();
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
        const eventosData = eventosPorData[dataStr];
        
        html += `
            <div class="bg-dark-card/30 rounded-xl overflow-hidden">
                <div class="flex items-center gap-3 px-3 py-2 bg-dark-card/50 border-b border-dark-border/30">
                    <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex flex-col items-center justify-center">
                        <span class="text-blue-400 text-xs font-medium">${diaSemana}</span>
                        <span class="text-white text-sm font-bold leading-none">${dia}</span>
                    </div>
                    <span class="text-gray-300 text-sm font-medium">${eventosData.length} evento${eventosData.length > 1 ? 's' : ''}</span>
                </div>
                <div class="p-2 space-y-1.5">
        `;
        
        eventosData.forEach(evento => {
            const catCor = CATEGORIA_CORES[evento.categoria]?.cor || '#6b7280';
            const consultorCor = getConsultorCor(evento.consultor_id);
            const iniciais = getIniciais(evento.consultor_nome);
            const titulo = evento.sigla_empresa || evento.categoria_nome;
            
            html += `
                <div class="flex items-center gap-2 p-2 rounded-lg bg-dark-bg/50 active:bg-dark-bg" onclick="editarEvento(${evento.id})">
                    <div class="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                         style="background-color: ${consultorCor};">
                        ${iniciais}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${catCor};"></span>
                            <span class="text-white text-xs font-medium truncate">${titulo}</span>
                        </div>
                        <span class="text-gray-500 text-[10px]">${getPrimeiroNome(evento.consultor_nome)}</span>
                    </div>
                    <i class="fas fa-chevron-right text-gray-600 text-xs"></i>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

function renderizarCalendarioMobile() {
    const container = document.getElementById('diasCalendarioMobile');
    if (!container) return;
    
    const primeiroDia = new Date(anoAtual, mesAtual, 1);
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let html = '';
    
    for (let i = 0; i < diaSemanaInicio; i++) {
        html += '<div class="aspect-square bg-dark-bg/20 rounded"></div>';
    }
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataAtual = new Date(anoAtual, mesAtual, dia);
        const dataStr = dataAtual.toISOString().split('T')[0];
        
        const eventosDoDia = eventos.filter(e => e.data === dataStr);
        const qtdEventos = eventosDoDia.length;
        
        const isHoje = dataAtual.getTime() === hoje.getTime();
        const isDomingo = dataAtual.getDay() === 0;
        const isSabado = dataAtual.getDay() === 6;
        
        let classesDia = 'aspect-square rounded p-0.5 flex flex-col items-center justify-start transition active:scale-95 ';
        
        if (isHoje) {
            classesDia += 'bg-blue-900/50 ring-1 ring-blue-500 ';
        } else if (isDomingo) {
            classesDia += 'bg-red-900/20 ';
        } else if (isSabado) {
            classesDia += 'bg-blue-900/20 ';
        } else {
            classesDia += 'bg-dark-bg/40 ';
        }
        
        let classeDia = 'text-[10px] font-bold ';
        if (isHoje) classeDia += 'text-blue-400';
        else if (isDomingo) classeDia += 'text-red-400';
        else if (isSabado) classeDia += 'text-blue-300';
        else classeDia += 'text-gray-300';
        
        html += `<div class="${classesDia}" onclick="abrirDetalhesDia('${dataStr}', ${dia})">`;
        html += `<span class="${classeDia}">${dia}</span>`;
        
        if (qtdEventos > 0) {
            const coresEventos = [...new Set(eventosDoDia.slice(0, 3).map(e => getConsultorCor(e.consultor_id)))];
            
            html += '<div class="flex gap-0.5 mt-0.5 flex-wrap justify-center">';
            coresEventos.forEach(cor => {
                html += `<span class="w-1.5 h-1.5 rounded-full" style="background-color: ${cor};"></span>`;
            });
            html += '</div>';
            
            if (qtdEventos > 3) {
                html += `<span class="text-[8px] text-gray-500">+${qtdEventos - 3}</span>`;
            }
        }
        
        html += '</div>';
    }
    
    const celulasRestantes = (7 - ((diaSemanaInicio + diasNoMes) % 7)) % 7;
    for (let i = 0; i < celulasRestantes; i++) {
        html += '<div class="aspect-square bg-dark-bg/20 rounded"></div>';
    }
    
    container.innerHTML = html;
    
    if (visualizacaoMobile === 'lista') {
        renderizarListaEventosMobile();
    }
}

function renderizarLegendaConsultores() {
    const container = document.getElementById('legendaConsultores');
    if (!container || consultores.length === 0) return;
    
    let html = '';
    consultores.forEach(c => {
        const cor = getConsultorCor(c.id);
        const iniciais = getIniciais(c.nome);
        const primeiroNome = getPrimeiroNome(c.nome);
        
        html += `
            <div class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-dark-card/50 hover:bg-dark-card active:bg-dark-card transition cursor-pointer border border-transparent hover:border-dark-border/50"
                 onclick="filtrarPorConsultor(${c.id})"
                 title="${c.nome}">
                <div class="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center text-white text-[9px] sm:text-xs font-bold shadow-sm"
                     style="background: linear-gradient(135deg, ${cor}, ${cor}cc);">
                    ${iniciais}
                </div>
                <span class="text-gray-300 text-[11px] sm:text-sm font-medium">${primeiroNome}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function filtrarPorConsultor(consultorId) {
    document.getElementById('filtroConsultor').value = consultorId;
    aplicarFiltros();
}

async function carregarConsultores() {
    try {
        const response = await apiRequest('/api/consultores/?page_size=100');
        const data = await response.json();
        consultores = data.items || [];
        
        const selectFiltro = document.getElementById('filtroConsultor');
        const selectEvento = document.getElementById('eventoConsultor');
        
        selectFiltro.innerHTML = '<option value="">Todos os consultores</option>';
        selectEvento.innerHTML = '<option value="">Selecione o consultor...</option>';
        
        consultores.forEach(c => {
            const optFiltro = document.createElement('option');
            optFiltro.value = c.id;
            optFiltro.textContent = c.nome;
            selectFiltro.appendChild(optFiltro);
            
            const optEvento = document.createElement('option');
            optEvento.value = c.id;
            optEvento.textContent = c.nome;
            selectEvento.appendChild(optEvento);
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
        select.innerHTML = '<option value="">Todas as categorias</option>';
        
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.codigo;
            option.textContent = `${cat.codigo} - ${cat.nome}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        categorias = Object.entries(CATEGORIA_CORES).map(([k, v]) => ({
            codigo: k,
            nome: v.nome,
            cor: v.cor
        }));
    }
}

async function carregarEventos() {
    try {
        const params = new URLSearchParams();
        
        const primeiroDia = new Date(anoAtual, mesAtual, 1);
        const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
        
        params.append('data_inicio', primeiroDia.toISOString().split('T')[0]);
        params.append('data_fim', ultimoDia.toISOString().split('T')[0]);
        
        const filtroConsultor = document.getElementById('filtroConsultor').value;
        const filtroCategoria = document.getElementById('filtroCategoria').value;
        
        if (filtroConsultor) params.append('consultor_id', filtroConsultor);
        if (filtroCategoria) params.append('categoria', filtroCategoria);
        
        const response = await apiRequest(`/api/cronograma/eventos?${params}`);
        eventos = await response.json();
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        eventos = [];
    }
}

function renderizarCalendario() {
    const container = document.getElementById('diasCalendario');
    document.getElementById('mesAnoAtual').textContent = `${MESES[mesAtual]} ${anoAtual}`;
    
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
        const dataAtual = new Date(anoAtual, mesAtual, dia);
        const dataStr = dataAtual.toISOString().split('T')[0];
        
        const eventosDoDia = eventos.filter(e => e.data === dataStr);
        
        const isHoje = dataAtual.getTime() === hoje.getTime();
        const isDomingo = dataAtual.getDay() === 0;
        const isSabado = dataAtual.getDay() === 6;
        
        let classesDia = 'min-h-[120px] rounded-lg p-2 transition cursor-pointer hover:ring-2 hover:ring-blue-500/50 ';
        
        if (isHoje) {
            classesDia += 'bg-blue-900/40 ring-2 ring-blue-500 ';
        } else if (isDomingo) {
            classesDia += 'bg-red-900/20 ';
        } else if (isSabado) {
            classesDia += 'bg-blue-900/20 ';
        } else {
            classesDia += 'bg-dark-bg/50 hover:bg-dark-bg/70 ';
        }
        
        html += `<div class="${classesDia}" onclick="abrirDetalhesDia('${dataStr}', ${dia})">`;
        
        let classeDia = 'text-sm font-bold mb-2 ';
        if (isHoje) classeDia += 'text-blue-400';
        else if (isDomingo) classeDia += 'text-red-400';
        else if (isSabado) classeDia += 'text-blue-300';
        else classeDia += 'text-white';
        
        html += `<div class="${classeDia}">${dia}</div>`;
        
        if (eventosDoDia.length > 0) {
            html += '<div class="space-y-1.5">';
            
            eventosDoDia.slice(0, 3).forEach(evento => {
                const catCor = CATEGORIA_CORES[evento.categoria]?.cor || '#6b7280';
                const consultorCor = getConsultorCor(evento.consultor_id);
                const iniciais = getIniciais(evento.consultor_nome);
                const primeiroNome = getPrimeiroNome(evento.consultor_nome);
                const titulo = evento.sigla_empresa || evento.categoria;
                
                html += `
                    <div class="evento-card group relative flex items-center gap-1 p-1 rounded-lg bg-dark-bg/80 hover:bg-dark-bg border border-dark-border/30 hover:border-dark-border transition-all cursor-pointer"
                         title="${evento.consultor_nome}: ${evento.categoria}-${evento.sigla_empresa || evento.categoria_nome}">
                        <div class="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shadow-sm"
                             style="background-color: ${consultorCor};">
                            ${iniciais}
                        </div>
                        <div class="flex-1 min-w-0 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${catCor};"></span>
                            <span class="text-[10px] text-gray-200 truncate">${primeiroNome}</span>
                        </div>
                    </div>
                `;
            });
            
            if (eventosDoDia.length > 3) {
                html += `<div class="text-[10px] text-blue-400 text-center font-medium hover:text-blue-300 cursor-pointer">+${eventosDoDia.length - 3} mais</div>`;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
    }
    
    const celulasRestantes = (7 - ((diaSemanaInicio + diasNoMes) % 7)) % 7;
    for (let i = 0; i < celulasRestantes; i++) {
        html += '<div class="min-h-[120px] bg-dark-bg/30 rounded-lg"></div>';
    }
    
    container.innerHTML = html;
}

function atualizarResumo() {
    document.getElementById('totalEventos').textContent = eventos.length;
    
    const contagem = {};
    eventos.forEach(e => {
        contagem[e.categoria] = (contagem[e.categoria] || 0) + 1;
    });
    
    const container = document.getElementById('resumoCategorias');
    let html = '';
    
    Object.entries(CATEGORIA_CORES).forEach(([codigo, info]) => {
        const qtd = contagem[codigo] || 0;
        if (qtd > 0) {
            html += `
                <div class="flex items-center justify-between p-2 rounded-lg" style="background-color: ${info.cor}20;">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style="background-color: ${info.cor};">${codigo}</div>
                        <span class="text-gray-300 text-sm">${info.nome}</span>
                    </div>
                    <span class="text-white font-bold">${qtd}</span>
                </div>
            `;
        }
    });
    
    container.innerHTML = html || '<p class="text-gray-500 text-sm col-span-2 text-center py-4">Nenhum evento neste mes</p>';
}

function abrirDetalhesDia(dataStr, dia) {
    dataSelecionada = dataStr;
    
    const dataObj = new Date(dataStr + 'T12:00:00');
    const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][dataObj.getDay()];
    const diaSemanaFull = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'][dataObj.getDay()];
    
    const isMobile = window.innerWidth < 640;
    const tituloData = isMobile ? 
        `${diaSemana}, ${dia}/${mesAtual + 1}` : 
        `${diaSemanaFull}, ${dia} de ${MESES[mesAtual]}`;
    
    document.getElementById('modalDetalhesTitulo').innerHTML = `
        <i class="fas fa-calendar-day text-blue-400 text-sm"></i>
        <span class="truncate">${tituloData}</span>
    `;
    
    const eventosDoDia = eventos.filter(e => e.data === dataStr);
    
    const container = document.getElementById('modalDetalhesConteudo');
    
    if (eventosDoDia.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-calendar-times text-4xl text-gray-600 mb-4"></i>
                <p class="text-gray-400">Nenhum evento neste dia</p>
                <button onclick="abrirModalNovoEventoData()" class="mt-4 px-4 py-2 btn-primary text-white rounded-xl text-sm">
                    <i class="fas fa-plus mr-2"></i>Adicionar Evento
                </button>
            </div>
        `;
    } else {
        let html = '';
        const isMobile = window.innerWidth < 640;
        
        const eventosPorConsultor = {};
        eventosDoDia.forEach(e => {
            const key = e.consultor_id || 0;
            if (!eventosPorConsultor[key]) {
                eventosPorConsultor[key] = {
                    nome: e.consultor_nome,
                    id: e.consultor_id,
                    eventos: []
                };
            }
            eventosPorConsultor[key].eventos.push(e);
        });
        
        Object.values(eventosPorConsultor).forEach(consultor => {
            const consultorCor = getConsultorCor(consultor.id);
            const iniciais = getIniciais(consultor.nome);
            const nomeExibir = isMobile ? getPrimeiroNome(consultor.nome) : consultor.nome;
            
            html += `
                <div class="bg-dark-card/50 rounded-lg sm:rounded-xl overflow-hidden border border-dark-border/30">
                    <div class="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 border-b border-dark-border/30" style="background: linear-gradient(135deg, ${consultorCor}15, transparent);">
                        <div class="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-sm sm:text-lg font-bold shadow-lg flex-shrink-0"
                             style="background: linear-gradient(135deg, ${consultorCor}, ${consultorCor}cc);">
                            ${iniciais}
                        </div>
                        <div class="flex-1 min-w-0">
                            <span class="text-white font-semibold text-sm sm:text-lg truncate block">${nomeExibir}</span>
                            <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium inline-block mt-0.5" 
                                  style="background-color: ${consultorCor}30; color: ${consultorCor};">
                                ${consultor.eventos.length} evento${consultor.eventos.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            `;
            
            consultor.eventos.forEach(evento => {
                const catCor = CATEGORIA_CORES[evento.categoria]?.cor || '#6b7280';
                const titulo = evento.sigla_empresa ? 
                    `${evento.categoria}-${evento.sigla_empresa}` : 
                    evento.titulo || evento.categoria_nome;
                const periodo = evento.periodo === 'M' ? 'M' : evento.periodo === 'T' ? 'T' : 'D';
                const periodoFull = evento.periodo === 'M' ? 'Manha' : evento.periodo === 'T' ? 'Tarde' : 'Dia todo';
                const periodoIcon = evento.periodo === 'M' ? 'sun' : evento.periodo === 'T' ? 'cloud-sun' : 'calendar-day';
                
                html += `
                    <div class="flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl bg-dark-bg/70 active:bg-dark-bg sm:hover:bg-dark-bg transition group border border-transparent sm:hover:border-dark-border/50">
                        <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div class="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md flex-shrink-0" 
                                 style="background: linear-gradient(135deg, ${catCor}, ${catCor}cc);">
                                ${evento.categoria}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p class="text-white font-medium text-xs sm:text-base truncate">${titulo}</p>
                                <div class="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                    <span class="text-gray-400 text-[10px] sm:text-xs hidden sm:inline">${evento.categoria_nome}</span>
                                    <span class="text-gray-600 hidden sm:inline">|</span>
                                    <span class="text-gray-400 text-[10px] sm:text-xs flex items-center gap-1">
                                        <i class="fas fa-${periodoIcon} text-[8px] sm:text-[10px]"></i> 
                                        <span class="sm:hidden">${periodo}</span>
                                        <span class="hidden sm:inline">${periodoFull}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition flex-shrink-0">
                            <button onclick="editarEvento(${evento.id})" class="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40 text-blue-400 flex items-center justify-center transition">
                                <i class="fas fa-edit text-[10px] sm:text-sm"></i>
                            </button>
                            <button onclick="confirmarExclusao(${evento.id})" class="w-7 h-7 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 text-red-400 flex items-center justify-center transition">
                                <i class="fas fa-trash text-[10px] sm:text-sm"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        });
        
        container.innerHTML = html;
    }
    
    document.getElementById('modalDetalhesDia').classList.remove('hidden');
}

function fecharModalDetalhesDia() {
    document.getElementById('modalDetalhesDia').classList.add('hidden');
    dataSelecionada = null;
}

function abrirModalNovoEvento() {
    document.getElementById('modalEventoTitulo').innerHTML = '<i class="fas fa-calendar-plus text-blue-400"></i> Novo Evento';
    document.getElementById('formEvento').reset();
    document.getElementById('eventoId').value = '';
    document.getElementById('btnExcluirEvento').classList.add('hidden');
    
    // Mostrar campo de programa e carregar opções
    const campoPrograma = document.getElementById('campoEventoPrograma');
    if (campoPrograma) {
        campoPrograma.classList.remove('hidden');
        carregarProgramasNoEvento();
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('eventoData').value = hoje;
    
    document.getElementById('modalEvento').classList.remove('hidden');
}

async function carregarProgramasNoEvento() {
    try {
        const response = await apiRequest('/api/programs/');
        const programas = await response.json();
        const select = document.getElementById('eventoPrograma');
        if (select) {
            select.innerHTML = '<option value="">Selecione um programa...</option>' + 
                programas.map(p => `<option value="${p.id}" data-empresa-id="${p.empresa_id || ''}">${p.nome}</option>`).join('');
            
            // Listener para preencher empresa automaticamente
            select.onchange = async function() {
                const option = this.options[this.selectedIndex];
                const empresaId = option.getAttribute('data-empresa-id');
                if (empresaId) {
                    try {
                        const respEmp = await apiRequest(`/api/empresas/${empresaId}`);
                        const empresa = await respEmp.json();
                        document.getElementById('eventoSigla').value = empresa.sigla || empresa.empresa;
                    } catch (e) {
                        console.error('Erro ao buscar detalhes da empresa:', e);
                    }
                }
            };
        }
    } catch (error) {
        console.error('Erro ao carregar programas no evento:', error);
    }
}

function abrirModalNovoEventoData() {
    fecharModalDetalhesDia();
    
    document.getElementById('modalEventoTitulo').innerHTML = '<i class="fas fa-calendar-plus text-blue-400"></i> Novo Evento';
    document.getElementById('formEvento').reset();
    document.getElementById('eventoId').value = '';
    document.getElementById('btnExcluirEvento').classList.add('hidden');
    
    if (dataSelecionada) {
        document.getElementById('eventoData').value = dataSelecionada;
    }
    
    document.getElementById('modalEvento').classList.remove('hidden');
}

async function editarEvento(eventoId) {
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${eventoId}`);
        const evento = await response.json();
        
        document.getElementById('modalEventoTitulo').innerHTML = '<i class="fas fa-calendar-edit text-blue-400"></i> Editar Evento';
        document.getElementById('eventoId').value = evento.id;
        document.getElementById('eventoData').value = evento.data;
        document.getElementById('eventoCategoria').value = evento.categoria;
        document.getElementById('eventoPeriodo').value = evento.periodo || 'D';
        document.getElementById('eventoConsultor').value = evento.consultor_id;
        document.getElementById('eventoSigla').value = evento.sigla_empresa || '';
        document.getElementById('eventoDescricao').value = evento.descricao || '';
        
        // Esconder campo de programa na edição
        const campoPrograma = document.getElementById('campoEventoPrograma');
        if (campoPrograma) campoPrograma.classList.add('hidden');
        
        document.getElementById('btnExcluirEvento').classList.remove('hidden');
        
        fecharModalDetalhesDia();
        document.getElementById('modalEvento').classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao carregar evento:', error);
        alert('Erro ao carregar evento para edicao');
    }
}

function fecharModalEvento() {
    document.getElementById('modalEvento').classList.add('hidden');
}

async function salvarEvento(e) {
    e.preventDefault();
    
    const eventoId = document.getElementById('eventoId').value;
    const programId = document.getElementById('eventoPrograma')?.value;
    const dados = {
        data: document.getElementById('eventoData').value,
        categoria: document.getElementById('eventoCategoria').value,
        periodo: document.getElementById('eventoPeriodo').value,
        consultor_id: parseInt(document.getElementById('eventoConsultor').value),
        sigla_empresa: document.getElementById('eventoSigla').value || null,
        descricao: document.getElementById('eventoDescricao').value || null,
        program_id: programId ? parseInt(programId) : null
    };
    
    try {
        let response;
        if (eventoId) {
            response = await apiRequest(`/api/cronograma/eventos/${eventoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        } else {
            response = await apiRequest('/api/cronograma/eventos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
        }
        
        if (response.ok) {
            fecharModalEvento();
            await carregarEventos();
            renderizarCalendario();
            atualizarResumo();
            
            if (dataSelecionada) {
                const dia = new Date(dataSelecionada + 'T12:00:00').getDate();
                abrirDetalhesDia(dataSelecionada, dia);
            }
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao salvar evento');
        }
    } catch (error) {
        console.error('Erro ao salvar evento:', error);
        alert('Erro ao salvar evento');
    }
}

async function excluirEvento() {
    const eventoId = document.getElementById('eventoId').value;
    if (!eventoId) return;
    
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${eventoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            fecharModalEvento();
            await carregarEventos();
            renderizarCalendario();
            atualizarResumo();
        } else {
            alert('Erro ao excluir evento');
        }
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento');
    }
}

async function confirmarExclusao(eventoId) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    
    try {
        const response = await apiRequest(`/api/cronograma/eventos/${eventoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await carregarEventos();
            renderizarCalendario();
            atualizarResumo();
            
            if (dataSelecionada) {
                const dia = new Date(dataSelecionada + 'T12:00:00').getDate();
                abrirDetalhesDia(dataSelecionada, dia);
            }
        } else {
            alert('Erro ao excluir evento');
        }
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento');
    }
}

function mesAnterior() {
    mesAtual--;
    if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
    }
    document.getElementById('filtroMesAno').value = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
    carregarEventos().then(() => {
        renderizarCalendario();
        renderizarCalendarioMobile();
        atualizarResumo();
    });
}

function proximoMes() {
    mesAtual++;
    if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
    }
    document.getElementById('filtroMesAno').value = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
    carregarEventos().then(() => {
        renderizarCalendario();
        renderizarCalendarioMobile();
        atualizarResumo();
    });
}

function irParaHoje() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    document.getElementById('filtroMesAno').value = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
    carregarEventos().then(() => {
        renderizarCalendario();
        renderizarCalendarioMobile();
        atualizarResumo();
    });
}

async function aplicarFiltros() {
    const mesAno = document.getElementById('filtroMesAno').value;
    if (mesAno) {
        const [ano, mes] = mesAno.split('-').map(Number);
        anoAtual = ano;
        mesAtual = mes - 1;
    }
    
    await carregarEventos();
    renderizarCalendario();
    renderizarCalendarioMobile();
    atualizarResumo();
    
    const filtrosContainer = document.getElementById('filtrosContainer');
    if (filtrosContainer && window.innerWidth < 1024) {
        filtrosContainer.classList.add('hidden');
    }
}

function limparFiltros() {
    document.getElementById('filtroConsultor').value = '';
    document.getElementById('filtroCategoria').value = '';
    
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    document.getElementById('filtroMesAno').value = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
    
    aplicarFiltros();
}

function filtrarPorCategoria(categoria) {
    document.getElementById('filtroCategoria').value = categoria;
    aplicarFiltros();
}
