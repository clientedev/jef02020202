function getToken() {
    return localStorage.getItem('token');
}

function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
}

function setUsuario(usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
}

function getUsuario() {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
}

function atualizarSidebar() {
    const usuario = getUsuario();
    if (!usuario) return;
    
    const userNameEl = document.getElementById('userName');
    const userInfoEl = document.getElementById('userInfo');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) {
        userNameEl.textContent = usuario.nome || 'Usuário';
    }
    
    if (userInfoEl) {
        const tipoFormatado = usuario.tipo === 'admin' ? 'Administrador' : 'Consultor';
        userInfoEl.textContent = tipoFormatado;
    }
    
    if (userAvatarEl) {
        if (usuario.foto_url) {
            userAvatarEl.innerHTML = `<img src="${usuario.foto_url}" alt="Foto" class="w-10 h-10 rounded-full object-cover">`;
        } else {
            const iniciais = (usuario.nome || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            userAvatarEl.innerHTML = `<span class="text-white text-sm font-semibold">${iniciais}</span>`;
        }
    }
    
    const adminLink = document.getElementById('adminLink');
    if (adminLink && usuario.tipo === 'admin') {
        adminLink.classList.remove('hidden');
    }
}

function logout() {
    removeToken();
    window.location.href = '/';
}

async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            console.error('Erro 401: Token inválido ou expirado');
            logout();
            return null;
        }
        
        if (!response.ok) {
            console.error(`Erro HTTP ${response.status} em ${url}`);
        }
        
        return response;
    } catch (error) {
        console.error('Erro de rede em apiRequest:', error);
        throw error;
    }
}

function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/';
    }
}

async function atualizarBadgeMensagens() {
    const token = getToken();
    if (!token) return;
    
    try {
        const response = await fetch('/api/mensagens/nao-lidas/contagem', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const count = data.count || 0;
            
            const chatBadge = document.getElementById('chatBadge');
            const chatBadgeDot = document.getElementById('chatBadgeDot');
            
            if (count > 0) {
                if (chatBadge) {
                    chatBadge.textContent = count > 99 ? '99+' : count;
                    chatBadge.classList.remove('hidden');
                }
                if (chatBadgeDot) {
                    chatBadgeDot.classList.remove('hidden');
                }
            } else {
                if (chatBadge) {
                    chatBadge.classList.add('hidden');
                }
                if (chatBadgeDot) {
                    chatBadgeDot.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('Erro ao verificar mensagens nao lidas:', error);
    }
}

function iniciarVerificacaoMensagens() {
    if (window.location.pathname === '/') return;
    
    atualizarBadgeMensagens();
    
    setInterval(atualizarBadgeMensagens, 30000);
}

if (window.location.pathname !== '/' && !getToken()) {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', function() {
    if (getToken()) {
        atualizarSidebar();
        iniciarVerificacaoMensagens();
    }
});
