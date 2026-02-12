checkAuth();
atualizarSidebar();

async function carregarAlertas() {
    try {
        const response = await apiRequest('/api/agendamentos/alertas');
        const alertas = await response.json();

        mostrarAlertas('alertasVencidos', alertas.vencidos, 'text-red-400');
        mostrarAlertas('alertasHoje', alertas.hoje, 'text-yellow-400');
        mostrarAlertas('alertasFuturos', alertas.futuros, 'text-green-400');
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
    }
}

function mostrarAlertas(elementId, alertas, colorClass) {
    const container = document.getElementById(elementId);

    if (alertas.length === 0) {
        container.innerHTML = '<p class="text-gray-400">Nenhum alerta pendente</p>';
        return;
    }

    container.innerHTML = alertas.map(alerta => {
        let icon = 'fa-bell';
        if (alerta.tipo === 'ligacao') icon = 'fa-phone';
        else if (alerta.tipo === 'etapa') icon = 'fa-rocket';
        else if (alerta.tipo === 'cronograma') icon = 'fa-calendar-alt';

        const dataFormatada = new Date(alerta.data).toLocaleDateString('pt-BR');

        return `
            <div class="bg-dark-card p-4 rounded-xl border border-dark-border/30 hover:border-blue-500/50 cursor-pointer transition group" 
                onclick="window.location.href='/empresa/${alerta.empresa_id || '#'}'">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <i class="fas ${icon} ${colorClass} text-xs"></i>
                            <p class="font-bold text-white group-hover:text-blue-400 transition">${alerta.titulo}</p>
                        </div>
                        <p class="text-gray-300 text-sm">${alerta.descricao}</p>
                        <p class="text-gray-500 text-[10px] mt-2 font-mono uppercase tracking-wider">Data: ${dataFormatada}</p>
                    </div>
                    ${alerta.tipo === 'ligacao' ? `
                        <button onclick="event.stopPropagation(); marcarComoRealizado('${alerta.id.replace('agend_', '')}')" 
                            class="text-green-400 hover:text-green-300 text-sm ml-4 flex-shrink-0 bg-green-500/10 px-2 py-1 rounded">
                            ✓ OK
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function marcarComoRealizado(agendamentoId) {
    if (!confirm('Marcar este agendamento como realizado?')) return;

    try {
        const response = await apiRequest(`/api/agendamentos/${agendamentoId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'realizado' })
        });

        if (response.ok) {
            alert('Agendamento marcado como realizado!');
            carregarAlertas();
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao atualizar agendamento');
        }
    } catch (error) {
        alert('Erro de conexão com o servidor');
    }
}

carregarAlertas();
setInterval(carregarAlertas, 60000);
