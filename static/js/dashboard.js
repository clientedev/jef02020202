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
                        label: function(context) {
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
                    <span class="text-xs text-yellow-400">${new Date(alerta.data_agendada).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
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

carregarDashboard();
