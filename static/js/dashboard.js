checkAuth();
atualizarSidebar();

const usuario = getUsuario();

let graficoProspeccoesInstance = null;
let graficoAgendamentosInstance = null;
let graficoEmpresasInstance = null;

async function carregarDashboard() {
    try {
        const statsRes = await apiRequest('/api/dashboard/stats');
        if (!statsRes.ok) {
            throw new Error(`Erro ao carregar estatísticas: ${statsRes.status}`);
        }
        const stats = await statsRes.json();

        document.getElementById('totalEmpresas').textContent = stats.total_empresas;
        document.getElementById('totalProspeccoes').textContent = stats.total_prospeccoes;
        document.getElementById('totalAgendamentos').textContent = stats.total_agendamentos;

        mostrarAlertasRecentes(stats.alertas);
        renderizarGraficos(stats);

        if (usuario.tipo !== 'admin') {
            await carregarEmpresasAtribuidas();
        } else {
            document.getElementById('empresasAtribuidasSection').style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error.message || error);
        document.getElementById('totalEmpresas').textContent = 'Erro';
        document.getElementById('totalProspeccoes').textContent = 'Erro';
        document.getElementById('totalAgendamentos').textContent = 'Erro';
    }
}

function renderizarGraficos(stats) {
    renderizarGraficoProspeccoes(stats.prospeccoes_por_resultado);
    renderizarGraficoAgendamentos(stats.agendamentos_por_status);
    renderizarGraficoEmpresas(stats.empresas_por_consultor);
}

