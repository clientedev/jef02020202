checkAuth();
atualizarSidebar();

const empresaId = window.location.pathname.split('/').pop();

async function carregarEmpresaPerfil() {
    try {
        const [empresaRes, prospeccoesRes] = await Promise.all([
            apiRequest(`/api/empresas/${empresaId}`),
            apiRequest(`/api/prospeccoes/?empresa_id=${empresaId}`)
        ]);
        
        const empresa = await empresaRes.json();
        const prospeccoes = await prospeccoesRes.json();
        
        document.getElementById('empresaNome').textContent = empresa.empresa;
        
        document.getElementById('empresaDetalhes').innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div><span class="text-gray-400">CNPJ:</span> <span class="text-white">${empresa.cnpj || '-'}</span></div>
                <div><span class="text-gray-400">Sigla:</span> <span class="text-white">${empresa.sigla || '-'}</span></div>
                <div><span class="text-gray-400">Porte:</span> <span class="text-white">${empresa.porte || '-'}</span></div>
                <div><span class="text-gray-400">ER:</span> <span class="text-white">${empresa.er || '-'}</span></div>
                <div><span class="text-gray-400">Carteira:</span> <span class="text-white">${empresa.carteira || '-'}</span></div>
                <div><span class="text-gray-400">Município:</span> <span class="text-white">${empresa.municipio || '-'}</span></div>
                <div><span class="text-gray-400">Estado:</span> <span class="text-white">${empresa.estado || '-'}</span></div>
                <div><span class="text-gray-400">Funcionários:</span> <span class="text-white">${empresa.numero_funcionarios || '-'}</span></div>
                <div class="col-span-2"><span class="text-gray-400">Endereço:</span> <span class="text-white">${empresa.endereco || '-'}</span></div>
                ${empresa.observacao ? `<div class="col-span-2"><span class="text-gray-400">Observação:</span> <p class="text-white mt-2">${empresa.observacao}</p></div>` : ''}
            </div>
            
            <div class="mt-6 pt-4 border-t border-dark-border/50">
                <h4 class="text-base font-semibold text-white mb-3 flex items-center gap-2">
                    <i class="fas fa-user-tie text-emerald-400"></i>
                    Dados do Contato
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    <div><span class="text-gray-400">Nome:</span> <span class="text-white">${empresa.nome_contato || '-'}</span></div>
                    <div><span class="text-gray-400">Cargo:</span> <span class="text-white">${empresa.cargo_contato || '-'}</span></div>
                    <div><span class="text-gray-400">Telefone:</span> <span class="text-white">${empresa.telefone_contato || '-'}</span></div>
                    <div><span class="text-gray-400">E-mail:</span> <span class="text-white">${empresa.email_contato || '-'}</span></div>
                </div>
            </div>
        `;
        
        if (prospeccoes.length === 0) {
            document.getElementById('historicoProspeccoes').innerHTML = '<p class="text-gray-400">Nenhuma prospecção registrada</p>';
        } else {
            document.getElementById('historicoProspeccoes').innerHTML = prospeccoes.map(p => `
                <div class="bg-dark-card p-4 rounded">
                    <p class="text-white font-semibold">${p.resultado || 'Sem resultado'}</p>
                    <p class="text-gray-400 text-sm mt-1">${p.data_ligacao ? new Date(p.data_ligacao).toLocaleDateString('pt-BR') : 'Sem data'}</p>
                    <p class="text-gray-300 text-sm mt-2">${p.observacoes || 'Sem observações'}</p>
                </div>
            `).join('');
        }
        
        carregarAgendamentos();
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
    }
}

async function carregarAgendamentos() {
    try {
        const response = await apiRequest(`/api/agendamentos/?empresa_id=${empresaId}`);
        const agendamentos = await response.json();
        
        if (agendamentos.length === 0) {
            document.getElementById('agendamentosEmpresa').innerHTML = '<p class="text-gray-400">Nenhum agendamento</p>';
        } else {
            document.getElementById('agendamentosEmpresa').innerHTML = agendamentos.map(a => {
                const status = a.status === 'vencido' ? 'text-red-400' : a.status === 'pendente' ? 'text-yellow-400' : 'text-green-400';
                return `
                    <div class="bg-dark-card p-4 rounded">
                        <p class="font-semibold ${status}">${a.status.toUpperCase()}</p>
                        <p class="text-gray-300 text-sm mt-1">${new Date(a.data_agendada).toLocaleString('pt-BR')}</p>
                        <p class="text-gray-400 text-sm">${a.observacoes || 'Sem observações'}</p>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

carregarEmpresaPerfil();
