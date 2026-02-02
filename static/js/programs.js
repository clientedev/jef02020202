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
        <div class="p-4 rounded-xl bg-dark-card/50 border border-dark-border/30 hover:border-blue-500/50 transition-all group">
            <div class="flex justify-between items-start">
                <div>
                    <h5 class="text-white font-medium">${p.nome}</h5>
                    <p class="text-gray-400 text-xs mt-1">${p.descricao || 'Sem descrição'}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                            ${p.carga_horaria} Horas
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

const formProg = document.getElementById('formPrograma');
if (formProg) {
    formProg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nome: document.getElementById('progNome').value,
            carga_horaria: parseFloat(document.getElementById('progCarga').value),
            descricao: document.getElementById('progDesc').value
        };
        
        try {
            const response = await apiRequest('/api/programs/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                showToast('Programa cadastrado com sucesso!', 'success');
                formProg.reset();
                await carregarProgramas();
            }
        } catch (error) {
            console.error('Erro ao salvar programa:', error);
            showToast('Erro ao salvar programa', 'error');
        }
    });
}
