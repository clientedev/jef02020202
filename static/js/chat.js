checkAuth();
atualizarSidebar();

const usuario = getUsuario();

let conversaAtual = null;
let conversas = [];
let mensagensCarregadas = [];
let ultimaMensagemId = 0;
let respostaParaId = null;
let mensagemSelecionada = null;
let usuariosDisponiveis = [];
let typingTimeout = null;
let pollingInterval = null;
let heartbeatInterval = null;

let anexoAtual = null;
let uploadEmProgresso = false;

const EMOJIS_POPULARES = [
    '😀', '😂', '🥰', '😍', '🤩', '😎', '🤔', '😅',
    '👍', '👏', '🙌', '💪', '🎉', '🔥', '❤️', '💯',
    '✅', '⭐', '🚀', '💡', '📌', '📝', '💼', '📊',
    '👋', '🤝', '💬', '📞', '✨', '🎯', '🏆', '💎'
];

const REACOES_RAPIDAS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function inicializarEmojiPicker() {
    const container = document.querySelector('#emojiPicker .grid');
    if (container) {
        container.innerHTML = EMOJIS_POPULARES.map(emoji => 
            `<button class="emoji-btn" onclick="inserirEmoji('${emoji}')">${emoji}</button>`
        ).join('');
    }
    
    const reacoesContainer = document.getElementById('reacoesRapidas');
    if (reacoesContainer) {
        reacoesContainer.innerHTML = REACOES_RAPIDAS.map(emoji =>
            `<button class="emoji-btn text-3xl" onclick="adicionarReacao('${emoji}')">${emoji}</button>`
        ).join('');
    }
}

function inserirEmoji(emoji) {
    const input = document.getElementById('inputMensagem');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    toggleEmojiPicker();
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const picker = document.getElementById('emojiPicker');
    const btn = e.target.closest('[onclick*="toggleEmojiPicker"]');
    if (!picker.contains(e.target) && !btn) {
        picker.classList.add('hidden');
    }
});

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

async function carregarConversas() {
    try {
        const response = await apiRequest('/api/mensagens/conversas');
        conversas = await response.json();
        renderizarConversas();
    } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        document.getElementById('listaConversas').innerHTML = 
            '<div class="p-4 text-center text-red-400">Erro ao carregar conversas</div>';
    }
}

