let perguntas = [];
let perguntaIdCounter = 0;
let themeColor = 'purple';
let sortableInstance = null;
let autoSaveTimer = null;

const categorias = [
    { value: 'comunicacao', label: 'Comunicacao', color: 'purple' },
    { value: 'lideranca', label: 'Lideranca', color: 'amber' },
    { value: 'estrategia', label: 'Estrategia', color: 'blue' },
    { value: 'equipe', label: 'Equipe', color: 'emerald' },
    { value: 'resultados', label: 'Resultados', color: 'pink' },
    { value: 'inovacao', label: 'Inovacao', color: 'cyan' },
    { value: 'geral', label: 'Geral', color: 'gray' }
];

const templates = {
    lideranca: {
        titulo: 'Avaliacao de Lideranca 360',
        descricao: 'Questionario completo para avaliacao de competencias de lideranca em diferentes dimensoes.',
        perguntas: [
            { texto: 'O lider comunica de forma clara os objetivos e expectativas da equipe?', tipo: 'escala', categoria: 'comunicacao' },
            { texto: 'O lider escuta ativamente as ideias e sugestoes dos membros da equipe?', tipo: 'escala', categoria: 'comunicacao' },
            { texto: 'O lider fornece feedback construtivo regularmente?', tipo: 'escala', categoria: 'comunicacao' },
            { texto: 'O lider demonstra visao estrategica para o futuro da area?', tipo: 'escala', categoria: 'estrategia' },
            { texto: 'O lider toma decisoes de forma assertiva e no momento adequado?', tipo: 'escala', categoria: 'estrategia' },
            { texto: 'O lider incentiva o desenvolvimento profissional da equipe?', tipo: 'escala', categoria: 'equipe' },
            { texto: 'O lider reconhece e celebra as conquistas da equipe?', tipo: 'escala', categoria: 'equipe' },
            { texto: 'O lider promove um ambiente de trabalho colaborativo?', tipo: 'escala', categoria: 'equipe' },
            { texto: 'O lider demonstra integridade e etica em suas acoes?', tipo: 'escala', categoria: 'lideranca' },
            { texto: 'O lider inspira confianca e respeito nos colaboradores?', tipo: 'escala', categoria: 'lideranca' },
            { texto: 'Qual o principal ponto forte deste lider?', tipo: 'texto', categoria: 'geral' },
            { texto: 'O que este lider poderia melhorar?', tipo: 'texto', categoria: 'geral' }
        ]
    },
    satisfacao: {
        titulo: 'Pesquisa de Satisfacao',
        descricao: 'Avalie sua experiencia e satisfacao com nossos servicos.',
        perguntas: [
            { texto: 'Qual seu nivel de satisfacao geral com nossos servicos?', tipo: 'escala', categoria: 'geral' },
            { texto: 'A qualidade do atendimento atendeu suas expectativas?', tipo: 'escala', categoria: 'geral' },
            { texto: 'O tempo de resposta foi satisfatorio?', tipo: 'escala', categoria: 'geral' },
            { texto: 'Voce recomendaria nossos servicos para outras pessoas?', tipo: 'escala', categoria: 'geral' },
            { texto: 'O que podemos fazer para melhorar sua experiencia?', tipo: 'texto', categoria: 'geral' }
        ]
    },
    clima: {
        titulo: 'Pesquisa de Clima Organizacional',
        descricao: 'Ajude-nos a entender e melhorar o ambiente de trabalho.',
        perguntas: [
            { texto: 'Voce se sente valorizado pela organizacao?', tipo: 'escala', categoria: 'geral' },
            { texto: 'A comunicacao interna e eficiente?', tipo: 'escala', categoria: 'comunicacao' },
            { texto: 'Voce tem as ferramentas necessarias para realizar seu trabalho?', tipo: 'escala', categoria: 'geral' },
            { texto: 'O ambiente de trabalho e colaborativo e respeitoso?', tipo: 'escala', categoria: 'equipe' },
            { texto: 'Voce ve oportunidades de crescimento na empresa?', tipo: 'escala', categoria: 'geral' },
            { texto: 'Seu gestor direto apoia seu desenvolvimento?', tipo: 'escala', categoria: 'lideranca' },
            { texto: 'O que mais te motiva a trabalhar aqui?', tipo: 'texto', categoria: 'geral' },
            { texto: 'O que poderia ser melhorado no ambiente de trabalho?', tipo: 'texto', categoria: 'geral' }
        ]
    },
    nps: {
        titulo: 'Net Promoter Score (NPS)',
        descricao: 'Avaliacao rapida de lealdade e satisfacao.',
        perguntas: [
            { texto: 'Em uma escala de 0 a 10, qual a probabilidade de voce recomendar nossa empresa para um amigo ou colega?', tipo: 'nota', categoria: 'geral' },
            { texto: 'Qual o principal motivo da sua nota?', tipo: 'texto', categoria: 'geral' }
        ]
    },
    feedback: {
        titulo: 'Feedback 360',
        descricao: 'Colete feedback abrangente de diferentes perspectivas.',
        perguntas: [
            { texto: 'Esta pessoa demonstra comprometimento com suas responsabilidades?', tipo: 'escala', categoria: 'resultados' },
            { texto: 'Esta pessoa colabora bem com os colegas de equipe?', tipo: 'escala', categoria: 'equipe' },
            { texto: 'Esta pessoa comunica suas ideias de forma clara?', tipo: 'escala', categoria: 'comunicacao' },
            { texto: 'Esta pessoa busca melhorar continuamente seu desempenho?', tipo: 'escala', categoria: 'geral' },
            { texto: 'Cite um exemplo de comportamento positivo desta pessoa:', tipo: 'texto', categoria: 'geral' },
            { texto: 'O que esta pessoa poderia desenvolver?', tipo: 'texto', categoria: 'geral' }
        ]
    },
    onboarding: {
        titulo: 'Avaliacao de Onboarding',
        descricao: 'Avalie sua experiencia de integracao na empresa.',
        perguntas: [
            { texto: 'O processo de integracao foi bem organizado?', tipo: 'escala', categoria: 'geral' },
            { texto: 'Voce recebeu as informacoes necessarias para iniciar suas atividades?', tipo: 'escala', categoria: 'comunicacao' },
            { texto: 'Sua equipe foi receptiva e acolhedora?', tipo: 'escala', categoria: 'equipe' },
            { texto: 'Seu gestor esteve disponivel para orientacoes?', tipo: 'escala', categoria: 'lideranca' },
            { texto: 'O que foi mais positivo no seu processo de integracao?', tipo: 'texto', categoria: 'geral' },
            { texto: 'O que poderia ser melhorado no onboarding?', tipo: 'texto', categoria: 'geral' }
        ]
    }
};

