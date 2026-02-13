let programas = [];

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

async function abrirModalProgramas() {
    const modal = document.getElementById('modalProgramas');
    if (modal) {
        modal.classList.remove('hidden');
        await carregarProgramas();
    }
}

function fecharModalProgramas() {
    const modal = document.getElementById('modalProgramas');
    if (modal) modal.classList.add('hidden');
}

async function carregarProgramas() {
    try {
        const response = await apiRequest('/api/programs/');
        if (!response.ok) throw new Error('Falha ao carregar programas');
        programas = await response.json();
        renderizarProgramas();
    } catch (error) {
        console.error('Erro ao carregar programas:', error);
    }
}

function renderizarProgramas() {
    const container = document.getElementById('listaProgramas');
    if (!container) return;

    if (programas.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nenhum programa cadastrado.</p>';
        return;
    }

    container.innerHTML = programas.map(p => `
        <div class="p-4 rounded-xl bg-dark-card/50 border border-dark-border/30 hover:border-blue-500/50 transition-all group relative">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h5 class="text-white font-medium">${p.nome}</h5>
                    <p class="text-gray-400 text-xs mt-1">${p.descricao || 'Sem descrição'}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                            ${p.carga_horaria} Horas
                        </span>
                    </div>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="prepararEdicaoPrograma(${p.id})" class="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition" title="Editar">
                        <i class="fas fa-edit text-[10px]"></i>
                    </button>
                    <button onclick="deletarPrograma(${p.id})" class="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition" title="Excluir">
                        <i class="fas fa-trash text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

window.prepararEdicaoPrograma = function (id) {
    const prog = programas.find(p => p.id === id);
    if (!prog) return;

    document.getElementById('progNome').value = prog.nome;
    document.getElementById('progCarga').value = prog.carga_horaria;
    document.getElementById('progDesc').value = prog.descricao || '';

    let idInput = document.getElementById('editProgramId');
    if (!idInput) {
        idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'editProgramId';
        document.getElementById('formPrograma').appendChild(idInput);
    }
    idInput.value = id;

    const btnSubmit = document.querySelector('#formPrograma button[type="submit"]');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';

    // Rolar para o topo do formulário
    document.getElementById('formPrograma').scrollIntoView({ behavior: 'smooth' });
}

window.deletarPrograma = async function (id) {
    if (!confirm('Deseja realmente excluir este programa? Os eventos agendados não serão removidos.')) return;
    try {
        const response = await apiRequest(`/api/programs/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Programa removido', 'success');
            await carregarProgramas();
            if (typeof renderizarTabelaMetricas === 'function') renderizarTabelaMetricas();
        }
    } catch (error) {
        console.error(error);
        showToast('Erro ao remover', 'error');
    }
}

const formProg = document.getElementById('formPrograma');
if (formProg) {
    formProg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('editProgramId')?.value;
        const data = {
            nome: document.getElementById('progNome').value,
            carga_horaria: parseFloat(document.getElementById('progCarga').value),
            descricao: document.getElementById('progDesc').value
        };

        try {
            const url = editId ? `/api/programs/${editId}` : '/api/programs/';
            const method = editId ? 'PUT' : 'POST';

            const response = await apiRequest(url, {
                method: method,
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast(editId ? 'Programa atualizado com sucesso!' : 'Programa cadastrado com sucesso!', 'success');
                formProg.reset();
                if (document.getElementById('editProgramId')) document.getElementById('editProgramId').value = '';

                // Resetar título do modal se estivermos na agenda
                const modalTitle = document.querySelector('#modalProgramas h3');
                if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-list-check text-blue-400"></i> Gestão de Programas';

                await carregarProgramas();

                // Recarregar tabela de métricas se estiver na agenda operacional
                if (typeof renderizarTabelaMetricas === 'function') {
                    renderizarTabelaMetricas();
                }
            }
        } catch (error) {
            console.error('Erro ao salvar programa:', error);
            showToast('Erro ao salvar programa', 'error');
        }
    });
}