function renderizarConversas(filtro = '') {
    const container = document.getElementById('listaConversas');
    
    let conversasFiltradas = conversas;
    if (filtro) {
        const termoLower = filtro.toLowerCase();
        conversasFiltradas = conversas.filter(c => 
            c.usuario.nome.toLowerCase().includes(termoLower) ||
            c.usuario.email.toLowerCase().includes(termoLower) ||
            (c.ultima_mensagem && c.ultima_mensagem.toLowerCase().includes(termoLower))
        );
    }
    
    if (conversasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center">
                <div class="w-16 h-16 rounded-2xl bg-dark-card flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-inbox text-2xl text-gray-600"></i>
                </div>
                <p class="text-gray-400">${filtro ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}</p>
                <p class="text-gray-500 text-sm mt-1">Inicie uma nova conversa</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = conversasFiltradas.map(conv => {
        const isActive = conversaAtual && conversaAtual.id === conv.usuario.id;
        const onlineClass = conv.usuario.online ? '' : 'offline';
        const dataFormatada = conv.data_ultima_mensagem ? formatarDataRelativa(conv.data_ultima_mensagem) : '';
        
        let previewMsg = conv.ultima_mensagem || 'Iniciar conversa';
        if (conv.ultima_mensagem_minha) {
            previewMsg = 'Voce: ' + previewMsg;
        }
        if (previewMsg.length > 40) {
            previewMsg = previewMsg.substring(0, 40) + '...';
        }
        
        let tipoIcon = '';
        if (conv.ultima_mensagem_tipo === 'imagem') tipoIcon = '<i class="fas fa-image text-blue-400 mr-1"></i>';
        if (conv.ultima_mensagem_tipo === 'arquivo') tipoIcon = '<i class="fas fa-file text-purple-400 mr-1"></i>';
        if (conv.ultima_mensagem_tipo === 'audio') tipoIcon = '<i class="fas fa-microphone text-green-400 mr-1"></i>';
        
        return `
            <div onclick="abrirConversa(${conv.usuario.id})" 
                 class="conversa-item p-4 cursor-pointer ${isActive ? 'active' : ''}"
                 data-usuario-id="${conv.usuario.id}">
                <div class="flex items-start gap-3">
                    <div class="online-indicator ${onlineClass} flex-shrink-0">
                        <img src="${conv.usuario.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.usuario.nome)}&size=48&background=3b82f6&color=fff`}" 
                             alt="${conv.usuario.nome}" 
                             class="w-12 h-12 rounded-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="text-white font-medium truncate">${conv.usuario.nome}</h4>
                            <span class="text-gray-500 text-xs flex-shrink-0">${dataFormatada}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <p class="text-gray-400 text-sm truncate flex items-center">
                                ${tipoIcon}${previewMsg}
                            </p>
                            ${conv.mensagens_nao_lidas > 0 ? `
                                <span class="unread-badge flex-shrink-0 ml-2">${conv.mensagens_nao_lidas}</span>
                            ` : ''}
                        </div>
                        ${conv.usuario.digitando ? `
                            <p class="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                                <span class="typing-indicator inline-flex"><span></span><span></span><span></span></span>
                                digitando...
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function formatarDataRelativa(dataString) {
    const data = new Date(dataString);
    const agora = new Date();
    const diff = agora - data;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    
    if (minutos < 1) return 'Agora';
    if (minutos < 60) return `${minutos}min`;
    if (horas < 24) return `${horas}h`;
    if (dias < 7) return `${dias}d`;
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

async function abrirConversa(usuarioId) {
    try {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        const response = await apiRequest(`/api/mensagens/conversa/${usuarioId}`);
        mensagensCarregadas = await response.json();
        
        const conversaUsuario = conversas.find(c => c.usuario.id === usuarioId);
        
        if (conversaUsuario) {
            conversaAtual = conversaUsuario.usuario;
        } else {
            try {
                const userResponse = await apiRequest(`/api/mensagens/usuarios-disponiveis?busca=`);
                const usuarios = await userResponse.json();
                const encontrado = usuarios.find(u => u.id === usuarioId);
                if (encontrado) {
                    conversaAtual = encontrado;
                }
            } catch (e) {
                console.error('Erro ao buscar usuario:', e);
            }
        }
        
        if (!conversaAtual) {
            alert('Nao foi possivel encontrar este usuario');
            return;
        }
        
        ultimaMensagemId = mensagensCarregadas.length > 0 
            ? Math.max(...mensagensCarregadas.map(m => m.id)) 
            : 0;
        
        atualizarCabecalhoChat();
        exibirMensagens(mensagensCarregadas);
        
        document.getElementById('cabecalhoChat').classList.remove('hidden');
        document.getElementById('formularioMensagem').classList.remove('hidden');
        
        renderizarConversas(document.getElementById('buscarConversa').value);
        
        pollingInterval = setInterval(() => verificarNovasMensagens(), 2000);
        
        await carregarConversas();
        
    } catch (error) {
        console.error('Erro ao abrir conversa:', error);
    }
}

function atualizarCabecalhoChat() {
    if (!conversaAtual) return;
    
    const fotoUrl = conversaAtual.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversaAtual.nome)}&size=48&background=3b82f6&color=fff`;
    document.getElementById('fotoDestinatario').src = fotoUrl;
    document.getElementById('nomeDestinatario').textContent = conversaAtual.nome;
    
    const avatarContainer = document.getElementById('avatarContainer');
    avatarContainer.className = 'online-indicator' + (conversaAtual.online ? '' : ' offline');
    
    const statusTexto = document.getElementById('statusTexto');
    if (conversaAtual.online) {
        statusTexto.innerHTML = '<span class="text-emerald-400">Online</span>';
    } else if (conversaAtual.ultima_atividade) {
        statusTexto.textContent = 'Visto ' + formatarDataRelativa(conversaAtual.ultima_atividade);
    } else {
        statusTexto.textContent = 'Offline';
    }
}

function exibirMensagens(mensagens) {
    const container = document.getElementById('areaMensagens');
    
    if (mensagens.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-400">
                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                    <i class="fas fa-hand-peace text-3xl text-blue-400/70"></i>
                </div>
                <p class="text-lg text-white/80">Inicie a conversa!</p>
                <p class="text-sm text-gray-500 mt-1">Envie a primeira mensagem</p>
            </div>
        `;
        return;
    }
    
    let lastDate = null;
    let html = '';
    
    mensagens.forEach((msg, index) => {
        const msgDate = new Date(msg.data_envio).toLocaleDateString('pt-BR');
        
        if (msgDate !== lastDate) {
            html += `
                <div class="flex items-center justify-center my-6">
                    <div class="px-4 py-1.5 bg-dark-card rounded-full text-gray-400 text-xs font-medium">
                        ${formatarDataSeparador(msg.data_envio)}
                    </div>
                </div>
            `;
            lastDate = msgDate;
        }
        
        html += renderizarMensagem(msg, index);
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function formatarDataSeparador(dataString) {
    const data = new Date(dataString);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    
    if (data.toDateString() === hoje.toDateString()) return 'Hoje';
    if (data.toDateString() === ontem.toDateString()) return 'Ontem';
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderizarMensagem(msg, index) {
    const ehMinhaMsg = msg.remetente_id === usuario.id;
    const hora = new Date(msg.data_envio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let statusIcon = '';
    if (ehMinhaMsg) {
        if (msg.lida || msg.status === 'lida') {
            statusIcon = '<i class="fas fa-check-double text-blue-400"></i>';
        } else if (msg.status === 'entregue') {
            statusIcon = '<i class="fas fa-check-double text-gray-400"></i>';
        } else {
            statusIcon = '<i class="fas fa-check text-gray-400"></i>';
        }
    }
    
    let respostaHtml = '';
    if (msg.resposta_para && msg.resposta_para.conteudo) {
        respostaHtml = `
            <div class="reply-preview mb-2 text-gray-300">
                <span class="text-blue-400 font-medium text-xs">${msg.resposta_para.remetente?.nome || 'Usuario'}</span>
                <p class="text-xs truncate mt-0.5">${msg.resposta_para.conteudo}</p>
            </div>
        `;
    }
    
    let anexoHtml = '';
    if (msg.anexo_url && !msg.deletada) {
        if (msg.tipo === 'imagem') {
            anexoHtml = `
                <div class="mb-2">
                    <img src="${msg.anexo_url}" alt="${msg.anexo_nome || 'Imagem'}" 
                         class="max-w-full max-h-64 rounded-xl cursor-pointer hover:opacity-90 transition"
                         onclick="abrirImagemModal('${msg.anexo_url}')">
                </div>
            `;
        } else {
            const icone = getIconeArquivoPorNome(msg.anexo_nome || 'arquivo');
            const tamanho = msg.anexo_tamanho ? formatarTamanhoArquivo(msg.anexo_tamanho) : '';
            anexoHtml = `
                <a href="${msg.anexo_url}" target="_blank" download="${msg.anexo_nome}"
                   class="flex items-center gap-3 p-3 bg-black/20 rounded-xl mb-2 hover:bg-black/30 transition group">
                    <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <i class="${icone} text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-white text-sm font-medium truncate">${msg.anexo_nome || 'Arquivo'}</p>
                        <p class="text-gray-400 text-xs">${tamanho}</p>
                    </div>
                    <i class="fas fa-download text-gray-400 group-hover:text-white transition"></i>
                </a>
            `;
        }
    }
    
    let conteudoHtml = '';
    if (msg.deletada) {
        conteudoHtml = '<span class="italic text-gray-500">Mensagem apagada</span>';
    } else if (msg.conteudo && msg.conteudo !== msg.anexo_nome) {
        conteudoHtml = formatarConteudo(msg.conteudo);
    }
    
    let reacoesHtml = '';
    if (msg.reacoes && Object.keys(msg.reacoes).length > 0) {
        reacoesHtml = '<div class="flex flex-wrap gap-1 mt-2">';
        for (const [emoji, usuarios] of Object.entries(msg.reacoes)) {
            const minha = usuarios.includes(usuario.id);
            reacoesHtml += `
                <button onclick="toggleReacao(${msg.id}, '${emoji}')" 
                        class="reaction-bubble ${minha ? 'ring-1 ring-blue-400' : ''}">
                    ${emoji} <span class="text-gray-400">${usuarios.length}</span>
                </button>
            `;
        }
        reacoesHtml += '</div>';
    }
    
    const editadoLabel = msg.editada ? '<span class="text-gray-500 text-xs ml-1">(editada)</span>' : '';
    
    return `
        <div class="message-container mb-3 flex ${ehMinhaMsg ? 'justify-end' : 'justify-start'} message-slide" 
             style="animation-delay: ${index * 0.03}s"
             data-msg-id="${msg.id}">
            <div class="max-w-[75%] relative group">
                <div class="${ehMinhaMsg ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-dark-card border border-dark-border/50'} 
                            rounded-2xl ${ehMinhaMsg ? 'rounded-br-md' : 'rounded-bl-md'} p-3 shadow-lg">
                    ${respostaHtml}
                    ${anexoHtml}
                    ${conteudoHtml ? `<p class="text-white whitespace-pre-wrap break-words">${conteudoHtml}</p>` : ''}
                    ${reacoesHtml}
                    <div class="flex items-center justify-end gap-2 mt-1.5">
                        ${editadoLabel}
                        <span class="text-xs ${ehMinhaMsg ? 'text-blue-200' : 'text-gray-500'}">${hora}</span>
                        ${statusIcon}
                    </div>
                </div>
                ${!msg.deletada ? `
                    <div class="message-actions absolute ${ehMinhaMsg ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} top-1/2 -translate-y-1/2 flex gap-1">
                        <button onclick="abrirReacoes(${msg.id})" class="w-8 h-8 rounded-full bg-dark-card hover:bg-dark-hover flex items-center justify-center text-gray-400 hover:text-yellow-400 transition shadow-lg" title="Reagir">
                            <i class="fas fa-smile text-sm"></i>
                        </button>
                        <button onclick="abrirAcoesMensagem(${msg.id}, ${ehMinhaMsg})" class="w-8 h-8 rounded-full bg-dark-card hover:bg-dark-hover flex items-center justify-center text-gray-400 hover:text-white transition shadow-lg" title="Mais">
                            <i class="fas fa-ellipsis-v text-sm"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function formatarConteudo(texto) {
    texto = texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    texto = texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-300 hover:underline">$1</a>');
    
    texto = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    texto = texto.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return texto;
}

async function enviarMensagem() {
    if (!conversaAtual) {
        alert('Selecione uma conversa primeiro');
        return;
    }
    
    if (uploadEmProgresso) {
        alert('Aguarde o upload do arquivo terminar');
        return;
    }
    
    const input = document.getElementById('inputMensagem');
    const conteudo = input.value.trim();
    
    if (!conteudo && !anexoAtual) {
        alert('Digite uma mensagem ou anexe um arquivo');
        return;
    }
    
    const btnEnviar = document.getElementById('btnEnviar');
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        const payload = {
            destinatario_id: conversaAtual.id,
            conteudo: conteudo || (anexoAtual ? anexoAtual.nome : ''),
            tipo: anexoAtual ? anexoAtual.tipo : 'texto'
        };
        
        if (respostaParaId) {
            payload.resposta_para_id = respostaParaId;
        }
        
        if (anexoAtual) {
            payload.anexo_url = anexoAtual.url;
            payload.anexo_nome = anexoAtual.nome;
            payload.anexo_tamanho = anexoAtual.tamanho;
        }
        
        await apiRequest('/api/mensagens/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        input.value = '';
        input.style.height = 'auto';
        cancelarResposta();
        cancelarAnexo();
        
        await abrirConversa(conversaAtual.id);
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = '<i class="fas fa-paper-plane text-lg"></i>';
    }
}

async function verificarNovasMensagens() {
    if (!conversaAtual) return;
    
    try {
        const response = await apiRequest(`/api/mensagens/novas/${conversaAtual.id}?ultima_id=${ultimaMensagemId}`);
        const data = await response.json();
        
        if (data.status) {
            conversaAtual.online = data.status.online;
            conversaAtual.ultima_atividade = data.status.ultima_atividade;
            atualizarCabecalhoChat();
            
            const digitandoEl = document.getElementById('digitandoIndicator');
            if (data.status.digitando) {
                digitandoEl.classList.remove('hidden');
            } else {
                digitandoEl.classList.add('hidden');
            }
        }
        
        if (data.mensagens && data.mensagens.length > 0) {
            data.mensagens.forEach(novaMensagem => {
                if (!mensagensCarregadas.find(m => m.id === novaMensagem.id)) {
                    mensagensCarregadas.push(novaMensagem);
                    adicionarMensagemAoChat(novaMensagem);
                }
            });
            
            ultimaMensagemId = Math.max(ultimaMensagemId, ...data.mensagens.map(m => m.id));
            
            await carregarConversas();
        }
    } catch (error) {
        console.error('Erro ao verificar novas mensagens:', error);
    }
}

function adicionarMensagemAoChat(msg) {
    const container = document.getElementById('areaMensagens');
    
    if (container.querySelector('.fa-hand-peace')) {
        container.innerHTML = '';
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderizarMensagem(msg, 0);
    container.appendChild(tempDiv.firstElementChild);
    
    container.scrollTop = container.scrollHeight;
}

let typingActive = false;

async function handleTyping() {
    if (!conversaAtual) return;
    
    if (!typingActive) {
        typingActive = true;
        try {
            await apiRequest('/api/mensagens/digitando', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    digitando: true,
                    destinatario_id: conversaAtual.id
                })
            });
        } catch (e) {}
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(async () => {
        typingActive = false;
        try {
            await apiRequest('/api/mensagens/digitando', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    digitando: false,
                    destinatario_id: conversaAtual.id
                })
            });
        } catch (e) {}
    }, 3000);
}

function responderMensagemPor(msgId) {
    const msg = mensagensCarregadas.find(m => m.id === msgId);
    if (!msg) return;
    
    respostaParaId = msgId;
    
    document.getElementById('respostaNome').textContent = msg.remetente.nome;
    document.getElementById('respostaTexto').textContent = msg.conteudo;
    document.getElementById('respostaContainer').classList.remove('hidden');
    
    document.getElementById('inputMensagem').focus();
}

function cancelarResposta() {
    respostaParaId = null;
    document.getElementById('respostaContainer').classList.add('hidden');
}

function abrirAcoesMensagem(msgId, ehMinha) {
    mensagemSelecionada = mensagensCarregadas.find(m => m.id === msgId);
    
    document.getElementById('btnEditarMsg').style.display = ehMinha ? 'flex' : 'none';
    document.getElementById('btnDeletarMsg').style.display = ehMinha ? 'flex' : 'none';
    
    document.getElementById('modalMensagemAcoes').classList.remove('hidden');
}

function fecharModalAcoes() {
    document.getElementById('modalMensagemAcoes').classList.add('hidden');
    mensagemSelecionada = null;
}

function responderMensagem() {
    if (mensagemSelecionada) {
        responderMensagemPor(mensagemSelecionada.id);
    }
    fecharModalAcoes();
}

function copiarMensagem() {
    if (mensagemSelecionada) {
        navigator.clipboard.writeText(mensagemSelecionada.conteudo);
    }
    fecharModalAcoes();
}

async function editarMensagem() {
    if (!mensagemSelecionada) return;
    
    const novoConteudo = prompt('Editar mensagem:', mensagemSelecionada.conteudo);
    if (novoConteudo === null || novoConteudo.trim() === '' || novoConteudo === mensagemSelecionada.conteudo) {
        fecharModalAcoes();
        return;
    }
    
    try {
        await apiRequest(`/api/mensagens/${mensagemSelecionada.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conteudo: novoConteudo.trim() })
        });
        
        await abrirConversa(conversaAtual.id);
    } catch (error) {
        console.error('Erro ao editar mensagem:', error);
        alert('Erro ao editar mensagem');
    }
    
    fecharModalAcoes();
}

async function deletarMensagem() {
    if (!mensagemSelecionada) return;
    
    if (!confirm('Tem certeza que deseja apagar esta mensagem?')) {
        fecharModalAcoes();
        return;
    }
    
    try {
        await apiRequest(`/api/mensagens/${mensagemSelecionada.id}`, {
            method: 'DELETE'
        });
        
        await abrirConversa(conversaAtual.id);
    } catch (error) {
        console.error('Erro ao apagar mensagem:', error);
        alert('Erro ao apagar mensagem');
    }
    
    fecharModalAcoes();
}

function abrirReacoes(msgId) {
    mensagemSelecionada = mensagensCarregadas.find(m => m.id === msgId);
    document.getElementById('modalReacoes').classList.remove('hidden');
}

async function adicionarReacao(emoji) {
    if (!mensagemSelecionada) return;
    
    try {
        await apiRequest(`/api/mensagens/${mensagemSelecionada.id}/reacao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji: emoji })
        });
        
        await abrirConversa(conversaAtual.id);
    } catch (error) {
        console.error('Erro ao adicionar reacao:', error);
    }
    
    document.getElementById('modalReacoes').classList.add('hidden');
    mensagemSelecionada = null;
}

async function toggleReacao(msgId, emoji) {
    try {
        await apiRequest(`/api/mensagens/${msgId}/reacao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji: emoji })
        });
        
        await abrirConversa(conversaAtual.id);
    } catch (error) {
        console.error('Erro ao toggle reacao:', error);
    }
}

