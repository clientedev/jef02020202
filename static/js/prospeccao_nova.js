// Verificação de autenticação
if (typeof checkAuth === 'function') {
    checkAuth();
} else {
    console.error('auth.js não carregado corretamente');
    window.location.href = '/';
}

if (typeof atualizarSidebar === 'function') {
    atualizarSidebar();
}

// Variável global do usuário
let usuario = null;
try {
    usuario = typeof getUsuario === 'function' ? getUsuario() : null;
} catch (e) {
    console.error('Erro ao obter usuário:', e);
}

// Variáveis globais
let todasProspeccoes = [];
let visualizacaoAtual = 'lista';

// Verificação de autenticação - se não autenticado, para execução aqui
if (!usuario) {
    console.error('Usuário não encontrado no localStorage');
    // Não faz nada mais - checkAuth já vai redirecionar
}

// Inicialização segura do evento agendar_proxima
const agendarProximaEl = document.getElementById('agendar_proxima');
if (agendarProximaEl) {
    agendarProximaEl.addEventListener('change', function() {
        const opcoes = document.getElementById('agendamentoOptions');
        const dataInput = document.getElementById('data_proxima_ligacao');
        if (opcoes) opcoes.classList.toggle('hidden', !this.checked);
        
        if (this.checked && dataInput && !dataInput.value) {
            const hoje = new Date();
            hoje.setDate(hoje.getDate() + 7);
            dataInput.value = hoje.toISOString().split('T')[0];
        }
        
        if (dataInput) dataInput.required = this.checked;
    });
}

function toggleVisualizacao(modo) {
    visualizacaoAtual = modo;
    
    const btnCards = document.getElementById('btnCards');
    const btnLista = document.getElementById('btnLista');
    const viewCards = document.getElementById('viewCards');
    const viewLista = document.getElementById('viewLista');
    
    const activeClasses = ['bg-blue-600', 'text-white', 'border-blue-500'];
    const inactiveClasses = ['bg-slate-700/50', 'text-slate-300', 'border-slate-600/50'];
    
    if (modo === 'cards') {
        inactiveClasses.forEach(c => btnCards.classList.remove(c));
        activeClasses.forEach(c => btnCards.classList.add(c));
        activeClasses.forEach(c => btnLista.classList.remove(c));
        inactiveClasses.forEach(c => btnLista.classList.add(c));
        viewCards.classList.remove('hidden');
        viewLista.classList.add('hidden');
    } else {
        inactiveClasses.forEach(c => btnLista.classList.remove(c));
        activeClasses.forEach(c => btnLista.classList.add(c));
        activeClasses.forEach(c => btnCards.classList.remove(c));
        inactiveClasses.forEach(c => btnCards.classList.add(c));
        viewLista.classList.remove('hidden');
        viewCards.classList.add('hidden');
    }
    
    renderizarProspeccoes(todasProspeccoes);
}

function aplicarFiltros() {
    const filtroEmpresa = document.getElementById('filtroEmpresa').value.toLowerCase();
    const filtroConsultor = document.getElementById('filtroConsultor').value;
    const filtroResultado = document.getElementById('filtroResultado').value;
    const filtroStatus = document.getElementById('filtroStatus').value;
    
    let prospeccoesFiltradas = todasProspeccoes.filter(prosp => {
        const empresaNome = (prosp.empresa?.empresa || prosp.empresa_nome || '').toLowerCase();
        const consultorId = prosp.consultor?.id || prosp.consultor_id;
        
        const matchEmpresa = !filtroEmpresa || empresaNome.includes(filtroEmpresa);
        const matchConsultor = !filtroConsultor || consultorId == filtroConsultor;
        const matchResultado = !filtroResultado || prosp.resultado === filtroResultado;
        const matchStatus = !filtroStatus || prosp.status_follow_up === filtroStatus;
        
        return matchEmpresa && matchConsultor && matchResultado && matchStatus;
    });
    
    renderizarProspeccoes(prospeccoesFiltradas);
}

function limparFiltros() {
    document.getElementById('filtroEmpresa').value = '';
    document.getElementById('filtroConsultor').value = '';
    document.getElementById('filtroResultado').value = '';
    document.getElementById('filtroStatus').value = '';
    renderizarProspeccoes(todasProspeccoes);
}

function renderizarProspeccoes(prospeccoes) {
    if (visualizacaoAtual === 'cards') {
        mostrarProspeccoesCards(prospeccoes);
    } else {
        mostrarProspeccoesLista(prospeccoes);
    }
}

