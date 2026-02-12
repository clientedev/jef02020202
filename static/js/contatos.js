document.addEventListener('DOMContentLoaded', () => {
    carregarContatos();
});

async function carregarContatos() {
    const nome = document.getElementById('filtroNome').value;
    const empresa = document.getElementById('filtroEmpresa').value;
    const cargo = document.getElementById('filtroCargo').value;

    let url = '/api/contatos/?';
    if (nome) url += `nome=${encodeURIComponent(nome)}&`;
    if (empresa) url += `empresa=${encodeURIComponent(empresa)}&`;
    if (cargo) url += `cargo=${encodeURIComponent(cargo)}&`;

    try {
        const response = await apiRequest(url);
        const contatos = await response.json();

        const tbody = document.getElementById('tabelaContatos');
        if (!contatos || contatos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500 italic">Nenhum contato encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = contatos.map(c => `
            <tr class="table-row-hover">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${c.nome}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <a href="/empresa/${c.empresa_id}" class="text-sm text-blue-400 hover:underline">
                        ${c.empresa_nome}
                    </a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${c.cargo || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${c.email || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    ${c.emails_voltaram ? '<span class="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-bold">ERRO ENVIO</span>' : '<span class="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-bold">OK</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${c.celular || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${c.celular2 || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    ${c.telefone_fixo || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                    ${c.ponto_focal ? '<i class="fas fa-check text-emerald-400"></i>' : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                    ${c.proprietario_socio ? '<i class="fas fa-check text-amber-400"></i>' : '-'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-400 max-w-xs truncate" title="${c.observacoes || ''}">
                    ${c.observacoes || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    <button onclick="deletarContato(${c.id})" class="text-red-400 hover:text-red-300 transition">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
    }
}

function aplicarFiltros() {
    carregarContatos();
}

function limparFiltros() {
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroEmpresa').value = '';
    document.getElementById('filtroCargo').value = '';
    carregarContatos();
}

async function deletarContato(id) {
    if (confirm("Deseja realmente remover este contato?")) {
        try {
            const response = await apiRequest(`/api/contatos/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                carregarContatos();
            } else {
                alert("Erro ao remover contato");
            }
        } catch (error) {
            console.error('Erro ao deletar contato:', error);
        }
    }
}

// Funções para Importação
function abrirModalImportar() {
    document.getElementById('modalImportar').classList.remove('hidden');
    limparModalImportar();
}

function fecharModalImportar() {
    document.getElementById('modalImportar').classList.add('hidden');
    limparModalImportar();
}

function limparModalImportar() {
    document.getElementById('arquivoImportacao').value = '';
    document.getElementById('nomeArquivo').innerText = 'Clique para selecionar';
    document.getElementById('statusImportacao').classList.add('hidden');
    document.getElementById('btnProcessar').disabled = true;
    document.getElementById('barraProgresso').style.width = '0%';
    document.getElementById('textoStatus').innerText = 'Processando...';
}

function selecionarArquivo(input) {
    if (input.files && input.files[0]) {
        const arquivo = input.files[0];
        document.getElementById('nomeArquivo').innerText = arquivo.name;
        document.getElementById('btnProcessar').disabled = false;
    }
}

async function processarImportacao() {
    const input = document.getElementById('arquivoImportacao');
    if (!input.files || !input.files[0]) return;

    const arquivo = input.files[0];
    const formData = new FormData();
    formData.append('file', arquivo);

    document.getElementById('statusImportacao').classList.remove('hidden');
    document.getElementById('btnProcessar').disabled = true;
    document.getElementById('barraProgresso').style.width = '30%';
    document.getElementById('textoStatus').innerText = 'Enviando arquivo...';

    try {
        const response = await fetch('/api/contatos/importar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            const resultado = await response.json();
            document.getElementById('barraProgresso').style.width = '100%';
            document.getElementById('barraProgresso').classList.replace('bg-blue-500', 'bg-emerald-500');
            document.getElementById('textoStatus').innerText = `Sucesso! ${resultado.importados} contatos importados.`;

            setTimeout(() => {
                fecharModalImportar();
                carregarContatos();
            }, 2000);
        } else {
            const erro = await response.json();
            document.getElementById('barraProgresso').classList.replace('bg-blue-500', 'bg-red-500');
            document.getElementById('textoStatus').innerText = `Erro: ${erro.detail || 'Falha na importação'}`;
            document.getElementById('btnProcessar').disabled = false;
        }
    } catch (error) {
        console.error('Erro na importação:', error);
        document.getElementById('barraProgresso').classList.replace('bg-blue-500', 'bg-red-500');
        document.getElementById('textoStatus').innerText = 'Erro de conexão ao servidor';
        document.getElementById('btnProcessar').disabled = false;
    }
}

// Funções para Novo Contato Individual
function abrirModalNovoContato() {
    document.getElementById('modalNovoContato').classList.remove('hidden');
    carregarEmpresasParaSelect();
}

function fecharModalNovoContato() {
    document.getElementById('modalNovoContato').classList.add('hidden');
    document.getElementById('formNovoContato').reset();
}

async function carregarEmpresasParaSelect() {
    const select = document.getElementById('novoEmpresaId');
    try {
        const response = await apiRequest('/api/empresas/?page_size=100');
        const data = await response.json();
        const empresas = data.items || [];

        select.innerHTML = '<option value="">Selecione uma empresa...</option>' +
            empresas.map(e => `<option value="${e.id}">${e.empresa}</option>`).join('');
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
        select.innerHTML = '<option value="">Erro ao carregar empresas</option>';
    }
}

async function salvarNovoContato(event) {
    event.preventDefault();

    const contato = {
        nome: document.getElementById('novoNome').value,
        empresa_id: parseInt(document.getElementById('novoEmpresaId').value),
        cargo: document.getElementById('novoCargo').value,
        email: document.getElementById('novoEmail').value,
        celular: document.getElementById('novoCelular').value,
        celular2: document.getElementById('novoCelular2').value,
        telefone_fixo: document.getElementById('novoTelefoneFixo').value,
        ponto_focal: document.getElementById('novoPontoFocal').checked,
        proprietario_socio: document.getElementById('novoSocio').checked,
        emails_voltaram: document.getElementById('novoEmailsVoltaram').checked,
        observacoes: document.getElementById('novoObservacoes').value
    };

    try {
        const response = await apiRequest('/api/contatos/', {
            method: 'POST',
            body: JSON.stringify(contato)
        });

        if (response.ok) {
            fecharModalNovoContato();
            carregarContatos();
        } else {
            const error = await response.json();
            alert(`Erro ao salvar contato: ${error.detail || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('Erro ao salvar contato:', error);
        alert('Erro de conexão ao salvar contato');
    }
}