function renderizarGraficoProspeccoes(data) {
    const ctx = document.getElementById('graficoProspeccoes');
    if (!ctx) return;

    if (graficoProspeccoesInstance) {
        graficoProspeccoesInstance.destroy();
    }

    const labels = Object.keys(data);
    const valores = Object.values(data);

    graficoProspeccoesInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prospecções por Resultado',
                data: valores,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function renderizarGraficoAgendamentos(data) {
    const ctx = document.getElementById('graficoAgendamentos');
    if (!ctx) return;

    if (graficoAgendamentosInstance) {
        graficoAgendamentosInstance.destroy();
    }

    graficoAgendamentosInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Vencidos', 'Hoje', 'Futuros'],
            datasets: [{
                data: [data.vencidos, data.hoje, data.futuros],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.5)',
                    'rgba(251, 191, 36, 0.5)',
                    'rgba(34, 197, 94, 0.5)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(34, 197, 94, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

function renderizarGraficoEmpresas(data) {
    const ctx = document.getElementById('graficoEmpresas');
    if (!ctx) return;

    if (graficoEmpresasInstance) {
        graficoEmpresasInstance.destroy();
    }

    const labels = Object.keys(data).slice(0, 10);
    const valores = Object.values(data).slice(0, 10);

    const gradientColors = [
        { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' },
        { bg: 'rgba(139, 92, 246, 0.8)', border: 'rgba(139, 92, 246, 1)' },
        { bg: 'rgba(16, 185, 129, 0.8)', border: 'rgba(16, 185, 129, 1)' },
        { bg: 'rgba(245, 158, 11, 0.8)', border: 'rgba(245, 158, 11, 1)' },
        { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },
        { bg: 'rgba(6, 182, 212, 0.8)', border: 'rgba(6, 182, 212, 1)' },
        { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgba(236, 72, 153, 1)' },
        { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgba(34, 197, 94, 1)' },
        { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgba(168, 85, 247, 1)' },
        { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgba(251, 146, 60, 1)' }
    ];

    const backgroundColors = valores.map((_, i) => gradientColors[i % gradientColors.length].bg);
    const borderColors = valores.map((_, i) => gradientColors[i % gradientColors.length].border);

    const maxValor = Math.max(...valores);

    graficoEmpresasInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade de Empresas',
                data: valores,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#9ca3af',
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            const valor = context.raw;
                            const percentual = maxValor > 0 ? ((valor / maxValor) * 100).toFixed(0) : 0;
                            return `${valor} empresa${valor !== 1 ? 's' : ''} (${percentual}% do líder)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 12 },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'Quantidade de Empresas',
                        color: '#6b7280',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                y: {
                    ticks: {
                        color: '#e5e7eb',
                        font: { size: 13, weight: '500' },
                        padding: 10
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: {
                    right: 20
                }
            }
        }
    });
}

async function carregarEmpresasAtribuidas() {
    try {
        const response = await apiRequest(`/api/atribuicoes/consultor/${usuario.id}`);
        const atribuicoes = await response.json();

        const container = document.getElementById('empresasAtribuidas');

        if (atribuicoes.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-8 col-span-full">Nenhuma empresa atribuída no momento</p>';
            return;
        }

        let html = '';
        atribuicoes.forEach(atrib => {
            const empresa = atrib.empresa;
            html += `
                <div class="bg-dark-card p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition cursor-pointer" onclick="window.location.href='/empresa/${empresa.id}'">
                    <h4 class="text-white font-semibold mb-2">${empresa.empresa}</h4>
                    <p class="text-gray-400 text-sm mb-1"><span class="text-gray-500">CNPJ:</span> ${empresa.cnpj || 'N/A'}</p>
                    <p class="text-gray-400 text-sm mb-1"><span class="text-gray-500">Município:</span> ${empresa.municipio || 'N/A'}</p>
                    <p class="text-gray-400 text-sm"><span class="text-gray-500">Estado:</span> ${empresa.estado || 'N/A'}</p>
                    <div class="mt-3 pt-3 border-t border-gray-700">
                        <button onclick="event.stopPropagation(); criarProspeccaoRapida(${empresa.id})" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition">
                            Nova Prospecção
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar empresas atribuídas:', error);
        document.getElementById('empresasAtribuidas').innerHTML = '<p class="text-red-400 text-center py-8 col-span-full">Erro ao carregar empresas atribuídas</p>';
    }
}

function criarProspeccaoRapida(empresaId) {
    window.location.href = `/prospeccao?empresa_id=${empresaId}`;
}

function mostrarAlertasRecentes(alertas) {
    const container = document.getElementById('alertasRecentes');

    if (!alertas || (alertas.vencidos.length === 0 && alertas.hoje.length === 0 && alertas.futuros.length === 0)) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhum alerta no momento</p>';
        return;
    }

    let html = '';

    alertas.vencidos.forEach(alerta => {
        html += `
            <div class="bg-red-900/30 border-l-4 border-red-500 p-4 rounded cursor-pointer hover:bg-red-900/40 transition" onclick="window.location.href='/empresas'">
                <div class="flex items-center justify-between">
                    <p class="text-red-300 font-semibold">⚠️ Agendamento Vencido</p>
                    <span class="text-xs text-red-400">${new Date(alerta.data_agendada).toLocaleDateString('pt-BR')}</span>
                </div>
                <p class="text-gray-300 text-sm mt-1">${alerta.observacoes || 'Sem observações'}</p>
            </div>
        `;
    });

    alertas.hoje.forEach(alerta => {
        html += `
            <div class="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded cursor-pointer hover:bg-yellow-900/40 transition" onclick="window.location.href='/empresas'">
                <div class="flex items-center justify-between">
                    <p class="text-yellow-300 font-semibold">📅 Agendamento Hoje</p>
                    <span class="text-xs text-yellow-400">${new Date(alerta.data_agendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p class="text-gray-300 text-sm mt-1">${alerta.observacoes || 'Sem observações'}</p>
            </div>
        `;
    });

    alertas.futuros.slice(0, 3).forEach(alerta => {
        html += `
            <div class="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded cursor-pointer hover:bg-blue-900/40 transition" onclick="window.location.href='/empresas'">
                <div class="flex items-center justify-between">
                    <p class="text-blue-300 font-semibold">📌 Próximo Agendamento</p>
                    <span class="text-xs text-blue-400">${new Date(alerta.data_agendada).toLocaleDateString('pt-BR')}</span>
                </div>
                <p class="text-gray-300 text-sm mt-1">${alerta.observacoes || 'Sem observações'}</p>
            </div>
        `;
    });

    container.innerHTML = html || '<p class="text-gray-400 text-center py-4">Nenhum alerta no momento</p>';
}


// Helper functions (copied/adapted from cronograma.js/utils)
function getIniciais(nome) {
    if (!nome) return '??';
    const partes = nome.split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function getConsultorCor(id) {
    const cores = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#d946ef'
    ];
    return cores[(id || 0) % cores.length];
}

async function carregarMetricasCronograma() {
    try {
        // Carregar Evolução
        const evolucaoRes = await apiRequest('/api/cronograma/evolution');
        if (evolucaoRes.ok) {
            const evolucaoData = await evolucaoRes.json();
            renderizarEvolucao(evolucaoData);
        }

        // Carregar Indicadores
        const metricsRes = await apiRequest('/api/cronograma/metrics');
        if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            renderizarIndicadores(metricsData);
        }
    } catch (error) {
        console.error('Erro ao carregar métricas do cronograma:', error);
        document.getElementById('metricasEvolucao').innerHTML = '<p class="text-red-400 text-center col-span-full">Erro ao carregar evolução</p>';
    }
}

function renderizarEvolucao(lista) {
    const container = document.getElementById('metricasEvolucao');
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-8 text-center bg-dark-card/30 rounded-xl border border-dashed border-dark-border">
                <div class="w-12 h-12 rounded-full bg-dark-card/50 flex items-center justify-center mb-3">
                    <i class="fas fa-chart-line text-xl text-gray-600"></i>
                </div>
                <p class="text-gray-500 text-sm">Nenhum programa ativo</p>
            </div>
        `;
        return;
    }

    container.innerHTML = lista.map(item => {
        const porcentagem = Math.round((item.realizado / item.total) * 100);
        const consultorCor = getConsultorCor(item.consultorId);
        const proximaFormatada = item.proxima_data ? new Date(item.proxima_data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null;

        let statusCor = 'blue';
        let statusTexto = 'Em andamento';
        let statusIcon = 'fa-clock';

        if (porcentagem === 100) {
            statusCor = 'green';
            statusTexto = 'Concluído';
            statusIcon = 'fa-check-circle';
        } else if (porcentagem === 0) {
            statusCor = 'yellow';
            statusTexto = 'Não iniciado';
            statusIcon = 'fa-hourglass-start';
        } else if (porcentagem >= 75) {
            statusCor = 'emerald';
            statusTexto = 'Finalizando';
            statusIcon = 'fa-flag-checkered';
        }

        return `
            <div class="p-4 rounded-xl bg-dark-card/40 border border-dark-border/50 space-y-3 hover:border-${statusCor}-500/30 transition-all hover:bg-dark-card/60 group">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">${item.sigla || 'N/A'}</span>
                            <span class="px-2 py-0.5 rounded-md bg-${statusCor}-500/10 text-${statusCor}-400 text-[10px] font-medium flex items-center gap-1 border border-${statusCor}-500/20">
                                <i class="fas ${statusIcon} text-[8px]"></i>
                                ${statusTexto}
                            </span>
                        </div>
                        <h4 class="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors" title="${item.empresa}">${item.empresa}</h4>
                        <p class="text-xs text-gray-500 truncate flex items-center gap-1 mt-1 group-hover:text-gray-400">
                            <i class="fas fa-book-open text-[10px] opacity-70"></i>
                            ${item.programa}
                        </p>
                    </div>
                    <div class="text-right pl-2">
                        <span class="text-xl font-bold text-${statusCor}-400">${porcentagem}%</span>
                    </div>
                </div>
                
                <div class="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-white/5">
                    <div class="h-full bg-gradient-to-r from-${statusCor}-600 to-${statusCor}-400 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(var(--color-${statusCor}-500),0.3)]" style="width: ${porcentagem}%"></div>
                </div>
                
                <div class="flex justify-between items-center text-[11px] pt-1 border-t border-white/5">
                    <div class="flex items-center gap-2" title="Consultor: ${item.consultor}">
                        <div class="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shadow-sm" style="background-color: ${consultorCor}">${getIniciais(item.consultor)}</div>
                        <span class="text-gray-500 group-hover:text-gray-400 text-[10px]">${item.realizado}/${item.total} sessões</span>
                    </div>
                    ${proximaFormatada ? `
                        <span class="text-gray-500 group-hover:text-gray-400 flex items-center gap-1.5 bg-dark-bg/50 px-2 py-1 rounded text-[10px]">
                            <i class="fas fa-calendar text-[9px] text-blue-400"></i>
                            ${proximaFormatada}
                        </span>
                    ` : porcentagem === 100 ? `
                        <span class="text-green-500/80 flex items-center gap-1">
                            <i class="fas fa-check-double text-[10px]"></i>
                            Finalizado
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderizarIndicadores(data) {
    const containerProg = document.getElementById('metricasPrograma');
    const containerCons = document.getElementById('metricasConsultor');

    if (containerProg) {
        containerProg.innerHTML = data.programas.map(p => `
            <div class="p-3 bg-dark-card/30 rounded-xl border border-dark-border/30 hover:bg-dark-card/50 transition-colors">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-gray-200">${p.nome}</span>
                    <span class="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">${p.total_atendimentos} reg.</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    <span class="flex items-center gap-1.5"><i class="fas fa-calendar-day text-gray-600"></i> ${p.dias_atendidos} dias</span>
                    <span class="flex items-center gap-1.5"><i class="fas fa-building text-gray-600"></i> ${p.empresas_atendidas} empresas</span>
                </div>
            </div>
        `).join('') || '<p class="text-gray-500 italic text-center py-4">Sem dados disponíveis</p>';
    }

    if (containerCons) {
        containerCons.innerHTML = data.consultores.map(c => `
            <div class="p-3 bg-dark-card/30 rounded-xl border border-dark-border/30 hover:bg-dark-card/50 transition-colors">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-gray-200">${c.nome}</span>
                    <span class="px-2 py-0.5 rounded text-xs bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">${c.total_atendimentos} reg.</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    <span class="flex items-center gap-1.5"><i class="fas fa-calendar-day text-gray-600"></i> ${c.dias_atendidos} dias</span>
                    <span class="flex items-center gap-1.5"><i class="fas fa-building text-gray-600"></i> ${c.empresas_atendidas} empresas</span>
                </div>
            </div>
        `).join('') || '<p class="text-gray-500 italic text-center py-4">Sem dados disponíveis</p>';
    }
}

carregarDashboard();
carregarMetricasCronograma();