async function abrirModalNovaConversa() {
    document.getElementById('modalNovaConversa').classList.remove('hidden');
    document.getElementById('buscarUsuarioModal').value = '';
    await carregarUsuariosDisponiveis();
}

function fecharModalNovaConversa() {
    document.getElementById('modalNovaConversa').classList.add('hidden');
}

async function carregarUsuariosDisponiveis() {
    try {
        const response = await apiRequest('/api/mensagens/usuarios-disponiveis');
        usuariosDisponiveis = await response.json();
        renderizarUsuariosModal();
    } catch (error) {
        console.error('Erro ao carregar usuarios:', error);
        document.getElementById('listaUsuariosModal').innerHTML = 
            '<div class="text-center text-red-400 py-4">Erro ao carregar usuarios</div>';
    }
}

function renderizarUsuariosModal() {
    const container = document.getElementById('listaUsuariosModal');
    const filtro = document.getElementById('buscarUsuarioModal').value.toLowerCase();
    
    let usuariosFiltrados = usuariosDisponiveis;
    if (filtro) {
        usuariosFiltrados = usuariosDisponiveis.filter(u => 
            u.nome.toLowerCase().includes(filtro) ||
            u.email.toLowerCase().includes(filtro)
        );
    }
    
    if (usuariosFiltrados.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">Nenhum usuario encontrado</div>';
        return;
    }
    
    container.innerHTML = usuariosFiltrados.map(u => {
        const onlineClass = u.online ? '' : 'offline';
        return `
            <div onclick="iniciarNovaConversa(${u.id})" 
                 class="p-4 rounded-xl border border-dark-border/50 hover:bg-dark-hover hover:border-blue-500/30 cursor-pointer transition group">
                <div class="flex items-center gap-4">
                    <div class="online-indicator ${onlineClass} flex-shrink-0">
                        <img src="${u.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&size=48&background=3b82f6&color=fff`}" 
                             alt="${u.nome}" 
                             class="w-12 h-12 rounded-full object-cover group-hover:ring-2 group-hover:ring-blue-500/50 transition">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-white font-medium truncate">${u.nome}</h4>
                        <p class="text-gray-400 text-sm truncate">${u.email}</p>
                    </div>
                    <div class="flex-shrink-0">
                        ${u.online ? 
                            '<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Online</span>' : 
                            '<span class="text-gray-500 text-xs">Offline</span>'
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filtrarUsuariosModal() {
    renderizarUsuariosModal();
}

async function iniciarNovaConversa(usuarioId) {
    fecharModalNovaConversa();
    await abrirConversa(usuarioId);
}

function buscarNaConversa() {
    const container = document.getElementById('buscarNaConversaContainer');
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
        document.getElementById('inputBuscarConversa').focus();
    }
}

function fecharBuscaConversa() {
    document.getElementById('buscarNaConversaContainer').classList.add('hidden');
    document.getElementById('inputBuscarConversa').value = '';
    document.getElementById('resultadosBusca').textContent = '';
    exibirMensagens(mensagensCarregadas);
}

document.getElementById('inputBuscarConversa')?.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase();
    if (!termo) {
        exibirMensagens(mensagensCarregadas);
        document.getElementById('resultadosBusca').textContent = '';
        return;
    }
    
    const encontradas = mensagensCarregadas.filter(m => 
        m.conteudo.toLowerCase().includes(termo)
    );
    
    document.getElementById('resultadosBusca').textContent = `${encontradas.length} encontrada(s)`;
    
    exibirMensagens(encontradas);
});