document.addEventListener('DOMContentLoaded', function() {
    initSortable();
    loadDraft();
    updateSteps();
    setThemeColor('purple');
});

function initSortable() {
    const lista = document.getElementById('listaPerguntas');
    if (lista && typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(lista, {
            animation: 200,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            dragClass: 'dragging',
            onEnd: function() {
                reorderPerguntas();
                updatePreview();
                saveDraft();
            }
        });
    }
}

function reorderPerguntas() {
    const cards = document.querySelectorAll('.question-card[data-id]');
    const newOrder = [];
    cards.forEach((card, index) => {
        const id = parseInt(card.dataset.id);
        const pergunta = perguntas.find(p => p.id === id);
        if (pergunta) {
            pergunta.ordem = index + 1;
            newOrder.push(pergunta);
        }
    });
    perguntas = newOrder;
    updatePerguntaNumbers();
}

function updatePerguntaNumbers() {
    const cards = document.querySelectorAll('.question-card[data-id]');
    cards.forEach((card, index) => {
        const numberEl = card.querySelector('.pergunta-number');
        if (numberEl) {
            numberEl.textContent = index + 1;
        }
    });
}

function adicionarPergunta() {
    abrirModal('modalTipoPergunta');
}

function criarPergunta(tipo) {
    fecharModal('modalTipoPergunta');
    
    perguntaIdCounter++;
    const novaPergunta = {
        id: perguntaIdCounter,
        texto: '',
        tipo: tipo,
        categoria: 'geral',
        ordem: perguntas.length + 1,
        opcoes: tipo === 'multipla' || tipo === 'unica' ? [
            { texto: 'Opcao 1', valor: 1 },
            { texto: 'Opcao 2', valor: 2 }
        ] : getDefaultOpcoes(tipo)
    };
    
    perguntas.push(novaPergunta);
    renderizarPerguntas();
    updatePreview();
    saveDraft();
    
    setTimeout(() => {
        const newCard = document.querySelector(`[data-id="${perguntaIdCounter}"]`);
        if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = newCard.querySelector('input[type="text"], textarea');
            if (input) input.focus();
        }
    }, 100);
}

