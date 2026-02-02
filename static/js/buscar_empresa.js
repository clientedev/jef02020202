checkAuth();
atualizarSidebar();

const usuario = getUsuario();

let empresaAtual = null;

const cnpjInput = document.getElementById('cnpjInput');
cnpjInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 14) {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    e.target.value = value;
});

cnpjInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        buscarCNPJ();
    }
});

async function buscarCNPJ() {
    const cnpj = document.getElementById('cnpjInput').value.replace(/\D/g, '');
    
    if (!cnpj || cnpj.length !== 14) {
        mostrarErro('Por favor, digite um CNPJ válido com 14 dígitos.');
        return;
    }
    
    const btnBuscar = document.getElementById('btnBuscar');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const resultadoContainer = document.getElementById('resultadoContainer');
    
    btnBuscar.disabled = true;
    btnBuscar.textContent = 'Buscando...';
    loadingMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    resultadoContainer.classList.add('hidden');
    
    try {
        const response = await apiRequest(`/api/cnpj/buscar/${cnpj}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao buscar CNPJ');
        }
        
        empresaAtual = await response.json();
        mostrarResultado(empresaAtual);
        
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        mostrarErro(error.message || 'Erro ao buscar CNPJ. Tente novamente.');
    } finally {
        btnBuscar.disabled = false;
        btnBuscar.textContent = 'Buscar';
        loadingMessage.classList.add('hidden');
    }
}

function mostrarResultado(empresa) {
    document.getElementById('resultadoContainer').classList.remove('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    
    document.getElementById('fonteBadge').textContent = `Fonte: ${empresa.fonte || 'API'}`;
    document.getElementById('razaoSocial').textContent = empresa.empresa || '-';
    document.getElementById('nomeFantasia').textContent = empresa.nome_fantasia || '-';
    document.getElementById('cnpjDisplay').textContent = formatarCNPJ(empresa.cnpj) || '-';
    document.getElementById('situacao').textContent = empresa.situacao || '-';
    document.getElementById('dataAbertura').textContent = empresa.data_abertura || '-';
    
    document.getElementById('logradouro').textContent = empresa.logradouro || '-';
    document.getElementById('numero').textContent = empresa.numero || '-';
    document.getElementById('complemento').textContent = empresa.complemento || '-';
    document.getElementById('bairro').textContent = empresa.bairro || '-';
    document.getElementById('municipio').textContent = empresa.municipio || '-';
    document.getElementById('estado').textContent = empresa.estado || '-';
    document.getElementById('cep').textContent = empresa.cep || '-';
    
    document.getElementById('telefone').textContent = empresa.telefone || '-';
    document.getElementById('email').textContent = empresa.email || '-';
    
    document.getElementById('atividadePrincipal').textContent = empresa.atividade_principal || '-';
    document.getElementById('naturezaJuridica').textContent = empresa.natureza_juridica || '-';
    document.getElementById('porte').textContent = empresa.porte || '-';
    
    document.getElementById('errorMessage').classList.add('hidden');
}

function mostrarErro(mensagem) {
    document.getElementById('errorMessage').classList.remove('hidden');
    document.getElementById('errorText').textContent = mensagem;
    document.getElementById('resultadoContainer').classList.add('hidden');
}

function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

async function salvarNaCarteira() {
    if (!empresaAtual) {
        mostrarErro('Nenhuma empresa para salvar.');
        return;
    }
    
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';
    
    try {
        const response = await apiRequest('/api/cnpj/salvar', {
            method: 'POST',
            body: JSON.stringify(empresaAtual)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao salvar empresa');
        }
        
        const result = await response.json();
        
        document.getElementById('successMessage').classList.remove('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
        
        btnSalvar.textContent = 'Salva com Sucesso!';
        btnSalvar.classList.remove('bg-green-600', 'hover:bg-green-700');
        btnSalvar.classList.add('bg-gray-600');
        
        setTimeout(() => {
            window.location.href = `/empresa/${result.empresa_id}`;
        }, 2000);
        
    } catch (error) {
        console.error('Erro ao salvar empresa:', error);
        mostrarErro(error.message || 'Erro ao salvar empresa na carteira.');
        
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar na Carteira';
    }
}

function limparBusca() {
    document.getElementById('cnpjInput').value = '';
    document.getElementById('resultadoContainer').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    empresaAtual = null;
    document.getElementById('cnpjInput').focus();
}