function abrirInfoConversa() {
    if (!conversaAtual) return;
    alert(`Informacoes de ${conversaAtual.nome}\nEmail: ${conversaAtual.email}\nStatus: ${conversaAtual.online ? 'Online' : 'Offline'}`);
}

function anexarArquivo() {
    const input = document.getElementById('inputArquivo');
    input.click();
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('Arquivo muito grande. Maximo permitido: 10MB');
        event.target.value = '';
        return;
    }
    
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        alert('Tipo de arquivo nao permitido. Envie imagens, PDF, Word, Excel ou arquivos de texto.');
        event.target.value = '';
        return;
    }
    
    mostrarPreviewAnexo(file);
    
    await uploadArquivo(file);
}

function mostrarPreviewAnexo(file) {
    const container = document.getElementById('anexoPreviewContainer');
    const previewIcon = document.getElementById('anexoPreviewIcon');
    const previewImagem = document.getElementById('anexoPreviewImagem');
    const previewNome = document.getElementById('anexoPreviewNome');
    const previewTamanho = document.getElementById('anexoPreviewTamanho');
    
    previewNome.textContent = file.name;
    previewTamanho.textContent = formatarTamanhoArquivo(file.size);
    
    if (file.type.startsWith('image/')) {
        previewIcon.classList.add('hidden');
        previewImagem.classList.remove('hidden');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImagem.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        previewImagem.classList.add('hidden');
        previewIcon.classList.remove('hidden');
        
        const iconElement = previewIcon.querySelector('i');
        iconElement.className = 'text-xl ' + getIconeArquivo(file.type);
    }
    
    container.classList.remove('hidden');
}