function getDefaultOpcoes(tipo) {
    if (tipo === 'escala') {
        return [
            { texto: 'Discordo totalmente', valor: 1 },
            { texto: 'Discordo', valor: 2 },
            { texto: 'Neutro', valor: 3 },
            { texto: 'Concordo', valor: 4 },
            { texto: 'Concordo totalmente', valor: 5 }
        ];
    } else if (tipo === 'nota') {
        return Array.from({ length: 11 }, (_, i) => ({ texto: String(i), valor: i }));
    } else if (tipo === 'sim_nao') {
        return [
            { texto: 'Sim', valor: 1 },
            { texto: 'Nao', valor: 0 }
        ];
    }
    return [];
}

function renderizarPerguntas() {
    const lista = document.getElementById('listaPerguntas');
    const emptyState = document.getElementById('emptyState');
    
    if (perguntas.length === 0) {
        lista.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        document.getElementById('perguntaCount').textContent = '0 perguntas';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    document.getElementById('perguntaCount').textContent = `${perguntas.length} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'}`;
    
    lista.innerHTML = perguntas.map((p, index) => renderPerguntaCard(p, index)).join('');
    
    initSortable();
}

function renderPerguntaCard(pergunta, index) {
    const tipoInfo = getTipoInfo(pergunta.tipo);
    const categoriaInfo = categorias.find(c => c.value === pergunta.categoria) || categorias[categorias.length - 1];
    
    let opcoesHtml = '';
    if (pergunta.tipo === 'multipla' || pergunta.tipo === 'unica') {
        opcoesHtml = `
            <div class="mt-4 space-y-2" id="opcoes-${pergunta.id}">
                <label class="block text-xs font-medium text-gray-400 mb-2">Opcoes de Resposta</label>
                ${pergunta.opcoes.map((opt, i) => `
                    <div class="option-input">
                        <i class="fas ${pergunta.tipo === 'multipla' ? 'fa-check-square' : 'fa-dot-circle'} text-gray-500 text-sm"></i>
                        <input type="text" value="${opt.texto}" class="flex-1 bg-transparent border-none text-gray-200 text-sm focus:outline-none" 
                               onchange="atualizarOpcao(${pergunta.id}, ${i}, this.value)" placeholder="Digite a opcao...">
                        <button onclick="removerOpcao(${pergunta.id}, ${i})" class="text-gray-500 hover:text-red-400 transition">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
                <button onclick="adicionarOpcao(${pergunta.id})" class="w-full py-2 rounded-lg border border-dashed border-dark-border/50 text-gray-500 hover:text-purple-400 hover:border-purple-500/30 transition text-sm">
                    <i class="fas fa-plus mr-2"></i>
                    Adicionar opcao
                </button>
            </div>
        `;
    } else if (pergunta.tipo === 'escala') {
        opcoesHtml = `
            <div class="mt-4">
                <label class="block text-xs font-medium text-gray-400 mb-2">Preview da Escala</label>
                <div class="scale-preview">
                    ${pergunta.opcoes.map(opt => `
                        <div class="scale-btn tooltip" data-tooltip="${opt.texto}">${opt.valor}</div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (pergunta.tipo === 'nota') {
        opcoesHtml = `
            <div class="mt-4">
                <label class="block text-xs font-medium text-gray-400 mb-2">Preview da Nota (0-10)</label>
                <div class="flex gap-1">
                    ${Array.from({ length: 11 }, (_, i) => `
                        <div class="w-8 h-8 rounded-lg bg-dark-hover text-center leading-8 text-sm text-gray-400">${i}</div>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (pergunta.tipo === 'sim_nao') {
        opcoesHtml = `
            <div class="mt-4">
                <label class="block text-xs font-medium text-gray-400 mb-2">Preview</label>
                <div class="flex gap-3">
                    <div class="px-6 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">Sim</div>
                    <div class="px-6 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium">Nao</div>
                </div>
            </div>
        `;
    } else if (pergunta.tipo === 'texto') {
        opcoesHtml = `
            <div class="mt-4">
                <label class="block text-xs font-medium text-gray-400 mb-2">Preview</label>
                <div class="w-full h-20 rounded-lg bg-dark-hover/50 border border-dark-border/30"></div>
            </div>
        `;
    }
    
    return `
        <div class="question-card p-5 animate-fade-in" data-id="${pergunta.id}">
            <div class="flex items-start gap-4">
                <div class="flex flex-col items-center gap-2">
                    <div class="drag-handle w-8 h-8 rounded-lg bg-dark-hover flex items-center justify-center">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br ${tipoInfo.gradient} flex items-center justify-center text-white text-sm font-bold pergunta-number">
                        ${index + 1}
                    </div>
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-2.5 py-1 rounded-full ${tipoInfo.bg} ${tipoInfo.text} text-xs font-medium flex items-center gap-1.5">
                            <i class="fas ${tipoInfo.icon}"></i>
                            ${tipoInfo.label}
                        </span>
                        <select onchange="atualizarCategoria(${pergunta.id}, this.value)" class="px-2.5 py-1 rounded-full bg-${categoriaInfo.color}-500/20 text-${categoriaInfo.color}-400 text-xs font-medium border-none focus:outline-none cursor-pointer">
                            ${categorias.map(c => `<option value="${c.value}" ${c.value === pergunta.categoria ? 'selected' : ''}>${c.label}</option>`).join('')}
                        </select>
                    </div>
                    
                    <textarea 
                        placeholder="Digite a pergunta..." 
                        class="w-full input-modern resize-none text-base"
                        rows="2"
                        oninput="atualizarTexto(${pergunta.id}, this.value)"
                    >${pergunta.texto}</textarea>
                    
                    ${opcoesHtml}
                </div>
                
                <div class="flex flex-col gap-1">
                    <button onclick="duplicarPergunta(${pergunta.id})" class="w-8 h-8 rounded-lg bg-dark-hover hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition tooltip" data-tooltip="Duplicar">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button onclick="removerPergunta(${pergunta.id})" class="w-8 h-8 rounded-lg bg-dark-hover hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition tooltip" data-tooltip="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getTipoInfo(tipo) {
    const tipos = {
        escala: { label: 'Escala', icon: 'fa-sliders-h', bg: 'bg-purple-500/20', text: 'text-purple-400', gradient: 'from-purple-500 to-pink-500' },
        texto: { label: 'Texto', icon: 'fa-align-left', bg: 'bg-blue-500/20', text: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' },
        multipla: { label: 'Multipla', icon: 'fa-check-square', bg: 'bg-emerald-500/20', text: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
        unica: { label: 'Unica', icon: 'fa-dot-circle', bg: 'bg-amber-500/20', text: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' },
        nota: { label: 'Nota', icon: 'fa-star', bg: 'bg-pink-500/20', text: 'text-pink-400', gradient: 'from-pink-500 to-rose-500' },
        sim_nao: { label: 'Sim/Nao', icon: 'fa-toggle-on', bg: 'bg-cyan-500/20', text: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500' }
    };
    return tipos[tipo] || tipos.escala;
}

function atualizarTexto(id, valor) {
    const pergunta = perguntas.find(p => p.id === id);
    if (pergunta) {
        pergunta.texto = valor;
        updatePreview();
        saveDraft();
    }
}

function atualizarCategoria(id, valor) {
    const pergunta = perguntas.find(p => p.id === id);
    if (pergunta) {
        pergunta.categoria = valor;
        renderizarPerguntas();
        saveDraft();
    }
}

function atualizarOpcao(perguntaId, opcaoIndex, valor) {
    const pergunta = perguntas.find(p => p.id === perguntaId);
    if (pergunta && pergunta.opcoes[opcaoIndex]) {
        pergunta.opcoes[opcaoIndex].texto = valor;
        updatePreview();
        saveDraft();
    }
}

function adicionarOpcao(perguntaId) {
    const pergunta = perguntas.find(p => p.id === perguntaId);
    if (pergunta) {
        pergunta.opcoes.push({
            texto: `Opcao ${pergunta.opcoes.length + 1}`,
            valor: pergunta.opcoes.length + 1
        });
        renderizarPerguntas();
        updatePreview();
        saveDraft();
    }
}

function removerOpcao(perguntaId, opcaoIndex) {
    const pergunta = perguntas.find(p => p.id === perguntaId);
    if (pergunta && pergunta.opcoes.length > 2) {
        pergunta.opcoes.splice(opcaoIndex, 1);
        pergunta.opcoes.forEach((opt, i) => opt.valor = i + 1);
        renderizarPerguntas();
        updatePreview();
        saveDraft();
    } else {
        showToast('Minimo de 2 opcoes necessarias', 'warning');
    }
}

function duplicarPergunta(id) {
    const original = perguntas.find(p => p.id === id);
    if (original) {
        perguntaIdCounter++;
        const copia = {
            ...original,
            id: perguntaIdCounter,
            texto: original.texto + ' (copia)',
            ordem: perguntas.length + 1,
            opcoes: original.opcoes ? [...original.opcoes.map(o => ({...o}))] : []
        };
        perguntas.push(copia);
        renderizarPerguntas();
        updatePreview();
        saveDraft();
        showToast('Pergunta duplicada', 'success');
    }
}

function removerPergunta(id) {
    perguntas = perguntas.filter(p => p.id !== id);
    perguntas.forEach((p, i) => p.ordem = i + 1);
    renderizarPerguntas();
    updatePreview();
    saveDraft();
    showToast('Pergunta removida', 'success');
}

function updatePreview() {
    const titulo = document.getElementById('tituloFormulario').value || 'Titulo do Formulario';
    const descricao = document.getElementById('descricaoFormulario').value || 'Descricao do formulario aparecera aqui';
    
    document.getElementById('previewTitulo').textContent = titulo;
    document.getElementById('previewDescricao').textContent = descricao;
    
    const previewPerguntas = document.getElementById('previewPerguntas');
    
    if (perguntas.length === 0) {
        previewPerguntas.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-eye-slash text-3xl mb-2 opacity-30"></i>
                <p class="text-sm">Adicione perguntas para visualizar</p>
            </div>
        `;
        return;
    }
    
    previewPerguntas.innerHTML = perguntas.map((p, i) => {
        let inputHtml = '';
        
        if (p.tipo === 'escala') {
            inputHtml = `
                <div class="flex gap-2 mt-3">
                    ${p.opcoes.map(o => `<div class="w-8 h-8 rounded-lg bg-dark-hover text-center leading-8 text-xs text-gray-500">${o.valor}</div>`).join('')}
                </div>
            `;
        } else if (p.tipo === 'texto') {
            inputHtml = '<div class="h-16 rounded-lg bg-dark-hover/50 border border-dark-border/30 mt-3"></div>';
        } else if (p.tipo === 'nota') {
            inputHtml = `
                <div class="flex gap-1 mt-3 overflow-x-auto">
                    ${Array.from({ length: 11 }, (_, i) => `<div class="w-6 h-6 rounded bg-dark-hover text-center leading-6 text-xs text-gray-500 flex-shrink-0">${i}</div>`).join('')}
                </div>
            `;
        } else if (p.tipo === 'sim_nao') {
            inputHtml = `
                <div class="flex gap-2 mt-3">
                    <div class="px-4 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">Sim</div>
                    <div class="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs">Nao</div>
                </div>
            `;
        } else if (p.tipo === 'multipla' || p.tipo === 'unica') {
            inputHtml = `
                <div class="space-y-2 mt-3">
                    ${p.opcoes.map(o => `
                        <div class="flex items-center gap-2 text-gray-400 text-xs">
                            <i class="fas ${p.tipo === 'multipla' ? 'fa-square' : 'fa-circle'} text-gray-600"></i>
                            ${o.texto}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return `
            <div class="p-4 rounded-xl bg-dark-hover/30 border border-dark-border/20">
                <p class="text-sm text-gray-200 font-medium">${i + 1}. ${p.texto || 'Pergunta sem texto'}</p>
                ${inputHtml}
            </div>
        `;
    }).join('');
}

function togglePreview() {
    const preview = document.getElementById('previewSection');
    if (preview.classList.contains('hidden')) {
        preview.classList.remove('hidden');
        preview.classList.add('lg:block');
    } else {
        preview.classList.add('hidden');
        preview.classList.remove('lg:block');
    }
}

function updateSteps() {
    const titulo = document.getElementById('tituloFormulario').value;
    const temPerguntas = perguntas.length > 0;
    
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');
    
    if (titulo) {
        step1.className = 'step completed';
        line1.className = 'step-line completed';
    } else {
        step1.className = 'step active';
        line1.className = 'step-line';
    }
    
    if (temPerguntas) {
        step2.className = 'step completed';
        line2.className = 'step-line completed';
        step3.className = 'step active';
    } else if (titulo) {
        step2.className = 'step active';
        line2.className = 'step-line';
        step3.className = 'step pending';
    } else {
        step2.className = 'step pending';
        step3.className = 'step pending';
    }
}

function setThemeColor(color) {
    themeColor = color;
    document.querySelectorAll('.theme-color').forEach(btn => {
        btn.classList.remove('border-white');
        btn.classList.add('border-transparent');
    });
    const selectedBtn = document.querySelector(`.theme-color[data-color="${color}"]`);
    if (selectedBtn) {
        selectedBtn.classList.remove('border-transparent');
        selectedBtn.classList.add('border-white');
    }
    saveDraft();
}

function abrirModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function abrirTemplates() {
    abrirModal('modalTemplates');
}

function usarTemplate(templateKey) {
    const template = templates[templateKey];
    if (!template) return;
    
    document.getElementById('tituloFormulario').value = template.titulo;
    document.getElementById('descricaoFormulario').value = template.descricao;
    
    perguntas = [];
    perguntaIdCounter = 0;
    
    template.perguntas.forEach((p, i) => {
        perguntaIdCounter++;
        perguntas.push({
            id: perguntaIdCounter,
            texto: p.texto,
            tipo: p.tipo,
            categoria: p.categoria || 'geral',
            ordem: i + 1,
            opcoes: getDefaultOpcoes(p.tipo)
        });
    });
    
    fecharModal('modalTemplates');
    renderizarPerguntas();
    updatePreview();
    updateSteps();
    saveDraft();
    
    showToast(`Template "${template.titulo}" aplicado!`, 'success');
}

function saveDraft() {
    clearTimeout(autoSaveTimer);
    
    const status = document.getElementById('autoSaveStatus');
    status.innerHTML = '<i class="fas fa-circle-notch fa-spin text-amber-400"></i><span class="hidden sm:inline">Salvando...</span>';
    
    autoSaveTimer = setTimeout(() => {
        const draft = {
            titulo: document.getElementById('tituloFormulario').value,
            descricao: document.getElementById('descricaoFormulario').value,
            categoria: document.getElementById('categoriaFormulario').value,
            perguntas: perguntas,
            themeColor: themeColor,
            anonimo: document.getElementById('anonimo').checked,
            obrigatorio: document.getElementById('obrigatorio').checked,
            aleatorio: document.getElementById('aleatorio').checked
        };
        
        localStorage.setItem('formBuilder_draft', JSON.stringify(draft));
        
        status.innerHTML = '<i class="fas fa-cloud text-emerald-400"></i><span class="hidden sm:inline">Rascunho salvo</span>';
        updateSteps();
    }, 500);
}

function loadDraft() {
    try {
        const draft = JSON.parse(localStorage.getItem('formBuilder_draft'));
        if (draft) {
            document.getElementById('tituloFormulario').value = draft.titulo || '';
            document.getElementById('descricaoFormulario').value = draft.descricao || '';
            document.getElementById('categoriaFormulario').value = draft.categoria || '';
            
            if (draft.perguntas && draft.perguntas.length > 0) {
                perguntas = draft.perguntas;
                perguntaIdCounter = Math.max(...perguntas.map(p => p.id)) || 0;
            }
            
            if (draft.themeColor) setThemeColor(draft.themeColor);
            if (draft.anonimo !== undefined) document.getElementById('anonimo').checked = draft.anonimo;
            if (draft.obrigatorio !== undefined) document.getElementById('obrigatorio').checked = draft.obrigatorio;
            if (draft.aleatorio !== undefined) document.getElementById('aleatorio').checked = draft.aleatorio;
            
            renderizarPerguntas();
            updatePreview();
            updateSteps();
        }
    } catch (e) {
        console.log('Nenhum rascunho encontrado');
    }
}

async function salvarFormulario() {
    const titulo = document.getElementById('tituloFormulario').value.trim();
    
    if (!titulo) {
        showToast('Digite um titulo para o formulario', 'error');
        document.getElementById('tituloFormulario').focus();
        return;
    }
    
    if (perguntas.length === 0) {
        showToast('Adicione pelo menos uma pergunta', 'error');
        return;
    }
    
    const perguntasSemTexto = perguntas.filter(p => !p.texto.trim());
    if (perguntasSemTexto.length > 0) {
        showToast('Preencha o texto de todas as perguntas', 'error');
        return;
    }
    
    const btn = document.querySelector('button[onclick="salvarFormulario()"]');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Salvando...';
    btn.disabled = true;
    
    try {
        const dados = {
            titulo: titulo,
            descricao: document.getElementById('descricaoFormulario').value,
            tipo: 'personalizado',
            ativo: true,
            perguntas: perguntas.map((p, i) => ({
                texto: p.texto,
                tipo: p.tipo,
                ordem: i + 1,
                obrigatoria: document.getElementById('obrigatorio').checked,
                categoria: p.categoria,
                opcoes: p.opcoes.map(o => ({
                    texto: o.texto,
                    valor: o.valor
                }))
            }))
        };
        
        const response = await fetch('/api/formularios/', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            localStorage.removeItem('formBuilder_draft');
            showToast('Formulario criado com sucesso!', 'success');
            
            setTimeout(() => {
                window.location.href = '/formularios';
            }, 1500);
        } else {
            const error = await response.json();
            showToast(error.detail || 'Erro ao criar formulario', 'error');
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexao', 'error');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const colors = {
        success: 'bg-gradient-to-r from-emerald-500 to-green-500',
        error: 'bg-gradient-to-r from-red-500 to-rose-500',
        info: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        warning: 'bg-gradient-to-r from-amber-500 to-orange-500'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${colors[type]} text-white flex items-center gap-3`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('input', function(e) {
    if (e.target.id === 'tituloFormulario' || e.target.id === 'descricaoFormulario') {
        updateSteps();
        saveDraft();
    }
});
