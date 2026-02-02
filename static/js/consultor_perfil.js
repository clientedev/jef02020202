checkAuth();
atualizarSidebar();

let perfilAtual = null;
let empresasDisponiveis = [];
const usuarioLogado = getUsuario();

function configurarAcoesRapidas() {
    if (usuarioLogado && usuarioLogado.tipo === 'admin') {
        const btnAtribuirProspeccao = document.getElementById('btnAtribuirProspeccao');
        const btnAtribuirEmpresas = document.getElementById('btnAtribuirEmpresas');
        const btnDefinirAcoes = document.getElementById('btnDefinirAcoes');
        
        if (btnAtribuirProspeccao) btnAtribuirProspeccao.classList.remove('hidden');
        if (btnAtribuirEmpresas) btnAtribuirEmpresas.classList.remove('hidden');
        if (btnDefinirAcoes) btnDefinirAcoes.classList.remove('hidden');
    }
}

configurarAcoesRapidas();

async function carregarPerfilConsultor() {
    try {
        const response = await apiRequest(`/api/consultores/${consultorId}`);
        if (!response) {
            document.getElementById('perfilConsultor').innerHTML = 
                '<p class="text-red-400">Sessão expirada. Faça login novamente.</p>';
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na API:', response.status, errorText);
            document.getElementById('perfilConsultor').innerHTML = 
                `<p class="text-red-400">Erro ao carregar perfil (${response.status})</p>`;
            return;
        }
        
        const data = await response.json();
        
        perfilAtual = data.perfil;
        const estatisticas = data.estatisticas;
        const prospeccoes = data.prospeccoes;
        
        if (perfilAtual.foto_url) {
            document.getElementById('fotoConsultor').src = perfilAtual.foto_url;
        } else {
            document.getElementById('fotoConsultor').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(perfilAtual.nome)}&size=150&background=3b82f6&color=fff`;
        }
        
        const perfilDiv = document.getElementById('perfilConsultor');
        perfilDiv.innerHTML = `
            <div class="space-y-3">
                <div>
                    <p class="text-gray-400 text-sm">Nome</p>
                    <p class="text-white font-medium">${perfilAtual.nome}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Email</p>
                    <p class="text-white font-medium">${perfilAtual.email}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Telefone</p>
                    <p class="text-white font-medium">${perfilAtual.telefone || '-'}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Data de Nascimento</p>
                    <p class="text-white font-medium">${perfilAtual.data_nascimento ? new Date(perfilAtual.data_nascimento).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Modelo do Carro</p>
                    <p class="text-white font-medium">${perfilAtual.modelo_carro || '-'}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Placa do Carro</p>
                    <p class="text-white font-medium">${perfilAtual.placa_carro || '-'}</p>
                </div>
                <div>
                    <p class="text-gray-400 text-sm">Informações Básicas</p>
                    <p class="text-white font-medium">${perfilAtual.informacoes_basicas || '-'}</p>
                </div>
            </div>
        `;
        
        document.getElementById('totalProspeccoes').textContent = estatisticas.total_prospeccoes;
        document.getElementById('empresasAtribuidas').textContent = estatisticas.empresas_atribuidas || 0;
        
        const tbody = document.getElementById('tabelaProspeccoes');
        if (!prospeccoes || prospeccoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">Nenhuma prospecção realizada ainda</td></tr>';
            return;
        }
        
        tbody.innerHTML = prospeccoes.map(prosp => `
            <tr class="hover:bg-dark-hover">
                <td class="px-6 py-4 text-gray-300">${prosp.data_prospeccao ? new Date(prosp.data_prospeccao).toLocaleDateString('pt-BR') : (prosp.data_ligacao ? new Date(prosp.data_ligacao).toLocaleDateString('pt-BR') : '-')}</td>
                <td class="px-6 py-4 text-gray-300">Empresa ID: ${prosp.empresa_id}</td>
                <td class="px-6 py-4 text-gray-300">${prosp.status_prospeccao || '-'}</td>
                <td class="px-6 py-4 text-gray-300">${prosp.resultado || '-'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar perfil do consultor:', error);
        document.getElementById('perfilConsultor').innerHTML = 
            '<p class="text-red-400">Erro ao carregar perfil</p>';
    }
}

function abrirModalFoto() {
    document.getElementById('modalFoto').classList.remove('hidden');
    document.getElementById('inputFotoUrl').value = perfilAtual?.foto_url || '';
}

function fecharModalFoto() {
    document.getElementById('modalFoto').classList.add('hidden');
}

async function salvarFoto() {
    const fotoUrl = document.getElementById('inputFotoUrl').value.trim();
    
    try {
        const response = await apiRequest(`/api/consultores/${consultorId}`, {
            method: 'PUT',
            body: JSON.stringify({ foto_url: fotoUrl })
        });
        
        if (response && response.ok) {
            fecharModalFoto();
            carregarPerfilConsultor();
            alert('Foto atualizada com sucesso!');
        } else {
            alert('Erro ao atualizar foto');
        }
    } catch (error) {
        console.error('Erro ao salvar foto:', error);
        alert('Erro ao atualizar foto');
    }
}

async function abrirAtribuirProspeccao() {
    if (!usuarioLogado || usuarioLogado.tipo !== 'admin') {
        alert('Apenas administradores podem atribuir prospecções');
        return;
    }
    document.getElementById('modalAtribuirProspeccao').classList.remove('hidden');
    await carregarEmpresas('listaEmpresas', 'buscarEmpresa', true);
}

function fecharModalAtribuirProspeccao() {
    document.getElementById('modalAtribuirProspeccao').classList.add('hidden');
}

async function abrirAtribuirEmpresas() {
    if (!usuarioLogado || usuarioLogado.tipo !== 'admin') {
        alert('Apenas administradores podem atribuir empresas');
        return;
    }
    document.getElementById('modalAtribuirEmpresas').classList.remove('hidden');
    await carregarEmpresas('listaEmpresasAtribuir', 'buscarEmpresaAtribuir', false);
}

function fecharModalAtribuirEmpresas() {
    document.getElementById('modalAtribuirEmpresas').classList.add('hidden');
}

async function abrirAtribuirAcoes() {
    if (!usuarioLogado || usuarioLogado.tipo !== 'admin') {
        alert('Apenas administradores podem definir ações');
        return;
    }
    document.getElementById('modalAtribuirAcoes').classList.remove('hidden');
    await carregarEmpresasAtribuidas();
}

function fecharModalAtribuirAcoes() {
    document.getElementById('modalAtribuirAcoes').classList.add('hidden');
}

async function carregarEmpresas(containerId, searchInputId, paraProspeccao) {
    try {
        const response = await apiRequest('/api/empresas/?page=1&page_size=100');
        if (!response) {
            document.getElementById(containerId).innerHTML = '<p class="text-red-400 text-center py-4">Erro de autenticação</p>';
            return;
        }
        const data = await response.json();
        empresasDisponiveis = data.items || [];
        
        renderizarListaEmpresas(containerId, empresasDisponiveis, paraProspeccao);
        
        document.getElementById(searchInputId).addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const empresasFiltradas = empresasDisponiveis.filter(emp => 
                emp.empresa.toLowerCase().includes(termo) || 
                (emp.cnpj && emp.cnpj.includes(termo))
            );
            renderizarListaEmpresas(containerId, empresasFiltradas, paraProspeccao);
        });
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        document.getElementById(containerId).innerHTML = '<p class="text-red-400 text-center py-4">Erro ao carregar empresas</p>';
    }
}