async function carregarProspeccoes() {
    console.log('=== INICIANDO carregarProspeccoes ===');
    console.log('Usuario atual:', usuario);
    try {
        console.log('Fazendo requisição para /api/prospeccoes/...');
        const response = await apiRequest('/api/prospeccoes/');
        
        if (!response) {
            console.error('Resposta nula - sessão expirada');
            const errorMsg = `
                <div class="col-span-full text-center py-12">
                    <div class="text-red-400 mb-4">
                        <i class="fas fa-exclamation-circle text-4xl"></i>
                    </div>
                    <p class="text-lg font-medium text-red-400 mb-2">Sessão expirada</p>
                    <p class="text-slate-400 text-sm mb-4">Faça login novamente para continuar</p>
                    <a href="/" class="btn-primary text-white px-4 py-2 rounded-lg inline-block">Fazer Login</a>
                </div>`;
            document.getElementById('viewCards').innerHTML = errorMsg;
            document.getElementById('listaProspeccoesTable').innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center">${errorMsg}</td></tr>`;
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na API:', response.status, errorText);
            const errorMsg = `
                <div class="col-span-full text-center py-12">
                    <div class="text-red-400 mb-4">
                        <i class="fas fa-server text-4xl"></i>
                    </div>
                    <p class="text-lg font-medium text-red-400 mb-2">Erro ao carregar prospecções</p>
                    <p class="text-slate-400 text-sm mb-4">Código: ${response.status}</p>
                    <button onclick="carregarProspeccoes()" class="btn-primary text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-sync-alt mr-2"></i>Tentar novamente
                    </button>
                </div>`;
            document.getElementById('viewCards').innerHTML = errorMsg;
            document.getElementById('listaProspeccoesTable').innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center">${errorMsg}</td></tr>`;
            return;
        }
        
        todasProspeccoes = await response.json();
        console.log('Prospecções carregadas:', todasProspeccoes.length);
        console.log('Dados recebidos:', todasProspeccoes);
        
        await carregarConsultoresParaFiltro();
        console.log('Chamando renderizarProspeccoes...');
        renderizarProspeccoes(todasProspeccoes);
        console.log('=== carregarProspeccoes CONCLUÍDO ===');
    } catch (error) {
        console.error('Erro ao carregar prospecções:', error);
        const errorMsg = `
            <div class="col-span-full text-center py-12">
                <div class="text-red-400 mb-4">
                    <i class="fas fa-wifi text-4xl"></i>
                </div>
                <p class="text-lg font-medium text-red-400 mb-2">Erro de conexão</p>
                <p class="text-slate-400 text-sm mb-4">Verifique sua conexão e tente novamente</p>
                <button onclick="carregarProspeccoes()" class="btn-primary text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-sync-alt mr-2"></i>Tentar novamente
                </button>
            </div>`;
        document.getElementById('viewCards').innerHTML = errorMsg;
        document.getElementById('listaProspeccoesTable').innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center">${errorMsg}</td></tr>`;
    }
}

