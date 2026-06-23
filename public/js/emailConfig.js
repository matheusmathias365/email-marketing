/**
 * EMAIL CONFIG — Configuração do provedor de email
 */
const EmailConfig = {
  helpTexts: {
    gmail: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> No Gmail, ative a Verificação em 2 etapas e gere uma <strong>Senha de App</strong>: Google → Segurança → Verificação em duas etapas → Senhas de app',
    outlook: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> Use sua senha normal. Se tiver 2FA ativado, gere uma Senha de App nas configurações de segurança.',
    yahoo: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> Gere uma Senha de App: Yahoo → Segurança da Conta → Gerar senha de app',
    office365: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> <strong>Atenção:</strong> O Office 365 desativa o envio via senha normal por padrão. Você precisa gerar uma <strong>Senha de App</strong> nas configurações de segurança da sua conta Microsoft, ou pedir ao administrador de TI para habilitar o <strong>SMTP AUTH</strong> para sua caixa postal.',
    zoho: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> Gere uma Senha de App no painel de segurança do Zoho Mail.',
    sendgrid: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> Use <strong>apikey</strong> como usuário e sua API Key como senha.',
    amazonses: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> Use as credenciais SMTP geradas no console da AWS SES.',
    custom: '<i data-lucide="lightbulb" class="inline-icon" style="color:var(--warning)"></i> Configure manualmente as informações do seu servidor SMTP.'
  },

  init() {
    this.setupProviderCards();
    this.setupVerifyButton();
    this.setupClearButton();
    this.restoreConfig();
  },

  setupProviderCards() {
    document.querySelectorAll('.provider-card').forEach(card => {
      card.addEventListener('click', () => {
        // Remover seleção anterior
        document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const provider = card.dataset.provider;
        App.state.provider = provider;

        // Mostrar formulário
        document.getElementById('smtp-config-card').style.display = '';
        document.getElementById('selected-provider-badge').textContent = card.querySelector('.provider-name').textContent;

        // Campos custom
        const customFields = document.getElementById('custom-smtp-fields');
        customFields.style.display = provider === 'custom' ? '' : 'none';

        // Mostrar ou Esconder o formulário de senha vs Google OAuth
        const authSection = document.getElementById('standard-auth-fields');
        const oauthSection = document.getElementById('gmail-oauth-section');
        const verifyBtn = document.getElementById('btn-verify-connection');
        
        if (provider === 'gmail') {
          authSection.style.display = 'none';
          oauthSection.style.display = 'block';
          verifyBtn.style.display = 'none'; // Oculta botão de testar conexão (OAuth testa sozinho)
        } else {
          authSection.style.display = 'block';
          oauthSection.style.display = 'none';
          verifyBtn.style.display = 'inline-flex';
        }

        // Help text
        document.getElementById('provider-help-text').innerHTML = this.helpTexts[provider] || '';

        // Pre-fill para SendGrid
        if (provider === 'sendgrid') {
          document.getElementById('smtp-user').value = 'apikey';
        }
      });
    });
    
    // Iniciar configuração do Google OAuth se os elementos existirem
    setTimeout(() => this.setupGoogleOAuth(), 500);
  },

  setupGoogleOAuth() {
    const clientIdMeta = document.querySelector('meta[name="google-client-id"]');
    if (!clientIdMeta) return;
    const clientId = clientIdMeta.content;

    const btnGoogle = document.getElementById('btn-google-login');
    if (!btnGoogle) return;

    let oauthClient = null;

    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      oauthClient = google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'https://mail.google.com/ email profile',
        ux_mode: 'popup',
        callback: (response) => {
          if (response.error) {
            App.toast('error', 'Login Falhou', 'Não foi possível autorizar o Google.');
            return;
          }
          this.exchangeGoogleToken(response.code);
        },
      });
    }

    btnGoogle.addEventListener('click', () => {
      if (oauthClient) {
        oauthClient.requestCode();
      } else {
        App.toast('error', 'Erro', 'O SDK do Google ainda não carregou.');
      }
    });
  },

  async exchangeGoogleToken(code) {
    const btnGoogle = document.getElementById('btn-google-login');
    btnGoogle.innerHTML = '⏳ Conectando...';
    btnGoogle.disabled = true;

    try {
      const response = await App.apiCall('oauth-callback', {
        body: { code }
      });

      if (response.success && response.tokens) {
        // Obter email pelo Access Token
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${response.tokens.access_token}` }
        });
        const userInfo = await userInfoRes.json();

        // Salvar estado
        App.state.oauth = {
          clientId: document.querySelector('meta[name="google-client-id"]').content,
          refreshToken: response.tokens.refresh_token,
          accessToken: response.tokens.access_token
        };
        App.state.smtpConfig = {
          provider: 'gmail',
          user: userInfo.email,
          oauth: App.state.oauth
        };
        App.state.isConnected = true;
        App.saveState();
        App.updateConnectionUI();

        // Atualizar UI
        document.getElementById('google-connected-user').style.display = 'block';
        document.getElementById('google-user-email').textContent = userInfo.email;
        btnGoogle.style.display = 'none';

        App.toast('success', 'Conectado!', `Conta Google vinculada com sucesso.`);
        if (typeof Dashboard !== 'undefined') Dashboard.refresh();
      }
    } catch (e) {
      App.toast('error', 'Erro no Servidor', e.message);
      btnGoogle.innerHTML = 'Tentar novamente';
      btnGoogle.disabled = false;
    }
  },

  setupVerifyButton() {
    document.getElementById('btn-verify-connection').addEventListener('click', async () => {
      const btn = document.getElementById('btn-verify-connection');
      const user = document.getElementById('smtp-user').value.trim();
      const pass = document.getElementById('smtp-pass').value.trim();

      if (!user || !pass) {
        App.toast('warning', 'Campos obrigatórios', 'Preencha o email e a senha.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Verificando...';

      try {
        const config = {
          provider: App.state.provider,
          user,
          pass,
          fromName: document.getElementById('smtp-from-name').value.trim()
        };

        // Só incluir host/port/secure para SMTP customizado
        if (App.state.provider === 'custom') {
          config.host = document.getElementById('smtp-host').value.trim();
          config.port = document.getElementById('smtp-port').value.trim();
          config.secure = document.getElementById('smtp-secure').checked;
        }

        await App.apiCall('verify', { body: config });

        App.state.smtpConfig = config;
        App.state.isConnected = true;
        App.saveState();
        App.updateConnectionUI();

        App.toast('success', 'Conectado!', 'Conexão SMTP verificada com sucesso.');
      } catch (error) {
        App.state.isConnected = false;
        App.updateConnectionUI();
        App.toast('error', 'Erro de Conexão', error.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span><i data-lucide="plug" class="inline-icon"></i> Verificar Conexão</span>';
        if (typeof lucide !== "undefined") lucide.createIcons();
      }
    });
  },

  setupClearButton() {
    document.getElementById('btn-clear-config').addEventListener('click', () => {
      document.getElementById('smtp-user').value = '';
      document.getElementById('smtp-pass').value = '';
      document.getElementById('smtp-from-name').value = '';
      document.getElementById('smtp-host').value = '';
      document.getElementById('smtp-port').value = '';
      document.getElementById('smtp-secure').checked = false;

      App.state.provider = null;
      App.state.smtpConfig = null;
      App.state.isConnected = false;
      App.saveState();
      App.updateConnectionUI();

      document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('selected'));
      document.getElementById('smtp-config-card').style.display = 'none';

      App.toast('info', 'Limpo', 'Configuração resetada.');
    });
  },

  restoreConfig() {
    if (App.state.smtpConfig) {
      const cfg = App.state.smtpConfig;
      // Selecionar provedor
      const card = document.querySelector(`.provider-card[data-provider="${cfg.provider}"]`);
      if (card) card.click();

      document.getElementById('smtp-user').value = cfg.user || '';
      document.getElementById('smtp-pass').value = cfg.pass || '';
      document.getElementById('smtp-from-name').value = cfg.fromName || '';
      if (cfg.host) document.getElementById('smtp-host').value = cfg.host;
      if (cfg.port) document.getElementById('smtp-port').value = cfg.port;

      if (cfg.provider === 'gmail' && cfg.oauth) {
        document.getElementById('btn-google-login').style.display = 'none';
        document.getElementById('google-connected-user').style.display = 'block';
        document.getElementById('google-user-email').textContent = cfg.user;
        document.getElementById('standard-auth-fields').style.display = 'none';
        document.getElementById('gmail-oauth-section').style.display = 'block';
        document.getElementById('btn-verify-connection').style.display = 'none';
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => EmailConfig.init());
