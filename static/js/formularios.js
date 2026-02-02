let formularios = [];
let envios = [];
let empresas = [];
let perguntaCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    carregarFormularios();
    carregarEnvios();
    carregarEmpresas();
});

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
        });
    });
}

function abrirModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.body.style.overflow = '';
}

function abrirModalNovoFormulario() {
    document.getElementById('tituloFormulario').value = '';
    document.getElementById('descricaoFormulario').value = '';
    document.getElementById('listaPerguntas').innerHTML = '';
    perguntaCount = 0;
    abrirModal('modalNovoFormulario');
}

async function carregarFormularios() {
    try {
        const response = await fetch('/api/formularios/', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            formularios = await response.json();
            renderizarFormularios();
            atualizarEstatisticas();
        }
    } catch (error) {
        console.error('Erro ao carregar formulários:', error);
    }
}

async function carregarEnvios() {
    try {
        const response = await fetch('/api/formularios/envios/', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            envios = await response.json();
            renderizarEnvios();
            renderizarRespostas();
            atualizarBadges();
        }
    } catch (error) {
        console.error('Erro ao carregar envios:', error);
    }
}

async function carregarEmpresas() {
    try {
        const response = await fetch('/api/empresas/', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            empresas = await response.json();
            const select = document.getElementById('empresaDestinatario');
            if (select) {
                select.innerHTML = '<option value="">Selecione uma empresa</option>';
                empresas.forEach(emp => {
                    const nomeEmpresa = emp.empresa || emp.razao_social || 'Empresa sem nome';
                    select.innerHTML += `<option value="${emp.id}">${nomeEmpresa}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar empresas:', error);
    }
}

function atualizarBadges() {
    const pendentes = envios.filter(e => !e.respondido).length;
    const respondidos = envios.filter(e => e.respondido).length;
    
    const badgeEnvios = document.getElementById('badgeEnvios');
    const badgeRespostas = document.getElementById('badgeRespostas');
    
    if (pendentes > 0) {
        badgeEnvios.textContent = pendentes;
        badgeEnvios.classList.remove('hidden');
    } else {
        badgeEnvios.classList.add('hidden');
    }
    
    if (respondidos > 0) {
        badgeRespostas.textContent = respondidos;
        badgeRespostas.classList.remove('hidden');
    } else {
        badgeRespostas.classList.add('hidden');
    }
}

function renderizarFormularios() {
    const lista = document.getElementById('listaFormularios');
    
    if (formularios.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="7" class="py-16">
                    <div class="flex flex-col items-center justify-center text-gray-500">
                        <div class="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                            <i class="fas fa-file-alt text-purple-400 text-2xl"></i>
                        </div>
                        <p class="text-gray-400 mb-4">Nenhum formulário cadastrado</p>
                        <button onclick="criarFormularioLideranca()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition text-sm font-medium">
                            <i class="fas fa-magic"></i>
                            Criar Formulário Padrão
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    lista.innerHTML = formularios.map(form => `
        <tr class="table-row-hover">
            <td class="py-4 px-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${form.tipo === 'padrao' ? 'from-purple-500/20 to-pink-500/20' : 'from-blue-500/20 to-cyan-500/20'} flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-clipboard-list ${form.tipo === 'padrao' ? 'text-purple-400' : 'text-blue-400'}"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="font-medium text-white truncate">${form.titulo}</p>
                        ${form.descricao ? `<p class="text-xs text-gray-500 truncate">${form.descricao}</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="py-4 px-4 hidden sm:table-cell">
                <span class="${form.tipo === 'padrao' ? 'badge-purple' : 'badge-info'} badge">
                    ${form.tipo === 'padrao' ? 'Padrão' : 'Personalizado'}
                </span>
            </td>
            <td class="py-4 px-4 text-center">
                <span class="text-gray-300 font-medium">${form.total_perguntas}</span>
            </td>
            <td class="py-4 px-4 text-center hidden md:table-cell">
                <span class="text-gray-300">${form.total_envios}</span>
            </td>
            <td class="py-4 px-4 text-center hidden md:table-cell">
                <span class="text-emerald-400 font-medium">${form.total_respostas}</span>
            </td>
            <td class="py-4 px-4 text-center">
                <span class="${form.ativo ? 'badge-success' : 'badge-gray'} badge">
                    ${form.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center justify-end gap-1">
                    <button onclick="verFormulario(${form.id})" class="btn-icon bg-purple-500/10 hover:bg-purple-500/20 text-purple-400" title="Visualizar">
                        <i class="fas fa-eye text-xs"></i>
                    </button>
                    <button onclick="abrirModalEnviar(${form.id})" class="btn-icon bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Gerar Link">
                        <i class="fas fa-paper-plane text-xs"></i>
                    </button>
                    <button onclick="verEstatisticas(${form.id})" class="btn-icon bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400" title="Estatísticas">
                        <i class="fas fa-chart-bar text-xs"></i>
                    </button>
                    <button onclick="exportarEstatisticasExcel(${form.id})" class="btn-icon bg-green-500/10 hover:bg-green-500/20 text-green-400" title="Exportar Excel">
                        <i class="fas fa-file-excel text-xs"></i>
                    </button>
                    <button onclick="excluirFormulario(${form.id})" class="btn-icon bg-red-500/10 hover:bg-red-500/20 text-red-400" title="Excluir">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderizarEnvios() {
    const lista = document.getElementById('listaEnvios');
    const enviosPendentes = envios.filter(e => !e.respondido);
    
    if (enviosPendentes.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="6" class="py-12">
                    <div class="flex flex-col items-center justify-center text-gray-500">
                        <i class="fas fa-paper-plane text-4xl mb-3 opacity-30"></i>
                        <p>Nenhum envio pendente</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    lista.innerHTML = enviosPendentes.map(envio => `
        <tr class="table-row-hover">
            <td class="py-4 px-4">
                <span class="text-white font-medium">${envio.formulario?.titulo || '-'}</span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                        <i class="fas fa-user text-gray-400 text-xs"></i>
                    </div>
                    <span class="text-gray-300">${envio.nome_destinatario || envio.email_destinatario || 'Anônimo'}</span>
                </div>
            </td>
            <td class="py-4 px-4 hidden md:table-cell">
                <span class="text-gray-400">${envio.empresa_nome || '-'}</span>
            </td>
            <td class="py-4 px-4 hidden sm:table-cell">
                <span class="text-gray-400 text-sm">${formatarData(envio.data_envio)}</span>
            </td>
            <td class="py-4 px-4 text-center">
                <span class="badge badge-warning">Aguardando</span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center justify-end">
                    <button onclick="copiarLinkEnvio('${envio.codigo_unico}')" class="btn-icon bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Copiar Link">
                        <i class="fas fa-copy text-xs"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderizarRespostas() {
    const lista = document.getElementById('listaRespostas');
    const enviosRespondidos = envios.filter(e => e.respondido);
    
    if (enviosRespondidos.length === 0) {
        lista.innerHTML = `
            <tr>
                <td colspan="5" class="py-12">
                    <div class="flex flex-col items-center justify-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-3 opacity-30"></i>
                        <p>Nenhuma resposta recebida</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    lista.innerHTML = enviosRespondidos.map(envio => `
        <tr class="table-row-hover">
            <td class="py-4 px-4">
                <span class="text-white font-medium">${envio.formulario?.titulo || '-'}</span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <i class="fas fa-check text-emerald-400 text-xs"></i>
                    </div>
                    <span class="text-gray-300">${envio.nome_destinatario || envio.email_destinatario || 'Anônimo'}</span>
                </div>
            </td>
            <td class="py-4 px-4 hidden md:table-cell">
                <span class="text-gray-400">${envio.empresa_nome || '-'}</span>
            </td>
            <td class="py-4 px-4 hidden sm:table-cell">
                <span class="text-gray-400 text-sm">${formatarData(envio.data_resposta)}</span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center justify-end">
                    <button onclick="verRespostas(${envio.id})" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition">
                        <i class="fas fa-eye"></i>
                        <span class="hidden sm:inline">Ver</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function atualizarEstatisticas() {
    document.getElementById('totalFormularios').textContent = formularios.length;
    
    const totalEnviados = formularios.reduce((acc, f) => acc + f.total_envios, 0);
    const totalRespondidos = formularios.reduce((acc, f) => acc + f.total_respostas, 0);
    
    document.getElementById('totalEnviados').textContent = totalEnviados;
    document.getElementById('totalRespondidos').textContent = totalRespondidos;
    
    const taxa = totalEnviados > 0 ? Math.round((totalRespondidos / totalEnviados) * 100) : 0;
    document.getElementById('taxaResposta').textContent = taxa + '%';
}

async function criarFormularioLideranca() {
    try {
        const response = await fetch('/api/formularios/seed-lideranca', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const result = await response.json();
            mostrarNotificacao(result.message, 'success');
            carregarFormularios();
        } else {
            const error = await response.json();
            mostrarNotificacao(error.detail || 'Erro ao criar formulário', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro de conexão', 'error');
    }
}

function adicionarPergunta() {
    perguntaCount++;
    const container = document.getElementById('listaPerguntas');
    
    const html = `
        <div class="pergunta-item" id="pergunta-${perguntaCount}">
            <div class="flex items-start justify-between gap-3 mb-3">
                <span class="flex items-center gap-2 text-sm font-medium text-purple-400">
                    <span class="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">${perguntaCount}</span>
                    Pergunta
                </span>
                <button type="button" onclick="removerPergunta(${perguntaCount})" class="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
            <div class="space-y-3">
                <input type="text" class="w-full input-modern-v2" placeholder="Texto da pergunta" id="pergunta-texto-${perguntaCount}" required>
                <div class="grid grid-cols-2 gap-3">
                    <select class="input-modern-v2" id="pergunta-tipo-${perguntaCount}" onchange="toggleOpcoes(${perguntaCount})">
                        <option value="escala">Escala (1-5)</option>
                        <option value="texto">Texto livre</option>
                        <option value="multipla_escolha">Múltipla escolha</option>
                    </select>
                    <input type="text" class="input-modern-v2" placeholder="Categoria" id="pergunta-categoria-${perguntaCount}">
                </div>
                <div id="opcoes-container-${perguntaCount}">
                    <div id="opcoes-${perguntaCount}" class="grid grid-cols-5 gap-2 mb-2"></div>
                    <button type="button" onclick="adicionarOpcaoEscala(${perguntaCount})" class="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        <i class="fas fa-magic"></i> Usar escala padrão
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
}

function removerPergunta(id) {
    document.getElementById(`pergunta-${id}`).remove();
}

function toggleOpcoes(perguntaId) {
    const tipo = document.getElementById(`pergunta-tipo-${perguntaId}`).value;
    const container = document.getElementById(`opcoes-container-${perguntaId}`);
    
    if (tipo === 'texto') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
    }
}

function adicionarOpcaoEscala(perguntaId) {
    const container = document.getElementById(`opcoes-${perguntaId}`);
    container.innerHTML = `
        <div class="opcao-escala"><span class="text-lg font-bold text-blue-400">1</span><span class="text-xs text-gray-500">Nunca</span></div>
        <div class="opcao-escala"><span class="text-lg font-bold text-blue-400">2</span><span class="text-xs text-gray-500">Raramente</span></div>
        <div class="opcao-escala"><span class="text-lg font-bold text-blue-400">3</span><span class="text-xs text-gray-500">Ocasional</span></div>
        <div class="opcao-escala"><span class="text-lg font-bold text-blue-400">4</span><span class="text-xs text-gray-500">Frequente</span></div>
        <div class="opcao-escala"><span class="text-lg font-bold text-emerald-400">5</span><span class="text-xs text-gray-500">Muito freq.</span></div>
    `;
}

async function salvarFormulario() {
    const titulo = document.getElementById('tituloFormulario').value;
    const descricao = document.getElementById('descricaoFormulario').value;
    
    if (!titulo) {
        mostrarNotificacao('Por favor, informe o título do formulário', 'error');
        return;
    }
    
    const perguntas = [];
    const perguntasElements = document.querySelectorAll('[id^="pergunta-texto-"]');
    
    perguntasElements.forEach((el, index) => {
        const id = el.id.replace('pergunta-texto-', '');
        const texto = el.value;
        const tipo = document.getElementById(`pergunta-tipo-${id}`).value;
        const categoria = document.getElementById(`pergunta-categoria-${id}`).value;
        
        if (texto) {
            const pergunta = {
                texto,
                tipo,
                categoria: categoria || null,
                ordem: index,
                opcoes: []
            };
            
            if (tipo === 'escala') {
                pergunta.opcoes = [
                    { texto: '1 - Nunca', descricao: 'O comportamento nunca é observado', valor: 1 },
                    { texto: '2 - Raramente', descricao: 'Observado em pouquíssimas ocasiões', valor: 2 },
                    { texto: '3 - Ocasionalmente', descricao: 'Não é consistente ou rotineiro', valor: 3 },
                    { texto: '4 - Frequente', descricao: 'Prática comum', valor: 4 },
                    { texto: '5 - Muito frequente', descricao: 'Prática constante e estabelecida', valor: 5 }
                ];
            }
            
            perguntas.push(pergunta);
        }
    });
    
    try {
        const response = await fetch('/api/formularios/', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo,
                descricao,
                tipo: 'personalizado',
                ativo: true,
                perguntas
            })
        });
        
        if (response.ok) {
            fecharModal('modalNovoFormulario');
            carregarFormularios();
            mostrarNotificacao('Formulário criado com sucesso!', 'success');
        } else {
            const error = await response.json();
            mostrarNotificacao(error.detail || 'Erro ao criar formulário', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro de conexão', 'error');
    }
}

function abrirModalEnviar(formularioId) {
    document.getElementById('enviarFormularioId').value = formularioId;
    document.getElementById('nomeDestinatario').value = '';
    document.getElementById('emailDestinatario').value = '';
    document.getElementById('empresaDestinatario').value = '';
    abrirModal('modalEnviar');
}

async function enviarFormulario() {
    const formularioId = document.getElementById('enviarFormularioId').value;
    const nome = document.getElementById('nomeDestinatario').value;
    const email = document.getElementById('emailDestinatario').value;
    const empresaId = document.getElementById('empresaDestinatario').value;
    
    try {
        const response = await fetch('/api/formularios/enviar', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                formulario_id: parseInt(formularioId),
                nome_destinatario: nome || null,
                email_destinatario: email || null,
                empresa_id: empresaId ? parseInt(empresaId) : null
            })
        });
        
        if (response.ok) {
            const envio = await response.json();
            fecharModal('modalEnviar');
            
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/formulario/responder/${envio.codigo_unico}`;
            document.getElementById('linkFormulario').value = link;
            abrirModal('modalLink');
            
            carregarEnvios();
            carregarFormularios();
        } else {
            const error = await response.json();
            mostrarNotificacao(error.detail || 'Erro ao gerar link', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro de conexão', 'error');
    }
}

function copiarLink() {
    const input = document.getElementById('linkFormulario');
    input.select();
    document.execCommand('copy');
    mostrarNotificacao('Link copiado!', 'success');
}

function copiarLinkEnvio(codigo) {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/formulario/responder/${codigo}`;
    navigator.clipboard.writeText(link).then(() => {
        mostrarNotificacao('Link copiado!', 'success');
    });
}

async function verFormulario(formularioId) {
    try {
        const response = await fetch(`/api/formularios/${formularioId}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const form = await response.json();
            
            document.getElementById('tituloVisualizacao').textContent = form.titulo;
            
            let html = `
                ${form.descricao ? `<p class="text-gray-400 mb-6">${form.descricao}</p>` : ''}
            `;
            
            let currentCategoria = '';
            form.perguntas.forEach((pergunta, index) => {
                if (pergunta.categoria && pergunta.categoria !== currentCategoria) {
                    currentCategoria = pergunta.categoria;
                    html += `
                        <div class="resposta-categoria">
                            <span class="font-semibold text-white">${currentCategoria}</span>
                            ${pergunta.descricao_categoria ? `<p class="text-purple-200 text-sm mt-1">${pergunta.descricao_categoria}</p>` : ''}
                        </div>
                    `;
                }
                
                html += `
                    <div class="resposta-item">
                        <p class="text-white font-medium mb-3">${pergunta.texto}</p>
                        <div class="flex flex-wrap gap-2">
                            ${pergunta.opcoes.map(o => `
                                <span class="px-3 py-1 rounded-full bg-gray-700/50 text-gray-300 text-xs">${o.texto}</span>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('conteudoFormulario').innerHTML = html;
            abrirModal('modalVerFormulario');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function verRespostas(envioId) {
    try {
        const response = await fetch(`/api/formularios/envios/${envioId}/respostas`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const dados = await response.json();
            
            document.getElementById('tituloRespostas').textContent = dados.formulario_titulo || 'Respostas';
            
            let html = `
                <div class="glass-effect rounded-xl p-4 mb-6 border border-dark-border/50">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <i class="fas fa-user-check text-emerald-400"></i>
                        </div>
                        <div>
                            <p class="text-white font-medium">${dados.nome_destinatario || dados.email_destinatario || 'Anônimo'}</p>
                            ${dados.empresa_nome ? `<p class="text-gray-400 text-sm">${dados.empresa_nome}</p>` : ''}
                            <p class="text-gray-500 text-xs mt-1">${formatarData(dados.data_resposta)}</p>
                        </div>
                    </div>
                </div>
            `;
            
            let currentCategoria = '';
            dados.respostas.forEach(resp => {
                if (resp.categoria && resp.categoria !== currentCategoria) {
                    currentCategoria = resp.categoria;
                    html += `
                        <div class="resposta-categoria">
                            <span class="font-semibold text-white">${currentCategoria}</span>
                        </div>
                    `;
                }
                
                html += `
                    <div class="resposta-item">
                        <div class="flex items-start justify-between gap-4">
                            <p class="text-gray-300">${resp.pergunta_texto}</p>
                            ${resp.valor_numerico !== null ? `
                                <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                    <span class="text-white font-bold">${resp.valor_numerico}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${resp.opcao_texto ? `<p class="text-gray-500 text-sm mt-2">${resp.opcao_texto}</p>` : ''}
                        ${resp.valor_texto ? `<p class="text-gray-300 mt-2 p-3 bg-gray-800/50 rounded-lg">${resp.valor_texto}</p>` : ''}
                    </div>
                `;
            });
            
            document.getElementById('conteudoRespostas').innerHTML = html;
            abrirModal('modalVerRespostas');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function verEstatisticas(formularioId) {
    try {
        const response = await fetch(`/api/formularios/${formularioId}/estatisticas`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('tituloRespostas').textContent = 'Estatísticas: ' + stats.titulo;
            
            let html = `
                <div class="flex justify-end mb-4">
                    <button onclick="exportarEstatisticasExcel(${formularioId})" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all duration-300 text-sm font-medium">
                        <i class="fas fa-file-excel"></i>
                        <span>Exportar Excel</span>
                    </button>
                </div>
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="glass-effect rounded-xl p-4 border border-dark-border/50 text-center">
                        <p class="text-3xl font-bold text-blue-400">${stats.total_envios}</p>
                        <p class="text-gray-400 text-sm">Envios</p>
                    </div>
                    <div class="glass-effect rounded-xl p-4 border border-dark-border/50 text-center">
                        <p class="text-3xl font-bold text-emerald-400">${stats.total_respostas}</p>
                        <p class="text-gray-400 text-sm">Respostas</p>
                    </div>
                    <div class="glass-effect rounded-xl p-4 border border-dark-border/50 text-center">
                        <p class="text-3xl font-bold text-amber-400">${stats.taxa_resposta}%</p>
                        <p class="text-gray-400 text-sm">Taxa</p>
                    </div>
                </div>
            `;
            
            if (stats.media_por_pergunta && Object.keys(stats.media_por_pergunta).length > 0) {
                html += `
                    <div class="glass-effect rounded-xl p-4 border border-dark-border/50">
                        <h4 class="text-white font-semibold mb-4 flex items-center gap-2">
                            <i class="fas fa-chart-bar text-purple-400"></i>
                            Média por Pergunta
                        </h4>
                        <div class="space-y-4">
                `;
                
                Object.values(stats.media_por_pergunta).forEach(item => {
                    const porcentagem = (item.media / 5) * 100;
                    const cor = item.media >= 4 ? 'emerald' : item.media >= 3 ? 'amber' : 'red';
                    
                    html += `
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-gray-300 text-sm">${item.texto}</span>
                                <span class="text-${cor}-400 font-bold">${item.media}</span>
                            </div>
                            <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-${cor}-500 to-${cor}-400 rounded-full transition-all duration-500" style="width: ${porcentagem}%"></div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div></div>';
            } else {
                html += `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-chart-pie text-4xl mb-3 opacity-30"></i>
                        <p>Ainda não há respostas suficientes para estatísticas</p>
                    </div>
                `;
            }
            
            document.getElementById('conteudoRespostas').innerHTML = html;
            abrirModal('modalVerRespostas');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function exportarEstatisticasExcel(formularioId) {
    try {
        mostrarNotificacao('Gerando planilha...', 'info');
        
        const token = getToken();
        const response = await fetch(`/api/formularios/${formularioId}/exportar-excel`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'estatisticas.xlsx';
            
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match) {
                    filename = match[1].replace(/"/g, '');
                }
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            
            mostrarNotificacao('Planilha exportada com sucesso!', 'success');
        } else {
            const error = await response.json();
            mostrarNotificacao(error.detail || 'Erro ao exportar', 'error');
        }
    } catch (error) {
        console.error('Erro ao exportar:', error);
        mostrarNotificacao('Erro ao exportar planilha', 'error');
    }
}

async function excluirFormulario(formularioId) {
    if (!confirm('Tem certeza que deseja excluir este formulário? Todos os envios e respostas serão perdidos.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/formularios/${formularioId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            mostrarNotificacao('Formulário excluído com sucesso', 'success');
            carregarFormularios();
            carregarEnvios();
        } else {
            const error = await response.json();
            mostrarNotificacao(error.detail || 'Erro ao excluir', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro de conexão', 'error');
    }
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const cores = {
        success: 'from-emerald-500 to-green-500',
        error: 'from-red-500 to-rose-500',
        info: 'from-blue-500 to-cyan-500',
        warning: 'from-amber-500 to-orange-500'
    };
    
    const icones = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    const notif = document.createElement('div');
    notif.className = `fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${cores[tipo]} text-white shadow-lg animate-slide-up`;
    notif.innerHTML = `
        <i class="fas ${icones[tipo]}"></i>
        <span>${mensagem}</span>
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(20px)';
        notif.style.transition = 'all 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}
