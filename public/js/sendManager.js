/**
 * SEND MANAGER — Envio de teste e disparo em massa
 * Toda a orquestração roda no cliente, chamando a API para cada lote
 */
const SendManager = {
  sending: false,
  paused: false,
  cancelled: false,
  stats: { sent: 0, failed: 0, total: 0, pending: 0 },

  init() {
    this.setupTestButton();
    this.setupBulkButton();
    this.setupControls();
    this.setupSpeedControls();
  },

  refreshSummary() {
    const cfg = App.state.smtpConfig;
    document.getElementById('send-provider').textContent = cfg ? (App.state.provider || '—').toUpperCase() : 'Não configurado';
    document.getElementById('send-from').textContent = cfg?.user || '—';
    document.getElementById('send-subject').textContent = App.state.template.subject || '—';
    document.getElementById('send-total').textContent = `${App.state.validContacts.length} contatos`;

    // Habilitar botões
    const ready = App.state.isConnected && App.state.template.html && App.state.validContacts.length > 0;
    document.getElementById('btn-send-bulk').disabled = !ready || this.sending;
    document.getElementById('btn-send-test').disabled = !App.state.isConnected || !App.state.template.html;

    if (ready) {
      document.getElementById('send-readiness').textContent = '<i data-lucide="check-circle" class="lucide-icon inline-icon"></i> Tudo pronto para o envio!';
      document.getElementById('send-readiness').style.color = 'var(--accent)';
    } else {
      const missing = [];
      if (!App.state.isConnected) missing.push('provedor de email');
      if (!App.state.template.html) missing.push('template HTML');
      if (App.state.validContacts.length === 0) missing.push('contatos');
      document.getElementById('send-readiness').textContent = `⚠️ Falta configurar: ${missing.join(', ')}`;
      document.getElementById('send-readiness').style.color = 'var(--warning)';
    }
  },

  setupTestButton() {
    document.getElementById('btn-send-test').addEventListener('click', async () => {
      const testEmail = document.getElementById('test-email-input').value.trim();
      if (!testEmail) {
        App.toast('warning', 'Email Obrigatório', 'Insira um email para teste.');
        return;
      }

      const btn = document.getElementById('btn-send-test');
      btn.disabled = true;
      btn.textContent = '⏳ Enviando...';

      try {
        const cfg = App.state.smtpConfig;
        let html = App.state.template.html;
        let subject = App.state.template.subject || 'Email de Teste';

        // Merge com primeiro contato ou dados fictícios
        if (App.state.validContacts.length > 0) {
          html = App.mergeTemplate(html, App.state.validContacts[0]);
          subject = App.mergeTemplate(subject, App.state.validContacts[0]);
        }

        await App.apiCall('send', {
          body: { ...cfg, to: testEmail, subject, html }
        });

        App.toast('success', 'Teste Enviado!', `Email de teste enviado para ${testEmail}. Verifique sua caixa de entrada.`);
      } catch (error) {
        App.toast('error', 'Erro no Teste', error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🧪 Enviar Teste';
      }
    });
  },

  setupBulkButton() {
    document.getElementById('btn-send-bulk').addEventListener('click', async () => {
      const total = App.state.validContacts.length;
      const confirmed = await App.confirm(
        '<i data-lucide="rocket" class="lucide-icon inline-icon"></i> Confirmar Envio em Massa',
        `<p style="margin-bottom:16px;">Você está prestes a enviar <strong>${total} emails</strong> usando o provedor <strong>${App.state.provider?.toUpperCase()}</strong>.</p>
         <p style="color:var(--warning);">⚠️ Esta ação não pode ser desfeita. Certifique-se de que testou o envio antes.</p>`
      );

      if (confirmed) this.startBulkSend();
    });
  },

  async startBulkSend() {
    const contacts = App.state.validContacts;
    const cfg = App.state.smtpConfig;
    const htmlTemplate = App.state.template.html;
    const subjectTemplate = App.state.template.subject || 'Sem Assunto';
    const batchSize = parseInt(document.getElementById('batch-size').value) || 3;
    const delay = parseInt(document.getElementById('send-delay').value) || 2000;

    this.sending = true;
    this.paused = false;
    this.cancelled = false;
    this.stats = { sent: 0, failed: 0, total: contacts.length, pending: contacts.length };
    const startTime = Date.now();

    // Mostrar UI de progresso
    document.getElementById('progress-card').classList.remove('hidden');
    document.getElementById('log-card').classList.remove('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
    document.getElementById('btn-cancel').classList.remove('hidden');
    document.getElementById('btn-send-bulk').disabled = true;

    this.clearLog();
    this.addLog('info', `🚀 Iniciando envio para ${contacts.length} contatos (lotes de ${batchSize}, delay ${delay}ms)`);

    // Processar em lotes
    for (let i = 0; i < contacts.length; i += batchSize) {
      if (this.cancelled) break;

      // Esperar enquanto pausado
      while (this.paused && !this.cancelled) {
        await new Promise(r => setTimeout(r, 300));
      }
      if (this.cancelled) break;

      const batch = contacts.slice(i, i + batchSize);
      const emails = batch.map(contact => ({
        to: contact.email || contact.Email || contact.EMAIL,
        subject: App.mergeTemplate(subjectTemplate, contact),
        html: App.mergeTemplate(htmlTemplate, contact)
      }));

      try {
        const result = await App.apiCall('send-batch', {
          body: { ...cfg, emails }
        });

        // Processar resultados
        for (const r of result.results) {
          if (r.success) {
            this.stats.sent++;
            this.stats.pending--;
            this.addLog('success', `✅ ${r.to} — enviado`);
          } else {
            this.stats.failed++;
            this.stats.pending--;
            this.addLog('error', `❌ ${r.to} — ${r.error}`);
          }
        }
      } catch (error) {
        // Falha no lote inteiro
        for (const contact of batch) {
          this.stats.failed++;
          this.stats.pending--;
          this.addLog('error', `❌ ${contact.email} — Erro no lote: ${error.message}`);
        }
      }

      // Atualizar progresso
      this.updateProgress(startTime);

      // Delay entre lotes
      if (i + batchSize < contacts.length && !this.cancelled) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Finalizar
    this.sending = false;
    document.getElementById('btn-pause').classList.add('hidden');
    document.getElementById('btn-resume').classList.add('hidden');
    document.getElementById('btn-cancel').classList.add('hidden');
    document.getElementById('btn-send-bulk').disabled = false;

    if (this.cancelled) {
      this.addLog('warning', `⏹️ Envio cancelado. ${this.stats.sent} enviados, ${this.stats.failed} falhas, ${this.stats.pending} não enviados.`);
      App.toast('warning', 'Cancelado', `Envio cancelado. ${this.stats.sent} de ${this.stats.total} enviados.`);
    } else {
      this.addLog('info', `🏁 Envio concluído! ${this.stats.sent} enviados, ${this.stats.failed} falhas.`);
      App.toast('success', 'Envio Concluído! 🎉', `${this.stats.sent} de ${this.stats.total} emails enviados com sucesso.`);
    }

    this.updateProgress(startTime);
    this.saveToHistory(subjectTemplate);
  },

  saveToHistory(subject) {
    if (this.stats.sent === 0 && this.stats.failed === 0) return; // Nao salvou nada

    const historyData = localStorage.getItem('emailpro_history');
    let history = [];
    if (historyData) {
      try { history = JSON.parse(historyData); } catch(e) {}
    }

    history.push({
      date: new Date().toISOString(),
      subject: subject,
      sent: this.stats.sent,
      failed: this.stats.failed,
      total: this.stats.total
    });

    // Manter no máximo os últimos 50 disparos
    if (history.length > 50) history.shift();

    localStorage.setItem('emailpro_history', JSON.stringify(history));

    // Atualizar UI no dashboard se existir
    if (typeof Dashboard !== 'undefined') {
      Dashboard.loadHistory();
    }
  },

  updateProgress(startTime) {
    const { sent, failed, total, pending } = this.stats;
    const processed = sent + failed;
    const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

    // Barra de progresso
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-percent').textContent = `${progress}%`;

    // Círculo SVG
    const circle = document.getElementById('progress-circle');
    const circumference = 2 * Math.PI * 54; // r=54
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Textos
    document.getElementById('progress-sent').textContent = `${processed} de ${total} processados`;
    document.getElementById('prog-sent').textContent = sent;
    document.getElementById('prog-failed').textContent = failed;
    document.getElementById('prog-pending').textContent = pending;

    // Tempo restante
    const elapsed = (Date.now() - startTime) / 1000;
    if (processed > 0) {
      const avgTime = elapsed / processed;
      const remaining = Math.round(avgTime * pending);
      document.getElementById('progress-time').textContent = `Tempo restante: ~${App.formatTime(remaining)}`;
    }
  },

  setupControls() {
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.paused = true;
      document.getElementById('btn-pause').classList.add('hidden');
      document.getElementById('btn-resume').classList.remove('hidden');
      this.addLog('warning', '<i data-lucide="pause" class="lucide-icon inline-icon"></i> Envio pausado pelo usuário');
      App.toast('info', 'Pausado', 'O envio foi pausado.');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.paused = false;
      document.getElementById('btn-resume').classList.add('hidden');
      document.getElementById('btn-pause').classList.remove('hidden');
      this.addLog('info', '<i data-lucide="play" class="lucide-icon inline-icon"></i> Envio retomado');
      App.toast('info', 'Retomado', 'O envio foi retomado.');
    });

    document.getElementById('btn-cancel').addEventListener('click', async () => {
      const confirmed = await App.confirm('<i data-lucide="square" class="lucide-icon inline-icon"></i> Cancelar Envio', '<p>Tem certeza? Os emails já enviados não serão afetados.</p>');
      if (confirmed) {
        this.cancelled = true;
        this.paused = false;
      }
    });

    document.getElementById('btn-clear-log').addEventListener('click', () => this.clearLog());
  },

  setupSpeedControls() {
    const delaySlider = document.getElementById('send-delay');
    const delayValue = document.getElementById('send-delay-value');
    delaySlider.addEventListener('input', () => {
      delayValue.textContent = `${(delaySlider.value / 1000).toFixed(1)}s`;
    });

    const batchSlider = document.getElementById('batch-size');
    const batchValue = document.getElementById('batch-size-value');
    batchSlider.addEventListener('input', () => {
      batchValue.textContent = batchSlider.value;
    });
  },

  addLog(type, message) {
    const log = document.getElementById('send-log');
    const time = new Date().toLocaleTimeString('pt-BR');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span>${message}</span>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  },

  clearLog() {
    document.getElementById('send-log').innerHTML = '';
  }
};

document.addEventListener('DOMContentLoaded', () => SendManager.init());
