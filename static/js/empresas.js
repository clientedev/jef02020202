checkAuth();
atualizarSidebar();

const usuario = getUsuario();

if (usuario.tipo !== 'admin') {
    document.getElementById('btnNovaEmpresa').style.display = 'none';
    document.getElementById('btnUploadExcel').style.display = 'none';
}

let paginaAtual = 1;
const itensPorPagina = 20;
let filtrosAtuais = {};

async function carregarEmpresas(filtros = {}, pagina = 1) {
    try {
        paginaAtual = pagina;
        filtrosAtuais = filtros;
        
        let url = `/api/empresas/?page=${pagina}&page_size=${itensPorPagina}`;
        if (filtros.nome) url += `&nome=${filtros.nome}`;
        if (filtros.cnpj) url += `&cnpj=${filtros.cnpj}`;
        if (filtros.municipio) url += `&municipio=${filtros.municipio}`;
        if (filtros.er) url += `&er=${filtros.er}`;
        if (filtros.carteira) url += `&carteira=${filtros.carteira}`;
        
        const response = await apiRequest(url);
        const data = await response.json();
        
        const tbody = document.getElementById('tabelaEmpresas');
        
        if (!data.items || data.items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">Nenhuma empresa encontrada</td></tr>';
            atualizarPaginacao({total_count: 0, page: 1, page_size: itensPorPagina, total_pages: 0});
            return;
        }
        
        tbody.innerHTML = data.items.map(emp => `
            <tr class="hover:bg-dark-hover">
                <td class="px-6 py-4 text-gray-300">${emp.empresa}</td>
                <td class="px-6 py-4 text-gray-300">${emp.cnpj || '-'}</td>
                <td class="px-6 py-4 text-gray-300">${emp.municipio || '-'}</td>
                <td class="px-6 py-4 text-gray-300">${emp.er || '-'}</td>
                <td class="px-6 py-4 text-gray-300">${emp.carteira || '-'}</td>
                <td class="px-6 py-4">
                    <div class="flex gap-2">
                        <button onclick="abrirDetalhesEmpresa(${emp.id})" 
                            class="text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-dark-hover transition" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${usuario.tipo === 'admin' ? `
                        <button onclick="abrirEditarEmpresa(${emp.id})" 
                            class="text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-dark-hover transition" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmarExcluirEmpresa(${emp.id}, '${emp.empresa.replace(/'/g, "\\'")}')" 
                            class="text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-dark-hover transition" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
        atualizarPaginacao(data);
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        document.getElementById('tabelaEmpresas').innerHTML = 
            '<tr><td colspan="6" class="px-6 py-8 text-center text-red-400">Erro ao carregar empresas</td></tr>';
    }
}

function atualizarPaginacao(data) {
    const info = document.getElementById('paginacaoInfo');
    const controles = document.getElementById('paginacaoControles');
    
    if (!info || !controles) return;
    
    if (data.total_count === 0) {
        info.textContent = 'Nenhuma empresa encontrada';
        controles.innerHTML = '';
        return;
    }
    
    const inicio = (data.page - 1) * data.page_size + 1;
    const fim = Math.min(data.page * data.page_size, data.total_count);
    
    info.textContent = `Mostrando ${inicio} a ${fim} de ${data.total_count} empresas`;
    
    let botoesHTML = '';
    
    if (data.page > 1) {
        botoesHTML += `<button onclick="carregarEmpresas(filtrosAtuais, 1)" class="px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover">Primeira</button>`;
        botoesHTML += `<button onclick="carregarEmpresas(filtrosAtuais, ${data.page - 1})" class="px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover">Anterior</button>`;
    }
    
    const maxBotoes = 5;
    let inicioPagina = Math.max(1, data.page - Math.floor(maxBotoes / 2));
    let fimPagina = Math.min(data.total_pages, inicioPagina + maxBotoes - 1);
    
    if (fimPagina - inicioPagina < maxBotoes - 1) {
        inicioPagina = Math.max(1, fimPagina - maxBotoes + 1);
    }
    
    for (let i = inicioPagina; i <= fimPagina; i++) {
        if (i === data.page) {
            botoesHTML += `<button class="px-3 py-1 bg-blue-600 text-white rounded">${i}</button>`;
        } else {
            botoesHTML += `<button onclick="carregarEmpresas(filtrosAtuais, ${i})" class="px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover">${i}</button>`;
        }
    }
    
    if (data.page < data.total_pages) {
        botoesHTML += `<button onclick="carregarEmpresas(filtrosAtuais, ${data.page + 1})" class="px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover">Próxima</button>`;
        botoesHTML += `<button onclick="carregarEmpresas(filtrosAtuais, ${data.total_pages})" class="px-3 py-1 bg-dark-card text-gray-300 rounded hover:bg-dark-hover">Última</button>`;
    }
    
    controles.innerHTML = botoesHTML;
}

