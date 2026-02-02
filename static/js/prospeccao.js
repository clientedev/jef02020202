let usuario = null;

document.addEventListener('DOMContentLoaded', async function() {
    const token = getToken();
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    usuario = getUsuario();
    atualizarSidebar();
    await carregarProspeccoes();
});

async function carregarProspeccoes() {
    const tbody = document.getElementById('tabelaProspeccoes');
    if (!tbody) return;
    
    try {
        const response = await fetch('/api/prospeccoes/', {
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400">Erro ao carregar (código ' + response.status + ')</td></tr>';
            return;
        }
        
        const prospeccoes = await response.json();
        
        if (!prospeccoes || prospeccoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400">Nenhuma prospecção encontrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = prospeccoes.map(p => `
            <tr class="border-b border-dark-border/30 hover:bg-dark-hover">
                <td class="px-6 py-4 text-gray-300">${p.data_ligacao ? new Date(p.data_ligacao).toLocaleDateString('pt-BR') : '-'}</td>
                <td class="px-6 py-4 text-gray-300">${p.empresa ? p.empresa.empresa : 'N/A'}</td>
                <td class="px-6 py-4 text-gray-300">${p.consultor ? p.consultor.nome : 'N/A'}</td>
                <td class="px-6 py-4 text-gray-300">${p.resultado || '-'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-red-400">Erro: ' + error.message + '</td></tr>';
    }
}

async function showNovaProspeccaoModal() {
    document.getElementById('novaProspeccaoModal').classList.remove('hidden');
    await carregarEmpresas();
    await carregarConsultores();
}

function hideNovaProspeccaoModal() {
    document.getElementById('novaProspeccaoModal').classList.add('hidden');
}

async function carregarEmpresas() {
    const select = document.getElementById('empresa_id');
    try {
        const response = await fetch('/api/empresas/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (response.ok) {
            const data = await response.json();
            const empresas = data.items || data || [];
            select.innerHTML = '<option value="">Selecione...</option>' + 
                empresas.map(e => `<option value="${e.id}">${e.empresa}</option>`).join('');
        }
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function carregarConsultores() {
    const select = document.getElementById('consultor_id');
    const div = document.getElementById('consultorDiv');
    
    if (usuario && usuario.tipo !== 'admin') {
        div.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch('/api/usuarios/', {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (response.ok) {
            const usuarios = await response.json();
            const consultores = usuarios.filter(u => u.tipo === 'consultor' || u.tipo === 'admin');
            select.innerHTML = '<option value="">Selecione...</option>' + 
                consultores.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }
    } catch (e) {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

const form = document.getElementById('novaProspeccaoForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            empresa_id: parseInt(document.getElementById('empresa_id').value),
            consultor_id: usuario.tipo === 'admin' ? 
                parseInt(document.getElementById('consultor_id').value || usuario.id) : usuario.id,
            data_ligacao: document.getElementById('data_ligacao').value || null,
            resultado: document.getElementById('resultado').value || null,
            observacoes: document.getElementById('observacoes').value || null
        };
        
        try {
            const response = await fetch('/api/prospeccoes/', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                alert('Prospecção criada!');
                hideNovaProspeccaoModal();
                await carregarProspeccoes();
            } else {
                const err = await response.json();
                alert(err.detail || 'Erro ao criar');
            }
        } catch (error) {
            alert('Erro de conexão');
        }
    });
}
