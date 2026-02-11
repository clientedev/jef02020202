
function renderizarTabelaMetricas() {
    const container = document.getElementById('metricsContainer');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let html = `
    <div class="glass-effect rounded-xl overflow-hidden border border-dark-border/30">
        <div class="bg-dark-card/50 px-6 py-4 border-b border-dark-border/30 flex justify-between items-center">
            <h3 class="text-white font-bold text-lg"><i class="fas fa-chart-bar mr-2 text-blue-400"></i>Métricas por Consultor</h3>
            <div class="text-xs text-gray-400">Total de horas no período selecionado</div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-dark-card/30 text-xs text-gray-400 uppercase border-b border-dark-border/30">
                        <th class="px-6 py-3 font-semibold">Consultor</th>
                        <th class="px-6 py-3 font-semibold text-center">Horas Programadas</th>
                        <th class="px-6 py-3 font-semibold text-center">Horas Realizadas</th>
                        <th class="px-6 py-3 font-semibold text-center">Saldo</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-border/10 text-sm">
    `;

    consultoresAgenda.forEach(consultor => {
        // Filtrar eventos deste consultor
        const eventosConsultor = eventosAgenda.filter(e => e.consultor_id === consultor.id);

        let horasProgramadas = 0;
        let horasRealizadas = 0;

        eventosConsultor.forEach(evento => {
            // Calcular horas do evento
            let horasEvento = 0;
            if (evento.periodo === 'D') horasEvento = 8;
            else if (evento.periodo === 'M' || evento.periodo === 'T') horasEvento = 4;

            // Programadas: Soma tudo
            horasProgramadas += horasEvento;

            // Realizadas: Soma se data <= hoje
            // Converter string data (YYYY-MM-DD) para Date
            const [ano, mes, dia] = evento.data.split('-').map(Number);
            const dataEvento = new Date(ano, mes - 1, dia); // Mês é 0-indexed

            if (dataEvento <= hoje) {
                horasRealizadas += horasEvento;
            }
        });

        const saldo = horasProgramadas - horasRealizadas;
        const corConsultor = getCorConsultor(consultor.id);

        html += `
            <tr class="hover:bg-dark-hover/50 transition duration-150">
                <td class="px-6 py-3 font-medium text-white flex items-center gap-3">
                     <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style="background-color: ${corConsultor}">
                        ${getIniciaisAgenda(consultor.nome)}
                    </div>
                    ${consultor.nome}
                </td>
                <td class="px-6 py-3 text-center text-blue-300 font-medium">${horasProgramadas}h</td>
                <td class="px-6 py-3 text-center text-green-400 font-medium">${horasRealizadas}h</td>
                <td class="px-6 py-3 text-center text-gray-400">${saldo}h</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    </div>
    `;

    container.innerHTML = html;
}