function aplicarFiltros() {
    const filtros = {
        nome: document.getElementById('filtroNome').value,
        cnpj: document.getElementById('filtroCNPJ').value,
        municipio: document.getElementById('filtroMunicipio').value,
        er: document.getElementById('filtroER').value,
        carteira: document.getElementById('filtroCarteira').value
    };
    carregarEmpresas(filtros, 1);
}

function limparFiltros() {
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroCNPJ').value = '';
    document.getElementById('filtroMunicipio').value = '';
    document.getElementById('filtroER').value = '';
    document.getElementById('filtroCarteira').value = '';
    carregarEmpresas({}, 1);
}

function showNovaEmpresaModal() {
    document.getElementById('novaEmpresaModal').classList.remove('hidden');
}

function hideNovaEmpresaModal() {
    document.getElementById('novaEmpresaModal').classList.add('hidden');
    document.getElementById('novaEmpresaForm').reset();
}

document.getElementById('novaEmpresaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const empresa = {
        empresa: document.getElementById('empresa').value,
        cnpj: document.getElementById('cnpj').value || null,
        sigla: document.getElementById('sigla').value || null,
        porte: document.getElementById('porte').value || null,
        er: document.getElementById('er').value || null,
        carteira: document.getElementById('carteira').value || null,
        endereco: document.getElementById('endereco').value || null,
        bairro: document.getElementById('bairro').value || null,
        municipio: document.getElementById('municipio').value || null,
        estado: document.getElementById('estado').value || null,
        numero_funcionarios: document.getElementById('numero_funcionarios').value ? parseInt(document.getElementById('numero_funcionarios').value) : null,
        observacao: document.getElementById('observacao').value || null,
        nome_contato: document.getElementById('nome_contato').value || null,
        cargo_contato: document.getElementById('cargo_contato').value || null,
        telefone_contato: document.getElementById('telefone_contato').value || null,
        email_contato: document.getElementById('email_contato').value || null
    };
    
    try {
        const response = await apiRequest('/api/empresas/', {
            method: 'POST',
            body: JSON.stringify(empresa)
        });
        
        if (response.ok) {
            const resultado = await response.json();
            const empresaId = resultado.id || resultado.empresa_id;
            
            if (empresaId) {
                alert('Empresa cadastrada com sucesso!');
                hideNovaEmpresaModal();
                window.location.href = `/empresa/${empresaId}`;
            } else {
                alert('Empresa cadastrada com sucesso!');
                hideNovaEmpresaModal();
                carregarEmpresas();
            }
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao cadastrar empresa');
        }
    } catch (error) {
        alert('Erro de conexão com o servidor');
    }
});

function showUploadExcelModal() {
    document.getElementById('uploadExcelModal').classList.remove('hidden');
}

function hideUploadExcelModal() {
    document.getElementById('uploadExcelModal').classList.add('hidden');
    document.getElementById('uploadExcelForm').reset();
    document.getElementById('uploadResult').classList.add('hidden');
}

document.getElementById('uploadExcelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Selecione um arquivo');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/empresas/upload-excel', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.detail || 'Erro no upload');
        
        const resultDiv = document.getElementById('uploadResult');
        resultDiv.className = 'bg-green-900/30 border border-green-500 text-green-300 p-4 rounded';
        resultDiv.innerHTML = `
            <p class="font-semibold mb-2">${result.message}</p>
            <ul class="text-sm space-y-1">
                <li>Empresas criadas: ${result.empresas_criadas}</li>
                <li>Empresas ignoradas (já existentes): ${result.empresas_ignoradas}</li>
                <li>Total processado: ${result.total_processadas}</li>
            </ul>
        `;
        resultDiv.classList.remove('hidden');
        
        setTimeout(() => {
            hideUploadExcelModal();
            carregarEmpresas();
        }, 3000);
    } catch (error) {
        console.error('Erro no upload:', error);
        const resultDiv = document.getElementById('uploadResult');
        resultDiv.className = 'bg-red-900/30 border border-red-500 text-red-300 p-4 rounded';
        resultDiv.textContent = `Erro: ${error.message}`;
        resultDiv.classList.remove('hidden');
    }
});

