document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('dataProducao');
    if (inputData) {
        inputData.valueAsDate = new Date();
        inputData.addEventListener('change', carregarProducaoDiaria);
    }

    carregarProducaoDiaria();
});

async function carregarProducaoDiaria() {
    const container = document.getElementById('tabelaProducaoDiaria');
    if (!container) return;

    const dataInput = document.getElementById('dataProducao');
    const data = dataInput ? dataInput.value : new Date().toISOString().split('T')[0];

    try {
        const response = await apiRequest(`/api/producao-diaria/?data=${data}`);
        const lista = await response.json();

        if (lista.length === 0) {
            container.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-gray-500 italic">Nenhum consultor encontrado.</td></tr>';
            return;
        }

        container.innerHTML = lista.map(item => {
            const statusClass = item.tem_evento
                ? (item.lancado_sgset ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30')
                : 'bg-gray-500/10 text-gray-500 border-gray-500/20';

            const statusLabel = item.tem_evento
                ? (item.lancado_sgset ? 'LANÇADO' : 'PENDENTE SGSET')
                : 'SEM AGENDA';

            return `
            <tr class="hover:bg-amber-500/5 transition-colors group border-b border-dark-border/10">
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm border border-amber-500/20 group-hover:scale-110 transition-transform">
                            ${item.consultor_nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span class="text-sm text-white font-bold group-hover:text-amber-500 transition-colors">${item.consultor_nome}</span>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <span class="text-sm ${item.tem_evento ? 'text-gray-200' : 'text-gray-500 italic'} font-medium">
                        ${item.local}
                    </span>
                </td>
                <td class="px-6 py-5 text-center">
                    <div class="inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black tracking-widest ${statusClass}">
                        ${statusLabel}
                    </div>
                </td>
                <td class="px-8 py-5 text-right">
                    ${item.tem_evento ? `
                        <button onclick="toggleSGSET(${item.evento_id})" 
                            class="px-4 py-2 rounded-xl ${item.lancado_sgset ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white'} transition text-xs font-bold border border-transparent shadow-lg active:scale-95">
                            <i class="fas ${item.lancado_sgset ? 'fa-undo' : 'fa-check'} mr-2"></i>
                            ${item.lancado_sgset ? 'Reverter Status' : 'Marcar Lançado'}
                        </button>
                    ` : '<span class="text-[10px] text-gray-600 font-bold uppercase">Nenhuma Ação</span>'}
                </td>
            </tr>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-red-400">Erro ao carregar dados de produção.</td></tr>';
    }
}

async function toggleSGSET(eventoId) {
    try {
        const response = await apiRequest(`/api/producao-diaria/toggle-sgset/${eventoId}`, { method: 'PUT' });
        if (response.ok) {
            carregarProducaoDiaria();
            if (typeof showToast !== 'undefined') showToast("Status SGSET atualizado", "success");
        }
    } catch (e) {
        if (typeof showToast !== 'undefined') showToast("Erro ao atualizar status SGSET", "error");
    }
}