async function carregarConsultoresParaFiltro() {
    try {
        const response = await apiRequest('/api/admin/usuarios');
        if (!response || !response.ok) {
            console.log('Usuário não é admin - filtro de consultores desabilitado');
            return;
        }
        const usuarios = await response.json();
        
        const consultores = usuarios.filter(u => u.tipo === 'consultor' || u.tipo === 'admin');
        const select = document.getElementById('filtroConsultor');
        if (select) {
            select.innerHTML = '<option value="">Todos</option>';
            consultores.forEach(consultor => {
                const option = document.createElement('option');
                option.value = consultor.id;
                option.textContent = consultor.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar consultores:', error);
    }
}

let prospeccaoEditandoId = null;
let prospeccaoEditandoCodigo = null;

function getResultadoBadge(resultado) {
    if (!resultado) return '<span class="badge badge-gray">-</span>';
    if (resultado.includes('Interesse') && !resultado.includes('Sem')) return '<span class="badge badge-success">Interesse</span>';
    if (resultado.includes('Sem interesse')) return '<span class="badge badge-danger">Sem interesse</span>';
    if (resultado.includes('Retornar')) return '<span class="badge badge-warning">Retornar</span>';
    if (resultado.includes('Não atendeu')) return '<span class="badge badge-gray">Não atendeu</span>';
    if (resultado.includes('Número inválido')) return '<span class="badge badge-danger">Inválido</span>';
    return `<span class="badge badge-info">${resultado}</span>`;
}

function getStatusBadge(status) {
    if (!status) return '<span class="badge badge-gray">-</span>';
    if (status.includes('Aguardando')) return '<span class="badge badge-warning">Aguardando</span>';
    if (status.includes('negociação')) return '<span class="badge badge-purple">Negociação</span>';
    if (status.includes('proposta') || status.includes('Proposta')) return '<span class="badge badge-info">Proposta</span>';
    if (status.includes('Fechado')) return '<span class="badge badge-success">Fechado</span>';
    if (status.includes('Perdido')) return '<span class="badge badge-danger">Perdido</span>';
    return `<span class="badge badge-gray">${status}</span>`;
}

function getPotencialBadge(potencial) {
    if (!potencial) return '<span class="text-slate-500 text-xs">-</span>';
    if (potencial === 'Muito Alto') return '<span class="badge badge-success">Muito Alto</span>';
    if (potencial === 'Alto') return '<span class="badge badge-cyan">Alto</span>';
    if (potencial === 'Médio') return '<span class="badge badge-warning">Médio</span>';
    if (potencial === 'Baixo') return '<span class="badge badge-gray">Baixo</span>';
    return `<span class="badge badge-gray">${potencial}</span>`;
}

function updateStats(prospeccoes) {
    try {
        const totalEl = document.getElementById('totalProspeccoes');
        const interesseEl = document.getElementById('totalInteresse');
        const retornarEl = document.getElementById('totalRetornar');
        const negociacaoEl = document.getElementById('totalNegociacao');
        
        if (totalEl) totalEl.textContent = prospeccoes.length;
        if (interesseEl) interesseEl.textContent = prospeccoes.filter(p => p.resultado && p.resultado.includes('Interesse') && !p.resultado.includes('Sem')).length;
        if (retornarEl) retornarEl.textContent = prospeccoes.filter(p => p.resultado && p.resultado.includes('Retornar')).length;
        if (negociacaoEl) negociacaoEl.textContent = prospeccoes.filter(p => p.status_follow_up && p.status_follow_up.includes('negociação')).length;
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

function mostrarProspeccoesLista(prospeccoes) {
    console.log('=== mostrarProspeccoesLista chamada ===');
    console.log('Quantidade de prospecções:', prospeccoes ? prospeccoes.length : 'null/undefined');
    
    const tbody = document.getElementById('listaProspeccoesTable');
    if (!tbody) {
        console.error('ERRO: Elemento listaProspeccoesTable não encontrado!');
        return;
    }
    
    try {
        updateStats(prospeccoes);
    } catch (e) {
        console.error('Erro em updateStats:', e);
    }
    
    if (!prospeccoes || prospeccoes.length === 0) {
        console.log('Nenhuma prospecção - exibindo mensagem vazia');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-4 py-12 text-center">
                    <div class="text-slate-400">
                        <i class="fas fa-phone-slash text-5xl mb-4 opacity-50"></i>
                        <p class="text-lg font-medium mb-2">Nenhuma prospecção encontrada</p>
                        <p class="text-sm text-slate-500 mb-4">Clique no botão acima para registrar uma nova ligação</p>
                        <button onclick="showNovaProspeccaoModal()" class="btn-primary text-white px-5 py-2.5 rounded-lg inline-flex items-center gap-2">
                            <i class="fas fa-plus"></i> Nova Prospecção
                        </button>
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    console.log('Renderizando', prospeccoes.length, 'prospecções...');
    
    tbody.innerHTML = prospeccoes.map(prosp => {
        const empresaNome = prosp.empresa?.empresa || prosp.empresa_nome || 'N/A';
        const empresaMunicipio = prosp.empresa?.municipio || prosp.municipio || '';
        const empresaEstado = prosp.empresa?.estado || prosp.estado || '';
        const localizacao = empresaMunicipio && empresaEstado ? `${empresaMunicipio}-${empresaEstado}` : '';
        const consultorNome = prosp.consultor?.nome || prosp.consultor_nome || 'N/A';
        const codigo = prosp.codigo || '-';
        const observacoes = prosp.observacoes || '-';
        const obsPreview = observacoes.length > 60 ? observacoes.substring(0, 60) + '...' : observacoes;
        
        return `
            <tr class="group">
                <td class="px-4 py-3 align-middle">
                    <button onclick="abrirEditarProspeccao(${prosp.id})" class="text-blue-400 hover:text-blue-300 text-xs font-mono transition-colors" title="Clique para editar">
                        ${codigo}
                    </button>
                </td>
                <td class="px-4 py-3 align-middle">
                    <div class="text-slate-100 text-sm font-medium truncate max-w-[180px]" title="${empresaNome}">${empresaNome}</div>
                    ${localizacao ? `<div class="text-slate-500 text-xs truncate">${localizacao}</div>` : ''}
                </td>
                <td class="px-4 py-3 text-slate-300 text-sm truncate align-middle max-w-[120px]" title="${consultorNome}">${consultorNome}</td>
                <td class="px-4 py-3 text-slate-300 text-sm align-middle whitespace-nowrap">
                    ${prosp.data_ligacao ? `<span class="text-slate-400">${prosp.data_ligacao.slice(0,10).split('-').reverse().join('/')}</span>` : '<span class="text-slate-600">-</span>'}
                </td>
                <td class="px-4 py-3 align-middle">${getResultadoBadge(prosp.resultado)}</td>
                <td class="px-4 py-3 align-middle">${getStatusBadge(prosp.status_follow_up)}</td>
                <td class="px-4 py-3 align-middle">${getPotencialBadge(prosp.potencial_negocio)}</td>
                <td class="px-4 py-3 align-middle hidden lg:table-cell">
                    <div class="text-xs text-slate-400 leading-relaxed max-w-[200px] truncate" title="${observacoes}">${obsPreview}</div>
                </td>
                <td class="px-4 py-3 align-middle">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="abrirEditarProspeccao(${prosp.id})" class="btn-icon btn-icon-sm bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="abrirHistorico(${prosp.id}, '${codigo}')" class="btn-icon btn-icon-sm bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white transition-all" title="Histórico">
                            <i class="fas fa-history"></i>
                        </button>
                        <button onclick="exportarPDF(${prosp.id})" class="btn-icon btn-icon-sm bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all" title="PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function abrirEditarProspeccao(prospeccaoId) {
    try {
        const response = await apiRequest(`/api/prospeccoes/${prospeccaoId}`);
        const prosp = await response.json();
        
        prospeccaoEditandoId = prosp.id;
        prospeccaoEditandoCodigo = prosp.codigo;
        
        document.getElementById('edit_prospeccao_id').value = prosp.id;
        document.getElementById('editCodigoDisplay').textContent = `Código: ${prosp.codigo}`;
        document.getElementById('edit_empresa_nome').value = prosp.empresa?.empresa || '';
        document.getElementById('edit_consultor_nome').value = prosp.consultor?.nome || '';
        document.getElementById('edit_nome_contato').value = prosp.nome_contato || '';
        document.getElementById('edit_cargo_contato').value = prosp.cargo_contato || '';
        document.getElementById('edit_telefone_contato').value = prosp.telefone_contato || '';
        document.getElementById('edit_email_contato').value = prosp.email_contato || '';
        
        const { date: currentDate, time: currentTime } = getCurrentDateTimeForInputs();
        
        let dataLigacaoValue = currentDate;
        if (prosp.data_ligacao && prosp.data_ligacao.length >= 10) {
            dataLigacaoValue = prosp.data_ligacao.slice(0, 10);
        }
        
        let horaLigacaoValue = currentTime;
        if (prosp.hora_ligacao && prosp.hora_ligacao.length >= 5) {
            horaLigacaoValue = prosp.hora_ligacao.slice(0, 5);
        }
        
        document.getElementById('edit_data_ligacao').value = dataLigacaoValue;
        document.getElementById('edit_hora_ligacao').value = horaLigacaoValue;
        
        document.getElementById('edit_resultado').value = prosp.resultado || '';
        document.getElementById('edit_potencial_negocio').value = prosp.potencial_negocio || '';
        document.getElementById('edit_status_follow_up').value = prosp.status_follow_up || '';
        document.getElementById('edit_observacoes').value = prosp.observacoes || '';
        
        document.getElementById('editarProspeccaoModal').classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao carregar prospecção:', error);
        alert('Erro ao carregar prospecção para edição');
    }
}

function hideEditarProspeccaoModal() {
    document.getElementById('editarProspeccaoModal').classList.add('hidden');
    document.getElementById('editarProspeccaoForm').reset();
    prospeccaoEditandoId = null;
    prospeccaoEditandoCodigo = null;
}

const editarProspeccaoForm = document.getElementById('editarProspeccaoForm');
if (editarProspeccaoForm) {
    editarProspeccaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!prospeccaoEditandoId) {
            alert('Erro: ID da prospecção não encontrado');
            return;
        }
        
        const dados = {
            nome_contato: document.getElementById('edit_nome_contato')?.value || null,
            cargo_contato: document.getElementById('edit_cargo_contato')?.value || null,
            telefone_contato: document.getElementById('edit_telefone_contato')?.value || null,
            email_contato: document.getElementById('edit_email_contato')?.value || null,
            data_ligacao: document.getElementById('edit_data_ligacao')?.value || null,
            hora_ligacao: document.getElementById('edit_hora_ligacao')?.value || null,
            resultado: document.getElementById('edit_resultado')?.value || null,
            potencial_negocio: document.getElementById('edit_potencial_negocio')?.value || null,
            status_follow_up: document.getElementById('edit_status_follow_up')?.value || null,
            observacoes: document.getElementById('edit_observacoes')?.value || null
        };
        
        try {
            const response = await apiRequest(`/api/prospeccoes/${prospeccaoEditandoId}`, {
                method: 'PUT',
                body: JSON.stringify(dados)
            });
            
            if (!response.ok) throw new Error('Erro ao atualizar prospecção');
            
            alert('Prospecção atualizada com sucesso! As alterações foram salvas no histórico.');
            hideEditarProspeccaoModal();
            carregarProspeccoes();
        } catch (error) {
            console.error('Erro ao atualizar prospecção:', error);
            alert('Erro ao atualizar prospecção');
        }
    });
}

function verHistorico() {
    if (prospeccaoEditandoId && prospeccaoEditandoCodigo) {
        abrirHistorico(prospeccaoEditandoId, prospeccaoEditandoCodigo);
    }
}

async function abrirHistorico(prospeccaoId, codigo) {
    document.getElementById('historicoCodigoDisplay').textContent = `Código: ${codigo}`;
    document.getElementById('historicoContent').innerHTML = '<div class="text-center py-8 text-gray-400">Carregando histórico...</div>';
    document.getElementById('historicoModal').classList.remove('hidden');
    
    try {
        const response = await apiRequest(`/api/prospeccoes/${prospeccaoId}/historico`);
        const historico = await response.json();
        
        if (historico.length === 0) {
            document.getElementById('historicoContent').innerHTML = '<div class="text-center py-8 text-gray-400">Nenhuma alteração registrada ainda.</div>';
            return;
        }
        
        const html = historico.map(h => {
            const data = new Date(h.data_alteracao).toLocaleString('pt-BR');
            const usuarioNome = h.usuario?.nome || 'Usuário desconhecido';
            
            let tipoIcon = '';
            let tipoBg = '';
            switch(h.tipo_alteracao) {
                case 'criacao':
                    tipoIcon = '<i class="fas fa-plus-circle text-green-400"></i>';
                    tipoBg = 'border-l-green-500';
                    break;
                case 'edicao':
                    tipoIcon = '<i class="fas fa-edit text-blue-400"></i>';
                    tipoBg = 'border-l-blue-500';
                    break;
                case 'agendamento':
                    tipoIcon = '<i class="fas fa-calendar text-yellow-400"></i>';
                    tipoBg = 'border-l-yellow-500';
                    break;
                default:
                    tipoIcon = '<i class="fas fa-info-circle text-gray-400"></i>';
                    tipoBg = 'border-l-gray-500';
            }
            
            let detalhes = '';
            if (h.campo_alterado) {
                detalhes = `
                    <div class="mt-2 text-sm">
                        <span class="text-gray-400">Campo:</span> <span class="text-white">${h.campo_alterado}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div class="bg-red-900/20 p-2 rounded">
                            <span class="text-red-400">Anterior:</span>
                            <div class="text-gray-300 mt-1">${h.valor_anterior || '-'}</div>
                        </div>
                        <div class="bg-green-900/20 p-2 rounded">
                            <span class="text-green-400">Novo:</span>
                            <div class="text-gray-300 mt-1">${h.valor_novo || '-'}</div>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="bg-dark-card p-4 rounded-lg border-l-4 ${tipoBg}">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center gap-2">
                            ${tipoIcon}
                            <span class="text-white font-medium capitalize">${h.tipo_alteracao}</span>
                        </div>
                        <span class="text-gray-500 text-xs">${data}</span>
                    </div>
                    <div class="text-gray-400 text-sm mt-1">por ${usuarioNome}</div>
                    ${h.descricao ? `<div class="text-gray-300 text-sm mt-2">${h.descricao}</div>` : ''}
                    ${detalhes}
                </div>
            `;
        }).join('');
        
        document.getElementById('historicoContent').innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        document.getElementById('historicoContent').innerHTML = '<div class="text-center py-8 text-red-400">Erro ao carregar histórico</div>';
    }
}

function hideHistoricoModal() {
    document.getElementById('historicoModal').classList.add('hidden');
}

function getCardAccentClass(resultado) {
    if (!resultado) return '';
    if (resultado.includes('Interesse') && !resultado.includes('Sem')) return 'card-accent-green';
    if (resultado.includes('Sem interesse')) return 'card-accent-red';
    if (resultado.includes('Retornar')) return 'card-accent-yellow';
    return 'card-accent-blue';
}

function mostrarProspeccoesCards(prospeccoes) {
    const container = document.getElementById('viewCards');
    
    updateStats(prospeccoes);
    
    if (prospeccoes.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-slate-400">
                    <i class="fas fa-phone-slash text-5xl mb-4 opacity-50"></i>
                    <p class="text-lg font-medium mb-2">Nenhuma prospecção encontrada</p>
                    <p class="text-sm text-slate-500 mb-4">Clique no botão acima para registrar uma nova ligação</p>
                    <button onclick="showNovaProspeccaoModal()" class="btn-primary text-white px-5 py-2.5 rounded-lg inline-flex items-center gap-2">
                        <i class="fas fa-plus"></i> Nova Prospecção
                    </button>
                </div>
            </div>`;
        return;
    }
    
    let html = '';
    prospeccoes.forEach(prosp => {
        const empresaNome = prosp.empresa?.empresa || prosp.empresa_nome || 'N/A';
        const empresaMunicipio = prosp.empresa?.municipio || prosp.municipio || '';
        const empresaEstado = prosp.empresa?.estado || prosp.estado || '';
        const localizacao = empresaMunicipio && empresaEstado ? `${empresaMunicipio} - ${empresaEstado}` : '';
        const consultorNome = prosp.consultor?.nome || prosp.consultor_nome || 'N/A';
        const codigo = prosp.codigo || '-';
        const accentClass = getCardAccentClass(prosp.resultado);
        const obsPreview = prosp.observacoes ? (prosp.observacoes.length > 100 ? prosp.observacoes.substring(0, 100) + '...' : prosp.observacoes) : '';
        
        html += `
            <div class="card-modern ${accentClass} p-5">
                <!-- Header -->
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-bold text-slate-100 truncate mb-1">${empresaNome}</h3>
                        ${localizacao ? `<p class="text-slate-500 text-xs flex items-center gap-1"><i class="fas fa-map-marker-alt"></i> ${localizacao}</p>` : ''}
                    </div>
                    <span class="text-blue-400 text-xs font-mono bg-blue-500/10 px-2 py-1 rounded">${codigo}</span>
                </div>
                
                <!-- Info Grid -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="bg-slate-800/30 rounded-lg p-3">
                        <p class="text-slate-500 text-xs uppercase tracking-wide mb-1">Consultor</p>
                        <p class="text-slate-200 text-sm font-medium truncate">${consultorNome}</p>
                    </div>
                    <div class="bg-slate-800/30 rounded-lg p-3">
                        <p class="text-slate-500 text-xs uppercase tracking-wide mb-1">Data</p>
                        <p class="text-slate-200 text-sm font-medium">${prosp.data_ligacao ? prosp.data_ligacao.slice(0,10).split('-').reverse().join('/') : '-'}</p>
                    </div>
                </div>
                
                <!-- Badges -->
                <div class="flex flex-wrap gap-2 mb-4">
                    ${getResultadoBadge(prosp.resultado)}
                    ${getStatusBadge(prosp.status_follow_up)}
                    ${getPotencialBadge(prosp.potencial_negocio)}
                </div>
                
                <!-- Observações -->
                ${obsPreview ? `
                <div class="bg-slate-800/20 rounded-lg p-3 mb-4">
                    <p class="text-slate-400 text-xs leading-relaxed">${obsPreview}</p>
                </div>
                ` : ''}
                
                <!-- Actions -->
                <div class="flex items-center justify-between pt-3 border-t border-slate-700/50">
                    <div class="flex gap-2">
                        <button onclick="abrirEditarProspeccao(${prosp.id})" class="btn-icon bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="abrirHistorico(${prosp.id}, '${codigo}')" class="btn-icon bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white transition-all" title="Histórico">
                            <i class="fas fa-history"></i>
                        </button>
                    </div>
                    <button onclick="exportarPDF(${prosp.id})" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium transition-all">
                        <i class="fas fa-file-pdf"></i>
                        <span>PDF</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function exportarPDF(prospeccaoId) {
    try {
        const response = await fetch(`/api/prospeccoes/export-pdf/${prospeccaoId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erro ao exportar PDF');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prospeccao_${prospeccaoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('PDF exportado com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF');
    }
}

let empresaSelecionada = null;

const empresaSearchInput = document.getElementById('empresa_search');
const empresaAutocomplete = document.getElementById('empresa_autocomplete');
const empresaIdInput = document.getElementById('empresa_id');

let searchTimeout;

if (empresaSearchInput && empresaAutocomplete && empresaIdInput) {
    empresaSearchInput.addEventListener('input', async function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            empresaAutocomplete.classList.add('hidden');
            empresaIdInput.value = '';
            empresaSelecionada = null;
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await apiRequest(`/api/empresas/?nome=${encodeURIComponent(query)}&page_size=10`);
                const data = await response.json();
                const empresas = data.items || [];
                
                if (empresas.length === 0) {
                    empresaAutocomplete.innerHTML = '<div class="p-3 text-gray-400 text-sm">Nenhuma empresa encontrada</div>';
                    empresaAutocomplete.classList.remove('hidden');
                    return;
                }
                
                empresaAutocomplete.innerHTML = '';
                empresas.forEach(empresa => {
                    const div = document.createElement('div');
                    div.className = 'p-3 hover:bg-dark-hover cursor-pointer border-b border-gray-700 last:border-0';
                    div.dataset.empresaId = empresa.id;
                    
                    const nomeDiv = document.createElement('div');
                    nomeDiv.className = 'text-white font-medium';
                    nomeDiv.textContent = empresa.empresa;
                    
                    const localDiv = document.createElement('div');
                    localDiv.className = 'text-gray-400 text-sm';
                    localDiv.textContent = `${empresa.municipio || 'N/A'} - ${empresa.estado || 'N/A'}`;
                    
                    div.appendChild(nomeDiv);
                    div.appendChild(localDiv);
                    
                    div.addEventListener('click', () => {
                        selecionarEmpresa(empresa.id, empresa.empresa, empresa.municipio || '');
                    });
                    
                    empresaAutocomplete.appendChild(div);
                });
                
                empresaAutocomplete.classList.remove('hidden');
            } catch (error) {
                console.error('Erro ao buscar empresas:', error);
            }
        }, 300);
    });

    empresaSearchInput.addEventListener('blur', function() {
        setTimeout(() => {
            empresaAutocomplete.classList.add('hidden');
        }, 200);
    });

    empresaSearchInput.addEventListener('focus', function() {
        if (empresaAutocomplete.innerHTML && !empresaAutocomplete.classList.contains('hidden')) {
            empresaAutocomplete.classList.remove('hidden');
        }
    });
}

async function selecionarEmpresa(id, nome, municipio) {
    empresaSelecionada = { id, nome, municipio };
    empresaSearchInput.value = `${nome} - ${municipio || 'N/A'}`;
    empresaIdInput.value = id;
    empresaAutocomplete.classList.add('hidden');
    
    await preencherDadosContato(id);
}

async function preencherDadosContato(empresaId) {
    try {
        const response = await apiRequest(`/api/empresas/${empresaId}/ultimo-contato`);
        if (!response || !response.ok) return;
        
        const dados = await response.json();
        
        if (dados.tem_contato) {
            const nomeContatoInput = document.getElementById('nome_contato');
            const cargoContatoInput = document.getElementById('cargo_contato');
            const telefoneContatoInput = document.getElementById('telefone_contato');
            const emailContatoInput = document.getElementById('email_contato');
            
            if (dados.nome_contato && nomeContatoInput && !nomeContatoInput.value) {
                nomeContatoInput.value = dados.nome_contato;
            }
            if (dados.cargo_contato && cargoContatoInput && !cargoContatoInput.value) {
                cargoContatoInput.value = dados.cargo_contato;
            }
            if (dados.telefone_contato && telefoneContatoInput && !telefoneContatoInput.value) {
                telefoneContatoInput.value = dados.telefone_contato;
            }
            if (dados.email_contato && emailContatoInput && !emailContatoInput.value) {
                emailContatoInput.value = dados.email_contato;
            }
            
            const dadosPreenchidos = [
                dados.nome_contato ? 'Nome' : null,
                dados.cargo_contato ? 'Cargo' : null,
                dados.telefone_contato ? 'Telefone' : null,
                dados.email_contato ? 'E-mail' : null
            ].filter(Boolean);
            
            if (dadosPreenchidos.length > 0) {
                console.log(`Dados do contato preenchidos automaticamente: ${dadosPreenchidos.join(', ')}`);
            }
        }
    } catch (error) {
        console.error('Erro ao buscar dados do contato:', error);
    }
}

function getCurrentDateTimeForInputs() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
    };
}

function showNovaProspeccaoModal() {
    if (!usuario) {
        alert('Sessão expirada. Faça login novamente.');
        window.location.href = '/';
        return;
    }
    
    if (usuario.tipo === 'admin') {
        carregarConsultores();
    } else {
        document.getElementById('consultorDiv').style.display = 'none';
        document.getElementById('consultor_id').value = usuario.id;
    }
    
    const { date, time } = getCurrentDateTimeForInputs();
    document.getElementById('data_ligacao').value = date;
    document.getElementById('hora_ligacao').value = time;
    
    document.getElementById('novaProspeccaoModal').classList.remove('hidden');
}

function hideNovaProspeccaoModal() {
    document.getElementById('novaProspeccaoModal').classList.add('hidden');
    document.getElementById('novaProspeccaoForm').reset();
    document.getElementById('agendamentoOptions').classList.add('hidden');
    document.getElementById('data_proxima_ligacao').required = false;
    document.getElementById('data_proxima_ligacao').value = '';
    empresaSearchInput.value = '';
    empresaIdInput.value = '';
    empresaSelecionada = null;
    empresaAutocomplete.classList.add('hidden');
}


async function carregarConsultores() {
    try {
        const response = await apiRequest('/api/admin/usuarios');
        if (!response || !response.ok) {
            console.error('Erro ao carregar consultores - resposta inválida');
            return;
        }
        const usuarios = await response.json();
        
        const consultores = usuarios.filter(u => u.tipo === 'consultor' || u.tipo === 'admin');
        const select = document.getElementById('consultor_id');
        if (select) {
            select.innerHTML = '<option value="">Selecione um consultor...</option>';
            consultores.forEach(consultor => {
                const option = document.createElement('option');
                option.value = consultor.id;
                option.textContent = consultor.nome;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar consultores:', error);
    }
}

const novaProspeccaoForm = document.getElementById('novaProspeccaoForm');
if (novaProspeccaoForm) {
    novaProspeccaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!usuario) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/';
            return;
        }
        
        const empresaIdValue = document.getElementById('empresa_id')?.value;
        if (!empresaIdValue || isNaN(parseInt(empresaIdValue))) {
            alert('Por favor, selecione uma empresa da lista de sugestões');
            return;
        }
        
        const consultorId = usuario.tipo === 'admin' ? 
            parseInt(document.getElementById('consultor_id')?.value) : 
            usuario.id;
        
        const agendarProxima = document.getElementById('agendar_proxima')?.checked;
        const dataProxima = document.getElementById('data_proxima_ligacao')?.value;
        
        if (agendarProxima && !dataProxima) {
            alert('Por favor, selecione a data da próxima ligação');
            return;
        }
        
        const getCheckboxValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.checked : false;
        };
        
        const getInputValue = (id) => {
            const element = document.getElementById(id);
            return element ? (element.value || null) : null;
        };
        
        const prospeccaoData = {
            empresa_id: parseInt(document.getElementById('empresa_id')?.value),
            consultor_id: consultorId,
            data_ligacao: getInputValue('data_ligacao'),
            hora_ligacao: getInputValue('hora_ligacao'),
            resultado: getInputValue('resultado'),
            observacoes: getInputValue('observacoes'),
            
            nome_contato: getInputValue('nome_contato'),
            telefone_contato: getInputValue('telefone_contato'),
            email_contato: getInputValue('email_contato'),
            cargo_contato: getInputValue('cargo_contato'),
            
            interesse_treinamento: getCheckboxValue('interesse_treinamento'),
            interesse_consultoria: getCheckboxValue('interesse_consultoria'),
            interesse_certificacao: getCheckboxValue('interesse_certificacao'),
            interesse_eventos: getCheckboxValue('interesse_eventos'),
            interesse_produtos: getCheckboxValue('interesse_produtos'),
            interesse_seguranca: getCheckboxValue('interesse_seguranca'),
            interesse_meio_ambiente: getCheckboxValue('interesse_meio_ambiente'),
            outros_interesses: getInputValue('outros_interesses'),
            
            potencial_negocio: getInputValue('potencial_negocio'),
            status_follow_up: getInputValue('status_follow_up')
        };
        
        try {
            const url = agendarProxima ? 
                `/api/prospeccoes/com-agendamento?agendar_proxima=true&data_proxima_ligacao=${dataProxima}` :
                '/api/prospeccoes/';
            
            const response = await apiRequest(url, {
                method: 'POST',
                body: JSON.stringify(prospeccaoData)
            });
            
            if (!response.ok) throw new Error('Erro ao criar prospecção');
            
            alert(agendarProxima ? 'Prospecção criada e próxima ligação agendada!' : 'Prospecção criada com sucesso!');
            hideNovaProspeccaoModal();
            carregarProspeccoes();
        } catch (error) {
            console.error('Erro ao criar prospecção:', error);
            alert('Erro ao criar prospecção');
        }
    });
}

// Timeout de segurança - se demorar mais de 10 segundos, mostra erro
const loadingTimeout = setTimeout(() => {
    const tbody = document.getElementById('listaProspeccoesTable');
    const viewCards = document.getElementById('viewCards');
    if (tbody && tbody.innerHTML.includes('Carregando')) {
        console.error('TIMEOUT: Carregamento demorou muito');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="px-4 py-8 text-center">
                    <div class="text-amber-400">
                        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                        <p class="text-lg font-medium mb-2">Carregamento lento</p>
                        <p class="text-slate-400 text-sm mb-4">O carregamento está demorando. Tente recarregar a página.</p>
                        <button onclick="location.reload()" class="btn-primary text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-sync-alt mr-2"></i>Recarregar
                        </button>
                    </div>
                </td>
            </tr>`;
    }
}, 10000);

carregarProspeccoes().finally(() => clearTimeout(loadingTimeout));

async function verificarParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const empresaId = urlParams.get('empresa_id');
    const consultorIdParam = urlParams.get('consultor_id');
    
    if (empresaId) {
        try {
            const response = await apiRequest(`/api/empresas/${empresaId}`);
            if (response.ok) {
                const empresa = await response.json();
                empresaIdInput.value = empresa.id;
                empresaSearchInput.value = `${empresa.empresa} - ${empresa.municipio || 'N/A'}`;
                empresaSelecionada = { id: empresa.id, nome: empresa.empresa, municipio: empresa.municipio };
            }
        } catch (error) {
            console.error('Erro ao carregar empresa dos parâmetros:', error);
        }
    }
    
    if (consultorIdParam && usuario && usuario.tipo === 'admin') {
        await carregarConsultores();
        const select = document.getElementById('consultor_id');
        if (select) {
            select.value = consultorIdParam;
        }
    }
    
    if (empresaId || consultorIdParam) {
        showNovaProspeccaoModal();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

verificarParametrosURL();
