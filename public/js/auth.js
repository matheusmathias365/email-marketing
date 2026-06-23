const msalConfig = {
    auth: {
        clientId: "b711968c-531c-4e5b-8c67-7e917980ca57",
        authority: "https://login.microsoftonline.com/organizations",
        redirectUri: window.location.origin + "/" // Isso pega automaticamente a URL atual (localhost ou vercel)
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

const msalInstance = new window.msal.PublicClientApplication(msalConfig);

async function checkAuth() {
    await msalInstance.initialize();
    
    // Verifica se estamos voltando de um redirecionamento de login da Microsoft
    try {
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            msalInstance.setActiveAccount(response.account);
        }
    } catch (err) {
        console.error("Erro no redirecionamento do MSAL:", err);
    }

    const currentAccount = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];

    if (!currentAccount) {
        // Se NÃO estiver logado:
        
        // 1. Esconde a interface principal do aplicativo
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'none';
        
        // 2. Cria a tela de login corporativo por cima de tudo
        const overlay = document.createElement('div');
        overlay.id = "ms-login-overlay";
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:#050505;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;";
        overlay.innerHTML = `
            <div style="background:#111;padding:40px;border-radius:8px;text-align:center;border:1px solid #333;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                <div style="width:64px;height:64px;margin:0 auto 20px auto;background:var(--accent);border-radius:12px;display:flex;align-items:center;justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <h2 style="color:#fff;margin-bottom:10px;">EmailPro Login</h2>
                <p style="color:#aaa;margin-bottom:30px;">Acesso restrito para empresas autorizadas.</p>
                <button id="btn-ms-login" style="background:#0078D4;color:#fff;border:none;padding:12px 24px;border-radius:4px;font-size:16px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:10px;margin:0 auto;transition:background 0.2s;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 23 23"><path fill="#f35325" d="M0 0h11v11H0z"/><path fill="#81bc06" d="M12 0h11v11H12z"/><path fill="#05a6f0" d="M0 12h11v11H0z"/><path fill="#ffba08" d="M12 12h11v11H12z"/></svg>
                    Entrar com Conta Corporativa
                </button>
            </div>
        `;
        document.body.appendChild(overlay);

        // 3. Ao clicar no botão, inicia o processo de login
        document.getElementById('btn-ms-login').onclick = () => {
            msalInstance.loginRedirect({
                scopes: ["user.read"]
            });
        };
    } else {
        // Se ESTIVER logado:
        
        msalInstance.setActiveAccount(currentAccount);
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) appLayout.style.display = 'flex';
        
        // Remove a tela de login se ela existir (caso a página não tenha recarregado)
        const overlay = document.getElementById('ms-login-overlay');
        if (overlay) overlay.remove();

        // Atualiza a interface com os dados do usuário da Microsoft
        setTimeout(() => {
            const userNameElement = document.querySelector('.user-avatar');
            if (userNameElement) {
                userNameElement.title = currentAccount.name || currentAccount.username;
                userNameElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAccount.name)}&background=0078D4&color=fff`;
            }

            // Sobrescreve o comportamento do botão "Sair"
            const logoutBtn = document.getElementById('btn-logout');
            if (logoutBtn) {
                // Clona o botão para remover os event listeners antigos do app.js
                const newLogoutBtn = logoutBtn.cloneNode(true);
                logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
                
                newLogoutBtn.addEventListener('click', () => {
                    if (confirm("Deseja encerrar sua sessão corporativa?")) {
                        msalInstance.logoutRedirect({
                            account: msalInstance.getActiveAccount(),
                            postLogoutRedirectUri: window.location.origin
                        });
                    }
                });
            }
        }, 100); // pequeno timeout para garantir que o DOM foi carregado pelo app.js
    }
}

// Executa a verificação de autenticação assim que o script carregar
document.addEventListener('DOMContentLoaded', checkAuth);
