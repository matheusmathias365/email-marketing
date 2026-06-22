/**
 * DASHBOARD — Painel principal com visão geral e etapas
 */
const Dashboard = {
  init() {
    this.refresh();
  },

  refresh() {
    // Provedor
    const provider = App.state.provider;
    document.getElementById('dash-provider').textContent = provider ? provider.toUpperCase() : '—';

    // Template
    const hasTemplate = App.state.template.html ? 'Sim ✅' : '—';
    document.getElementById('dash-template').textContent = hasTemplate;

    // Contatos
    document.getElementById('dash-contacts-count').textContent = App.state.validContacts.length;

    // Tags
    document.getElementById('dash-tags-count').textContent = App.state.template.tags.length;

    // Histórico
    this.loadHistory();

    // Etapas
    this.updateStep('config', App.state.isConnected);
    this.updateStep('template', !!App.state.template.html);
    this.updateStep('contacts', App.state.validContacts.length > 0);
    
    // Disparo concluído se tem histórico local
    const historyData = localStorage.getItem('emailpro_history');
    let hasSent = false;
    try {
      if (historyData && JSON.parse(historyData).length > 0) hasSent = true;
    } catch(e) {}
    this.updateStep('send', hasSent);
  },

  updateStep(stepId, completed) {
    const badge = document.getElementById(`step-${stepId}-badge`);
    if (completed) {
      badge.innerHTML = 'Concluído <i data-lucide="check-circle" class="lucide-icon inline-icon"></i>';
      badge.className = 'badge badge-success';
    } else {
      badge.textContent = 'Pendente';
      badge.className = 'badge badge-warning';
    }
  },

  loadHistory() {
    const historyData = localStorage.getItem('emailpro_history');
    const tbody = document.getElementById('history-table-body');
    const btnClear = document.getElementById('btn-clear-history');

    if (!historyData) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum disparo registrado neste navegador.</td></tr>';
      btnClear.style.display = 'none';
      return;
    }

    try {
      const history = JSON.parse(historyData);
      if (history.length === 0) throw new Error('Empty');
      
      btnClear.style.display = 'inline-flex';
      
      // Limpar evento antigo se houver para não duplicar
      btnClear.replaceWith(btnClear.cloneNode(true));
      document.getElementById('btn-clear-history').addEventListener('click', () => {
        if(confirm('Tem certeza que deseja apagar o histórico local?')) {
          localStorage.removeItem('emailpro_history');
          this.loadHistory();
        }
      });

      tbody.innerHTML = history.reverse().map(item => `
        <tr>
          <td>${new Date(item.date).toLocaleString()}</td>
          <td><strong>${this.escapeHtml(item.subject)}</strong></td>
          <td style="color:var(--accent); font-weight:600;">${item.sent}</td>
          <td style="color:var(--danger);">${item.failed}</td>
          <td>
            <span class="badge ${item.failed > 0 ? (item.sent > 0 ? 'badge-warning' : 'badge-danger') : 'badge-success'}">
              ${item.failed > 0 ? (item.sent > 0 ? 'Parcial' : 'Falha') : 'Sucesso'}
            </span>
          </td>
        </tr>
      `).join('');
      
      if (typeof lucide !== "undefined") lucide.createIcons();
    } catch(e) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum disparo registrado neste navegador.</td></tr>';
      btnClear.style.display = 'none';
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