async function abrirDetalhesEmpresa(empresaId) {
    document.getElementById('detalhesEmpresaModal').classList.remove('hidden');
    document.getElementById('detalhesEmpresaContent').innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    `;
    
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar dados da empresa');
        }
        
        const emp = await response.json();
        
        document.getElementById('detalhesEmpresaContent').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2 border-b border-dark-border/50 pb-2">
                        <i class="fas fa-building text-blue-400"></i>
                        Informações Gerais
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-gray-400 text-sm">Empresa</span>
                            <p class="text-white font-medium">${emp.empresa || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">CNPJ</span>
                            <p class="text-white">${emp.cnpj || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Sigla</span>
                            <p class="text-white">${emp.sigla || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Porte</span>
                            <p class="text-white">${emp.porte || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">ER</span>
                            <p class="text-white">${emp.er || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Carteira</span>
                            <p class="text-white">${emp.carteira || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Tipo Empresa</span>
                            <p class="text-white">${emp.tipo_empresa || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Nº Funcionários</span>
                            <p class="text-white">${emp.numero_funcionarios || '-'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2 border-b border-dark-border/50 pb-2">
                        <i class="fas fa-map-marker-alt text-emerald-400"></i>
                        Endereço
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <span class="text-gray-400 text-sm">Endereço</span>
                            <p class="text-white">${emp.endereco || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Bairro</span>
                            <p class="text-white">${emp.bairro || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Zona</span>
                            <p class="text-white">${emp.zona || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Município</span>
                            <p class="text-white">${emp.municipio || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Estado</span>
                            <p class="text-white">${emp.estado || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">País</span>
                            <p class="text-white">${emp.pais || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Área</span>
                            <p class="text-white">${emp.area || '-'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2 border-b border-dark-border/50 pb-2">
                        <i class="fas fa-industry text-purple-400"></i>
                        Atividade
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-gray-400 text-sm">CNAE Principal</span>
                            <p class="text-white">${emp.cnae_principal || '-'}</p>
                        </div>
                        <div class="col-span-2">
                            <span class="text-gray-400 text-sm">Descrição CNAE</span>
                            <p class="text-white">${emp.descricao_cnae || '-'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2 border-b border-dark-border/50 pb-2">
                        <i class="fas fa-user-tie text-amber-400"></i>
                        Contato
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="text-gray-400 text-sm">Nome</span>
                            <p class="text-white">${emp.nome_contato || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Cargo</span>
                            <p class="text-white">${emp.cargo_contato || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">Telefone</span>
                            <p class="text-white">${emp.telefone_contato || '-'}</p>
                        </div>
                        <div>
                            <span class="text-gray-400 text-sm">E-mail</span>
                            <p class="text-white">${emp.email_contato || '-'}</p>
                        </div>
                    </div>
                </div>
                
                ${emp.observacao ? `
                <div class="md:col-span-2 space-y-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2 border-b border-dark-border/50 pb-2">
                        <i class="fas fa-sticky-note text-cyan-400"></i>
                        Observação
                    </h3>
                    <p class="text-gray-300">${emp.observacao}</p>
                </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        document.getElementById('detalhesEmpresaContent').innerHTML = `
            <div class="text-center text-red-400 py-8">
                <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                <p>Erro ao carregar dados da empresa</p>
            </div>
        `;
    }
}

function hideDetalhesEmpresaModal() {
    document.getElementById('detalhesEmpresaModal').classList.add('hidden');
}