function getIconeArquivo(mimeType) {
    if (mimeType.startsWith('image/')) return 'fas fa-image text-green-400';
    if (mimeType === 'application/pdf') return 'fas fa-file-pdf text-red-400';
    if (mimeType.includes('word')) return 'fas fa-file-word text-blue-400';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel text-green-400';
    if (mimeType.includes('text')) return 'fas fa-file-alt text-gray-400';
    return 'fas fa-file text-blue-400';
}

function formatarTamanhoArquivo(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function uploadArquivo(file) {
    uploadEmProgresso = true;
    document.getElementById('anexoUploadProgress').classList.remove('hidden');
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/mensagens/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao fazer upload');
        }
        
        anexoAtual = await response.json();
        console.log('Upload concluido:', anexoAtual);
        
    } catch (error) {
        console.error('Erro no upload:', error);
        alert('Erro ao enviar arquivo: ' + error.message);
        cancelarAnexo();
    } finally {
        uploadEmProgresso = false;
        document.getElementById('anexoUploadProgress').classList.add('hidden');
    }
}

function cancelarAnexo() {
    anexoAtual = null;
    uploadEmProgresso = false;
    document.getElementById('anexoPreviewContainer').classList.add('hidden');
    document.getElementById('inputArquivo').value = '';
    document.getElementById('anexoPreviewImagem').src = '';
}

