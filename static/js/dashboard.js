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

    if (!alertas || alertas.hoje.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhum alerta agendado para hoje</p>';
        return;
    }

    let html = '';

    // Cores e ícones por tipo
    const configTipo = {
        'ligacao': { icon: 'fa-phone', color: 'blue' },
        'etapa': { icon: 'fa-rocket', color: 'purple' },
        'cronograma': { icon: 'fa-calendar-alt', color: 'emerald' }
    };

    alertas.hoje.forEach(alerta => {
        const config = configTipo[alerta.tipo] || { icon: 'fa-bell', color: 'gray' };
        html += `
            <div class="bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded cursor-pointer hover:bg-amber-900/30 transition mb-3" onclick="window.location.href='/alertas'">
                <div class="flex items-center justify-between">
                    <p class="text-amber-300 font-semibold flex items-center gap-2">
                        <i class="fas ${config.icon}"></i>
                        ${alerta.titulo}
                    </p>
                    <span class="text-xs text-amber-400 font-bold">Hoje</span>
                </div>
                <p class="text-gray-300 text-sm mt-1">${alerta.descricao}</p>
            </div>
        `;
    });

    container.innerHTML = html;
}

function formatarDataAlerta(dataStr) {
    try {
        const data = new Date(dataStr);
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataStr;
    }
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
        const metricsRes = await apiRequest('/api/cronograma/metrics');
        if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            renderizarGestaoGlobal(metricsData.programas);
            renderizarIndicadores(metricsData);
        }
    } catch (error) {
        console.error('Erro ao carregar métricas do cronograma:', error);
        const container = document.getElementById('gestaoGlobalTableBody');
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-red-400 text-center py-4">Erro ao carregar métricas</td></tr>';
    }
}

function renderizarGestaoGlobal(programas) {
    const container = document.getElementById('gestaoGlobalTableBody');
    if (!container) return;

    if (programas.length === 0) {
        container.innerHTML = '<tr><td colspan="8" class="px-6 py-10 text-center text-gray-500 italic">Nenhum programa ativo</td></tr>';
        return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    container.innerHTML = programas.map(p => {
        const percAgendado = p.meta_total > 0 ? Math.round((p.total_horas / p.meta_total) * 100) : 0;
        const saldoAgendar = p.meta_total - p.total_horas;

        let diasExecucao = "-";
        let dataInicioFormatada = "Não iniciado";

        if (p.data_inicio) {
            const dataInicio = new Date(p.data_inicio + 'T12:00:00');
            dataInicio.setHours(0, 0, 0, 0);
            dataInicioFormatada = dataInicio.toLocaleDateString('pt-BR');

            const diffTime = hoje - dataInicio;
            diasExecucao = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diasExecucao < 0) diasExecucao = 0; // Se começar no futuro
            diasExecucao = `${diasExecucao} dias`;
        }

        return `
            <tr class="hover:bg-dark-hover/50 transition duration-150">
                <td class="px-6 py-4 text-white font-medium">${p.consultor}</td>
                <td class="px-6 py-4 text-gray-300">${p.empresa}</td>
                <td class="px-6 py-4 text-center text-gray-400">${dataInicioFormatada}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                        ${diasExecucao}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <div class="font-medium text-white">${p.nome}</div>
                    <div class="w-24 h-1 bg-dark-border/30 rounded-full mt-1">
                        <div class="h-full bg-blue-500 rounded-full" style="width: ${Math.min(percAgendado, 100)}%"></div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center font-bold text-white">${p.meta_total}h</td>
                <td class="px-6 py-4 text-center text-blue-300">${p.total_horas}h</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-2 py-1 rounded ${saldoAgendar <= 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'} font-bold">
                        ${saldoAgendar}h
                    </span>
                </td>
            </tr>
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