async function abrirEditarEmpresa(empresaId) {
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar dados da empresa');
        }
        
        const empresa = await response.json();
        
        document.getElementById('edit_empresa_id').value = empresa.id;
        document.getElementById('edit_empresa').value = empresa.empresa || '';
        document.getElementById('edit_cnpj').value = empresa.cnpj || '';
        document.getElementById('edit_sigla').value = empresa.sigla || '';
        document.getElementById('edit_porte').value = empresa.porte || '';
        document.getElementById('edit_er').value = empresa.er || '';
        document.getElementById('edit_carteira').value = empresa.carteira || '';
        document.getElementById('edit_endereco').value = empresa.endereco || '';
        document.getElementById('edit_bairro').value = empresa.bairro || '';
        document.getElementById('edit_municipio').value = empresa.municipio || '';
        document.getElementById('edit_estado').value = empresa.estado || '';
        document.getElementById('edit_pais').value = empresa.pais || '';
        document.getElementById('edit_zona').value = empresa.zona || '';
        document.getElementById('edit_area').value = empresa.area || '';
        document.getElementById('edit_cnae_principal').value = empresa.cnae_principal || '';
        document.getElementById('edit_descricao_cnae').value = empresa.descricao_cnae || '';
        document.getElementById('edit_tipo_empresa').value = empresa.tipo_empresa || '';
        document.getElementById('edit_numero_funcionarios').value = empresa.numero_funcionarios || '';
        document.getElementById('edit_nome_contato').value = empresa.nome_contato || '';
        document.getElementById('edit_cargo_contato').value = empresa.cargo_contato || '';
        document.getElementById('edit_telefone_contato').value = empresa.telefone_contato || '';
        document.getElementById('edit_email_contato').value = empresa.email_contato || '';
        document.getElementById('edit_observacao').value = empresa.observacao || '';
        
        document.getElementById('editarEmpresaModal').classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        alert('Erro ao carregar dados da empresa');
    }
}

function hideEditarEmpresaModal() {
    document.getElementById('editarEmpresaModal').classList.add('hidden');
    document.getElementById('editarEmpresaForm').reset();
}

document.getElementById('editarEmpresaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const empresaId = document.getElementById('edit_empresa_id').value;
    
    const empresaData = {
        empresa: document.getElementById('edit_empresa').value,
        cnpj: document.getElementById('edit_cnpj').value || null,
        sigla: document.getElementById('edit_sigla').value || null,
        porte: document.getElementById('edit_porte').value || null,
        er: document.getElementById('edit_er').value || null,
        carteira: document.getElementById('edit_carteira').value || null,
        endereco: document.getElementById('edit_endereco').value || null,
        bairro: document.getElementById('edit_bairro').value || null,
        municipio: document.getElementById('edit_municipio').value || null,
        estado: document.getElementById('edit_estado').value || null,
        pais: document.getElementById('edit_pais').value || null,
        zona: document.getElementById('edit_zona').value || null,
        area: document.getElementById('edit_area').value || null,
        cnae_principal: document.getElementById('edit_cnae_principal').value || null,
        descricao_cnae: document.getElementById('edit_descricao_cnae').value || null,
        tipo_empresa: document.getElementById('edit_tipo_empresa').value || null,
        numero_funcionarios: document.getElementById('edit_numero_funcionarios').value ? parseInt(document.getElementById('edit_numero_funcionarios').value) : null,
        nome_contato: document.getElementById('edit_nome_contato').value || null,
        cargo_contato: document.getElementById('edit_cargo_contato').value || null,
        telefone_contato: document.getElementById('edit_telefone_contato').value || null,
        email_contato: document.getElementById('edit_email_contato').value || null,
        observacao: document.getElementById('edit_observacao').value || null
    };
    
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}`, {
            method: 'PUT',
            body: JSON.stringify(empresaData)
        });
        
        if (response.ok) {
            alert('Empresa atualizada com sucesso!');
            hideEditarEmpresaModal();
            carregarEmpresas(filtrosAtuais, paginaAtual);
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao atualizar empresa');
        }
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        alert('Erro de conexão com o servidor');
    }
});

async function confirmarExcluirEmpresa(empresaId, empresaNome) {
    if (!confirm(`Tem certeza que deseja excluir a empresa "${empresaNome}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Empresa excluída com sucesso!');
            carregarEmpresas(filtrosAtuais, paginaAtual);
        } else {
            const error = await response.json();
            alert(error.detail || 'Erro ao excluir empresa');
        }
    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        alert('Erro de conexão com o servidor');
    }
}

carregarEmpresas();