function renderizarListaEmpresas(containerId, empresas, paraProspeccao) {
    const container = document.getElementById(containerId);
    
    if (!empresas || empresas.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma empresa encontrada</p>';
        return;
    }
    
    container.innerHTML = empresas.map(emp => `
        <div class="p-3 border-b border-gray-700 hover:bg-dark-hover cursor-pointer" onclick="${paraProspeccao ? `criarProspeccaoParaEmpresa(${emp.id})` : `atribuirEmpresa(${emp.id})`}">
            <p class="text-white font-medium">${emp.empresa}</p>
            <p class="text-gray-400 text-sm">${emp.cnpj || 'Sem CNPJ'} - ${emp.municipio || 'N/A'}, ${emp.estado || 'N/A'}</p>
        </div>
    `).join('');
}

async function criarProspeccaoParaEmpresa(empresaId) {
    window.location.href = `/prospeccao?empresa_id=${empresaId}&consultor_id=${consultorId}`;
}

async function atribuirEmpresa(empresaId) {
    if (!usuarioLogado || usuarioLogado.tipo !== 'admin') {
        alert('Apenas administradores podem atribuir empresas');
        return;
    }
    
    try {
        const response = await apiRequest('/api/atribuicoes/', {
            method: 'POST',
            body: JSON.stringify({
                consultor_id: consultorId,
                empresa_id: empresaId,
                ativa: true
            })
        });
        
        if (response && response.ok) {
            alert('Empresa atribuída com sucesso!');
            fecharModalAtribuirEmpresas();
            carregarPerfilConsultor();
        } else if (response) {
            try {
                const error = await response.json();
                alert(error.detail || 'Erro ao atribuir empresa');
            } catch {
                alert('Erro ao atribuir empresa');
            }
        } else {
            alert('Erro ao atribuir empresa');
        }
    } catch (error) {
        console.error('Erro ao atribuir empresa:', error);
        alert('Erro ao atribuir empresa');
    }
}