function getIconeArquivoPorNome(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': 'fas fa-file-pdf text-red-400',
        'doc': 'fas fa-file-word text-blue-400',
        'docx': 'fas fa-file-word text-blue-400',
        'xls': 'fas fa-file-excel text-green-400',
        'xlsx': 'fas fa-file-excel text-green-400',
        'txt': 'fas fa-file-alt text-gray-400',
        'csv': 'fas fa-file-csv text-green-400',
        'jpg': 'fas fa-image text-purple-400',
        'jpeg': 'fas fa-image text-purple-400',
        'png': 'fas fa-image text-purple-400',
        'gif': 'fas fa-image text-purple-400',
        'webp': 'fas fa-image text-purple-400'
    };
    return icons[ext] || 'fas fa-file text-blue-400';
}

function abrirImagemModal(url) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 cursor-pointer';
    modal.onclick = () => modal.remove();
    modal.innerHTML = `
        <div class="relative max-w-full max-h-full">
            <img src="${url}" class="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onclick="event.stopPropagation()">
            <button class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times text-xl"></i>
            </button>
            <a href="${url}" target="_blank" download class="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white transition" onclick="event.stopPropagation()">
                <i class="fas fa-download"></i>
                Baixar
            </a>
        </div>
    `;
    document.body.appendChild(modal);
}

document.getElementById('inputMensagem')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensagem();
    }
});

document.getElementById('buscarConversa')?.addEventListener('input', (e) => {
    renderizarConversas(e.target.value);
});

document.addEventListener('click', (e) => {
    if (e.target.id === 'modalReacoes' || e.target.classList.contains('modal-backdrop')) {
        document.getElementById('modalReacoes').classList.add('hidden');
    }
});

async function sendHeartbeat() {
    try {
        await apiRequest('/api/mensagens/heartbeat', { method: 'POST' });
    } catch (e) {}
}

async function init() {
    inicializarEmojiPicker();
    await carregarConversas();
    
    heartbeatInterval = setInterval(sendHeartbeat, 30000);
    sendHeartbeat();
    
    setInterval(carregarConversas, 10000);
}

init();
