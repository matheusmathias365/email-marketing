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

  /**
   * Inicializa a aplicação
   */
  init() {
    this.setupNavigation();
    this.loadState();
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

    if (this.state.isConnected) {
      dot.className = 'status-dot connected';
      text.textContent = this.state.smtpConfig?.user || 'Conectado';
    } else {
      dot.className = 'status-dot';
      text.textContent = 'Desconectado';
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
  }
};

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());