async function carregarEmpresasAtribuidas() {
    try {
        const response = await apiRequest(`/api/atribuicoes/consultor/${consultorId}`);
        if (!response) {
            document.getElementById('empresasParaAcoes').innerHTML = '<p class="text-red-400 text-center py-4">Erro de autenticação</p>';
            return;
        }
        const atribuicoes = await response.json();
        
        const container = document.getElementById('empresasParaAcoes');
        
        if (!atribuicoes || atribuicoes.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma empresa atribuída</p>';
            return;
        }
        
        container.innerHTML = atribuicoes
            .filter(atrib => atrib.empresa)
            .map(atrib => `
                <label class="flex items-center p-3 border-b border-gray-700 hover:bg-dark-hover cursor-pointer">
                    <input type="checkbox" value="${atrib.empresa.id}" class="mr-3 w-4 h-4" onchange="toggleEmpresaAcao(this)">
                    <div>
                        <p class="text-white font-medium">${atrib.empresa.empresa}</p>
                        <p class="text-gray-400 text-sm">${atrib.empresa.cnpj || 'Sem CNPJ'}</p>
                    </div>
                </label>
            `).join('');
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

let empresasSelecionadas = [];

function toggleEmpresaAcao(checkbox) {
    const empresaId = parseInt(checkbox.value);
    if (checkbox.checked) {
        empresasSelecionadas.push(empresaId);
    } else {
        empresasSelecionadas = empresasSelecionadas.filter(id => id !== empresaId);
    }
}

async function salvarAcoes() {
    const acaoTexto = document.getElementById('acaoTexto').value.trim();
    
    if (empresasSelecionadas.length === 0) {
        alert('Selecione pelo menos uma empresa');
        return;
    }
    
    if (!acaoTexto) {
        alert('Descreva a ação a ser realizada');
        return;
    }
    
    alert(`Ação "${acaoTexto}" definida para ${empresasSelecionadas.length} empresa(s)!\n\nEsta funcionalidade será expandida em breve com sistema de notificações.`);
    fecharModalAtribuirAcoes();
    empresasSelecionadas = [];
}

async function visualizarEmpresasAtribuidas() {
    document.getElementById('modalVerEmpresas').classList.remove('hidden');
    await carregarListaEmpresasAtribuidas();
}

function fecharModalVerEmpresas() {
    document.getElementById('modalVerEmpresas').classList.add('hidden');
}

async function carregarListaEmpresasAtribuidas() {
    try {
        const response = await apiRequest(`/api/atribuicoes/consultor/${consultorId}`);
        if (!response) {
            document.getElementById('listaEmpresasAtribuidas').innerHTML = '<p class="text-red-400 text-center py-4">Erro de autenticação</p>';
            return;
        }
        const atribuicoes = await response.json();
        
        const container = document.getElementById('listaEmpresasAtribuidas');
        
        if (!atribuicoes || atribuicoes.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma empresa atribuída a este consultor</p>';
            return;
        }
        
        container.innerHTML = atribuicoes
            .filter(atrib => atrib.empresa)
            .map(atrib => `
                <div class="bg-dark-card p-4 rounded-lg hover:bg-dark-hover cursor-pointer transition" onclick="window.location.href='/empresa/${atrib.empresa.id}'">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-white font-medium">${atrib.empresa.empresa || 'Empresa sem nome'}</p>
                            <p class="text-gray-400 text-sm">${atrib.empresa.cnpj || 'Sem CNPJ'} - ${atrib.empresa.municipio || 'N/A'}, ${atrib.empresa.estado || 'N/A'}</p>
                        </div>
                        <div class="text-blue-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            `).join('');
        
        if (container.innerHTML === '') {
            container.innerHTML = '<p class="text-gray-400 text-center py-4">Nenhuma empresa atribuída a este consultor</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar empresas atribuídas:', error);
        document.getElementById('listaEmpresasAtribuidas').innerHTML = '<p class="text-red-400 text-center py-4">Erro ao carregar empresas</p>';
    }
}

function abrirModalEditarPerfil() {
    if (!perfilAtual) {
        alert('Carregando perfil...');
        return;
    }
    
    document.getElementById('editNome').value = perfilAtual.nome || '';
    document.getElementById('editEmail').value = perfilAtual.email || '';
    document.getElementById('editTelefone').value = perfilAtual.telefone || '';
    document.getElementById('editDataNascimento').value = perfilAtual.data_nascimento || '';
    document.getElementById('editModeloCarro').value = perfilAtual.modelo_carro || '';
    document.getElementById('editPlacaCarro').value = perfilAtual.placa_carro || '';
    document.getElementById('editFotoUrl').value = perfilAtual.foto_url || '';
    document.getElementById('editInformacoesBasicas').value = perfilAtual.informacoes_basicas || '';
    
    document.getElementById('modalEditarPerfil').classList.remove('hidden');
}

function fecharModalEditarPerfil() {
    document.getElementById('modalEditarPerfil').classList.add('hidden');
}

async function salvarPerfilCompleto() {
    const dados = {
        nome: document.getElementById('editNome').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        telefone: document.getElementById('editTelefone').value.trim() || null,
        data_nascimento: document.getElementById('editDataNascimento').value || null,
        modelo_carro: document.getElementById('editModeloCarro').value.trim() || null,
        placa_carro: document.getElementById('editPlacaCarro').value.trim() || null,
        foto_url: document.getElementById('editFotoUrl').value.trim() || null,
        informacoes_basicas: document.getElementById('editInformacoesBasicas').value.trim() || null
    };
    
    if (!dados.nome || !dados.email) {
        alert('Nome e email são obrigatórios');
        return;
    }
    
    try {
        const response = await apiRequest('/api/consultores/perfil/atualizar', {
            method: 'PUT',
            body: JSON.stringify(dados)
        });
        
        if (response && response.ok) {
            fecharModalEditarPerfil();
            carregarPerfilConsultor();
            alert('Perfil atualizado com sucesso!');
        } else if (response) {
            const error = await response.json();
            alert(error.detail || 'Erro ao atualizar perfil');
        } else {
            alert('Erro ao atualizar perfil');
        }
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        alert('Erro ao atualizar perfil');
    }
}

carregarPerfilConsultor();
