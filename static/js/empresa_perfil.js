const empresaId = window.location.pathname.split('/').pop();

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosEmpresa();
    carregarContatos();
    carregarHistorico();
    carregarAgendamentos();
    carregarProgramas();
});

// ... (existing functions)

async function carregarProgramas() {
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}/programas`);
        const programas = await response.json();

        const container = document.getElementById('programasEmpresa');
        if (!programas || programas.length === 0) {
            container.innerHTML = '<p class="text-gray-500 italic col-span-full">Nenhum programa vinculado</p>';
            return;
        }

        container.innerHTML = programas.map(p => {
            const cor = p.status === 'Concluído' ? 'green' : 'blue';
            return `
                <div class="bg-dark-card/50 rounded-xl p-4 border border-dark-border/30">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="text-white font-bold">${p.nome}</h4>
                            <span class="text-xs px-2 py-0.5 rounded bg-${cor}-500/20 text-${cor}-400 mt-1 inline-block">
                                ${p.status}
                            </span>
                        </div>
                        <span class="text-xl font-bold text-${cor}-400">${p.progresso}%</span>
                    </div>
                    
                    <div class="w-full h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border/30 mb-3">
                        <div class="h-full bg-${cor}-500 transition-all duration-1000" style="width: ${p.progresso}%"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs text-gray-400">
                        <div>
                            <span class="block text-[10px] uppercase opacity-70">Realizado</span>
                            <span class="text-gray-200">${p.sessoes_realizadas}/${p.total_sessoes} sessões</span>
                        </div>
                        <div class="text-right">
                             ${p.proxima_sessao ? `
                                <span class="block text-[10px] uppercase opacity-70">Próxima</span>
                                <span class="text-gray-200">${new Date(p.proxima_sessao).toLocaleDateString()}</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar programas:', error);
    }
}

async function deletarContato(id) {
    if (confirm("Deseja remover este contato?")) {
        await fetch(`/api/contatos/${id}`, { method: 'DELETE' });
        carregarContatos();
    }
}

async function carregarDadosEmpresa() {
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}`);
        const empresa = await response.json();

        document.getElementById('empresaNome').textContent = empresa.empresa;

        const detalhes = document.getElementById('empresaDetalhes');
        detalhes.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="text-gray-500 block text-xs uppercase">CNPJ</span>
                    <span class="text-white">${empresa.cnpj || 'Não informado'}</span>
                </div>
                <div>
                    <span class="text-gray-500 block text-xs uppercase">Porte</span>
                    <span class="text-white">${empresa.porte || 'Não informado'}</span>
                </div>
                <div>
                    <span class="text-gray-500 block text-xs uppercase">Município/UF</span>
                    <span class="text-white">${empresa.municipio || '-'}/${empresa.estado || '-'}</span>
                </div>
                <div>
                    <span class="text-gray-500 block text-xs uppercase">Responsável</span>
                    <span class="text-white">${empresa.responsavel || '-'}</span>
                </div>
                <div>
                    <span class="text-gray-500 block text-xs uppercase">Telefone</span>
                    <span class="text-white">${empresa.telefone_contato || '-'}</span>
                </div>
                <div>
                    <span class="text-gray-500 block text-xs uppercase">E-mail</span>
                    <span class="text-white">${empresa.email_contato || '-'}</span>
                </div>
            </div>
            <div class="mt-4">
                <span class="text-gray-500 block text-xs uppercase">Observações</span>
                <p class="text-white text-sm mt-1">${empresa.observacao || 'Sem observações'}</p>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
    }
}

async function carregarContatos() {
    try {
        const response = await apiRequest(`/api/contatos/empresa/${empresaId}`);
        const contatos = await response.json();

        const lista = document.getElementById('listaContatos');
        if (contatos.length === 0) {
            lista.innerHTML = '<p class="text-gray-500 italic">Nenhum contato cadastrado</p>';
            return;
        }

        lista.innerHTML = contatos.map(c => `
            <div class="flex items-center justify-between p-3 rounded-xl bg-dark-card border border-dark-border/30">
                <div>
                    <h4 class="text-white font-medium">${c.nome}</h4>
                    <p class="text-xs text-gray-400">${c.cargo || 'Cargo não informado'}</p>
                    <div class="flex gap-3 mt-1">
                        <span class="text-xs text-blue-400"><i class="fas fa-envelope mr-1"></i>${c.email || '-'}</span>
                        <span class="text-xs text-green-400"><i class="fas fa-phone mr-1"></i>${c.celular || '-'}</span>
                    </div>
                </div>
                <button onclick="deletarContato(${c.id})" class="text-gray-500 hover:text-red-400 transition">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
    }
}

async function carregarHistorico() {
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}/historico`);
        const historico = await response.json();

        const containers = document.getElementById('linhaDoTempo');
        if (!historico || historico.length === 0) {
            containers.innerHTML = '<p class="text-gray-500 italic">Nenhum registro no histórico</p>';
            return;
        }

        containers.innerHTML = historico.map(h => `
            <div class="relative pl-8 border-l-2 border-dark-border/50 pb-4 last:pb-0">
                <div class="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-dark-bg"></div>
                <div class="bg-dark-card/50 rounded-xl p-3 border border-dark-border/30">
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-semibold text-blue-400 uppercase">${h.tipo_acao}</span>
                        <span class="text-[10px] text-gray-500">${new Date(h.data).toLocaleString()}</span>
                    </div>
                    <p class="text-sm text-gray-200 mt-1">${h.detalhes}</p>
                    <p class="text-[10px] text-gray-500 mt-2">Realizado por: ${h.usuario_nome}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

async function carregarAgendamentos() {
    try {
        const response = await apiRequest(`/api/agendamentos/?empresa_id=${empresaId}`);
        const agendamentos = await response.json();

        const container = document.getElementById('agendamentosEmpresa');
        if (agendamentos.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">Nenhum agendamento encontrado.</p>';
            return;
        }

        container.innerHTML = agendamentos.map(a => `
            <div class="flex items-center justify-between p-3 rounded-xl ${a.status === 'reagendado' ? 'bg-red-500/10 border-red-500/30' : 'bg-dark-card border-dark-border/30'} border">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-white">${new Date(a.data_agendada).toLocaleDateString()}</span>
                        <span class="badge ${a.status === 'reagendado' ? 'badge-red' : 'badge-blue'}">${a.status}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">${a.observacoes || 'Sem observações'}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

function abrirModalContato() {
    const nome = prompt("Nome do contato:");
    if (!nome) return;
    const email = prompt("Email:");
    const celular = prompt("Celular:");
    const cargo = prompt("Cargo:");

    apiRequest('/api/contatos/', {
        method: 'POST',
        body: JSON.stringify({
            empresa_id: parseInt(empresaId),
            nome, email, celular, cargo
        })
    }).then(() => carregarContatos());
}

async function deletarContato(id) {
    if (confirm("Deseja remover este contato?")) {
        await apiRequest(`/api/contatos/${id}`, { method: 'DELETE' });
        carregarContatos();
    }
}
