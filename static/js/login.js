document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        if (response.ok) {
            const data = await response.json();
            setToken(data.access_token);
            setUsuario(data.usuario);
            window.location.href = '/dashboard';
        } else {
            const error = await response.json();
            document.getElementById('errorMessage').textContent = error.detail || 'Erro ao fazer login';
            document.getElementById('errorMessage').classList.remove('hidden');
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = 'Erro de conexão com o servidor';
        document.getElementById('errorMessage').classList.remove('hidden');
    }
});
