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
        // Garantir que os dados sejam carregados ao abrir
        await carregarProgramas();
    } else {
        console.error('Modal modalProgramas não encontrado no DOM');
    }
}

async function carregarEmpresasParaProgramas() {
    try {
        const response = await apiRequest('/api/empresas/?page_size=100');
        if (!response.ok) {
            throw new Error('Falha ao carregar empresas');
        }
        const data = await response.json();
        const empresas = data.items || [];
        
        const select = document.getElementById('progEmpresa');
        if (select) {
            select.innerHTML = '<option value="">Selecione uma empresa...</option>' + 
                empresas.map(e => `<option value="${e.id}">${e.empresa}</option>`).join('');
            console.log('Select de empresas populado com', empresas.length, 'itens');
        } else {
            console.error('Elemento #progEmpresa não encontrado no DOM');
        }
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

function fecharModalProgramas() {
    const modal = document.getElementById('modalProgramas');
    if (modal) modal.classList.add('hidden');
}

async function carregarProgramas() {
    try {
        console.log('carregarProgramas chamado');
        const response = await apiRequest('/api/programs/');
        if (!response.ok) {
            throw new Error('Falha ao carregar programas');
        }
        programas = await response.json();
        renderizarProgramas();
        
        // Carregar empresas para o select de criação de programa se ele existir
        const select = document.getElementById('progEmpresa');
        if (select) {
            await carregarEmpresasParaProgramas();
        }
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
                document.getElementById('formPrograma').reset();
                await carregarProgramas();
            }
        } catch (error) {
            console.error('Erro ao salvar programa:', error);
            showToast('Erro ao salvar programa', 'error');
        }
    });
}

function abrirAgendamento(id, nome, carga) {
    document.getElementById('agendProgId').value = id;
    document.getElementById('agendProgNome').textContent = nome;
    document.getElementById('agendProgCarga').textContent = `Carga Horária: ${carga}h`;
    document.getElementById('modalAgendarPrograma').classList.remove('hidden');
}

function fecharModalAgendarPrograma() {
    const modal = document.getElementById('modalAgendarPrograma');
    if (modal) modal.classList.add('hidden');
}

const formAuto = document.getElementById('formAutoAgendamento');
if (formAuto) {
    formAuto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const diasCheckboxes = document.querySelectorAll('input[name="diasSemana"]:checked');
        if (diasCheckboxes.length === 0) {
            showToast('Selecione pelo menos um dia da semana', 'error');
            return;
        }
        
        const diasSemana = Array.from(diasCheckboxes).map(cb => parseInt(cb.value));
        
        const data = {
            program_id: parseInt(document.getElementById('agendProgId').value),
            consultor_id: parseInt(document.getElementById('agendConsultor').value),
            data_inicio: document.getElementById('agendDataInicio').value,
            dias_semana: diasSemana,
            horas_por_dia: parseFloat(document.getElementById('agendHorasDia').value)
        };
        
        try {
            const response = await apiRequest('/api/programs/auto-schedule', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const res = await response.json();
                showToast(res.message, 'success');
                fecharModalAgendarPrograma();
                fecharModalProgramas();
                if (typeof carregarEventos !== 'undefined') {
                    await carregarEventos();
                    if (typeof renderizarCalendario !== 'undefined') renderizarCalendario();
                    if (typeof renderizarCalendarioMobile !== 'undefined') renderizarCalendarioMobile();
                }
            } else {
                const error = await response.json();
                showToast(error.detail || 'Erro ao gerar cronograma', 'error');
            }
        } catch (error) {
            console.error('Erro no agendamento automático:', error);
            showToast('Erro de conexão com servidor', 'error');
        }
    });
}
