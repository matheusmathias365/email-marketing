/**
 * APP.JS — Controlador principal da aplicação SPA
 * Gerencia navegação, estado global, toasts e API calls
 */
const App = {
  // Estado global
  state: {
    provider: null,
    smtpConfig: null,
    isConnected: false,
    template: { html: '', subject: '', tags: [] },
    contacts: [],
    fields: [],
    validContacts: [],
    isSending: false,
    isPaused: false
  },

  init() {
    this.setupNavigation();
    this.loadState();
    this.initNotifications();
    this.startUnsubscribePolling();
    
    // Configurar botão de logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja desconectar o provedor de e-mail?')) {
          this.state.provider = null;
          this.state.smtpConfig = null;
          this.state.isConnected = false;
          this.saveState();
          sessionStorage.setItem('logoutToast', 'Sua sessão foi encerrada com sucesso.');
          window.location.reload();
        }
      });
    }

    if (sessionStorage.getItem('logoutToast')) {
      this.toast('info', 'Desconectado', sessionStorage.getItem('logoutToast'));
      sessionStorage.removeItem('logoutToast');
    }

    console.log('📧 Email Marketing Pro — Iniciado');
  },

  /**
   * Navegação SPA
   */
  setupNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.navigateTo(section);
      });
    });

    // Checar hash na URL
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigateTo(hash);
  },

  navigateTo(sectionId) {
    if (typeof lucide !== "undefined") setTimeout(() => lucide.createIcons(), 50);
    // Esconder todas as seções
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Mostrar seção ativa
    const section = document.getElementById(`section-${sectionId}`);
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);

    if (section) section.classList.add('active');
    if (navItem) navItem.classList.add('active');

    window.location.hash = sectionId;

    // Atualizar dados da seção
    if (sectionId === 'dashboard' && typeof Dashboard !== 'undefined') Dashboard.refresh();
    if (sectionId === 'send' && typeof SendManager !== 'undefined') SendManager.refreshSummary();
    if (sectionId === 'template' && typeof TemplateEditor !== 'undefined') TemplateEditor.updatePreview();
  },

  /**
   * Salvar estado no sessionStorage
   */
  saveState() {
    try {
      const toSave = {
        provider: this.state.provider,
        smtpConfig: this.state.smtpConfig,
        isConnected: this.state.isConnected,
        template: this.state.template
      };
      sessionStorage.setItem('emailMarketingState', JSON.stringify(toSave));
    } catch (e) {}
  },

  loadState() {
    try {
      const saved = sessionStorage.getItem('emailMarketingState');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(this.state, parsed);
        this.updateConnectionUI();
      }
    } catch (e) {}
  },

  /**
   * Atualiza UI de conexão na sidebar
   */
  updateConnectionUI() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const avatar = document.querySelector('.user-avatar');

    if (this.state.isConnected) {
      dot.className = 'status-dot connected';
      const userEmail = this.state.smtpConfig?.user;
      text.textContent = userEmail || 'Conectado';
      
      if (userEmail && avatar) {
        avatar.src = `https://unavatar.io/${userEmail}?fallback=https://ui-avatars.com/api/?name=User&background=4648d4&color=fff`;
      }
    } else {
      dot.className = 'status-dot';
      text.textContent = 'Desconectado';
      if (avatar) avatar.src = 'https://ui-avatars.com/api/?name=User&background=4648d4&color=fff';
    }
  },

  /**
   * Chamadas à API
   */
  async apiCall(endpoint, options = {}) {
    const url = `/api/${endpoint}`;
    const config = {
      method: options.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Erro ${response.status}`);
    }

    return data;
  },

  /**
   * Sistema de Toast Notifications
   */
  toast(type, title, message, duration = 5000) {
    const container = document.getElementById('toast-container');
    const icons = { 
      success: '<i data-lucide="check-circle" style="color: var(--accent);"></i>', 
      error: '<i data-lucide="x-circle" style="color: var(--danger);"></i>', 
      warning: '<i data-lucide="alert-triangle" style="color: var(--warning);"></i>', 
      info: '<i data-lucide="info" style="color: var(--secondary);"></i>' 
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i data-lucide="x" style="width: 14px; height: 14px;"></i></button>
    `;

    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons({ root: toast });

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Modal de confirmação
   */
  confirm(title, bodyHtml) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-modal');
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = bodyHtml;
      overlay.classList.remove('hidden');

      const cleanup = (result) => {
        overlay.classList.add('hidden');
        resolve(result);
      };

      document.getElementById('modal-confirm-btn').onclick = () => cleanup(true);
      document.getElementById('modal-cancel-btn').onclick = () => cleanup(false);
      document.getElementById('modal-close-btn').onclick = () => cleanup(false);
      overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
    });
  },

  /**
   * Substitui tags {{campo}} no template
   */
  mergeTemplate(html, data) {
    let merged = html;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi');
      merged = merged.replace(regex, value != null ? String(value) : '');
    }
    return merged;
  },

  /**
   * Extrai tags {{campo}} do HTML
   */
  extractTags(html) {
    const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
    const tags = new Set();
    let match;
    while ((match = regex.exec(html)) !== null) {
      tags.add(match[1].trim());
    }
    return Array.from(tags);
  },

  /**
   * Formata tempo em segundos para texto legível
   */
  formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min < 60) return `${min}m ${sec}s`;
    const hrs = Math.floor(min / 60);
    return `${hrs}h ${min % 60}m`;
  },

  /**
   * Valida se está pronto para envio (Teste ou Massa)
   */
  validateSend(isTest = false) {
    const checks = [];
    
    // 1. Provedor SMTP
    if (this.state.isConnected) {
      checks.push({ ok: true, msg: 'Provedor de Email (SMTP) conectado.' });
    } else {
      checks.push({ ok: false, msg: 'Você precisa configurar o Provedor de Email na aba Configuração.' });
    }

    // 2. Template
    if (this.state.template.html && this.state.template.html.trim().length > 0) {
      checks.push({ ok: true, msg: 'Template HTML carregado.' });
    } else {
      checks.push({ ok: false, msg: 'O Template de Email está vazio. Cole seu código na aba Template.' });
    }

    // 3. Contatos Válidos (Se for envio em massa)
    if (!isTest) {
      if (this.state.validContacts && this.state.validContacts.length > 0) {
        checks.push({ ok: true, msg: 'Contatos importados com sucesso.' });
      } else {
        checks.push({ ok: false, msg: 'Nenhum contato válido encontrado. Importe uma planilha.' });
      }
    }

    return checks;
  },

  showValidationModal(checks) {
    const overlay = document.getElementById('validation-modal');
    const checklistDiv = document.getElementById('validation-checklist');
    
    checklistDiv.innerHTML = checks.map(c => `
      <div class="check-item ${c.ok ? 'success' : 'error'}">
        <i data-lucide="${c.ok ? 'check-circle' : 'x-circle'}" class="lucide-icon"></i>
        <span>${c.msg}</span>
      </div>
    `).join('');
    
    lucide.createIcons({ root: checklistDiv });
    
    overlay.classList.remove('hidden');

    document.getElementById('val-modal-close-btn').onclick = () => overlay.classList.add('hidden');
    document.getElementById('val-modal-ok-btn').onclick = () => overlay.classList.add('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.add('hidden'); };
  },

  /**
   * Sistema de Notificações Superiores (Sininho)
   */
  notifications: [],
  unreadCount: 0,

  initNotifications() {
    const btn = document.getElementById('btn-notifications');
    const dropdown = document.getElementById('notification-dropdown');
    const clearBtn = document.getElementById('btn-clear-notifications');

    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    clearBtn.addEventListener('click', () => {
      this.notifications = [];
      this.updateNotificationUI();
      // Chama api para marcar no backend
      fetch('/api/mark-unsubscribes-read').catch(()=>{});
    });
  },

  addNotification(type, title, msg) {
    const icons = {
      error: '<i data-lucide="x-circle" style="color:var(--danger)"></i>',
      success: '<i data-lucide="check-circle" style="color:var(--success)"></i>',
      warning: '<i data-lucide="alert-triangle" style="color:var(--warning)"></i>',
      info: '<i data-lucide="info" style="color:var(--accent)"></i>'
    };

    this.notifications.unshift({
      icon: icons[type] || icons.info,
      title: title,
      msg: msg,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });

    if (this.notifications.length > 50) this.notifications.pop();
    
    this.unreadCount++;
    this.updateNotificationUI();
  },

  updateNotificationUI() {
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');
    
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (this.notifications.length === 0) {
      list.innerHTML = '<div class="notification-empty">Nenhuma notificação no momento.</div>';
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <div class="notification-item">
        <div class="notif-icon">${n.icon}</div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.msg}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    `).join('');
    
    lucide.createIcons({ root: list });
  },

  startUnsubscribePolling() {
    setInterval(async () => {
      try {
        const res = await fetch('/api/get-unsubscribes');
        const data = await res.json();
        if (data.success && data.unsubscribes && data.unsubscribes.length > 0) {
          data.unsubscribes.forEach(u => {
            this.addNotification('warning', 'Descadastro Realizado', `O e-mail ${u.email} solicitou o descadastro.`);
            this.toast('warning', 'Novo Descadastro', `${u.email} se descadastrou.`);
          });
          // Marca logo após notificar pra não duplicar
          await fetch('/api/mark-unsubscribes-read');
        }
      } catch(e) {}
    }, 10000); // 10s
  }
};

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());
