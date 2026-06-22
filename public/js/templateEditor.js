/**
 * TEMPLATE EDITOR — Editor e pré-visualização de templates HTML
 */
const TemplateEditor = {
  debounceTimer: null,

  init() {
    this.setupEditor();
    this.setupUpload();
    this.setupSampleButton();
    this.setupClearButton();
    this.setupRefreshButton();
    this.restoreTemplate();
  },

  setupEditor() {
    const editor = document.getElementById('html-editor');

    editor.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.onEditorChange();
      }, 500);
    });

    // Tab support
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        this.onEditorChange();
      }
    });
  },

  onEditorChange() {
    const html = document.getElementById('html-editor').value;
    const subject = document.getElementById('email-subject').value;

    App.state.template.html = html;
    App.state.template.subject = subject;
    App.state.template.tags = App.extractTags(html + ' ' + subject);
    App.saveState();

    this.updateTags();
    this.updatePreview();
    this.updateSpamScore(subject, html);

    const subjectHint = document.getElementById('preview-subject-hint');
    if (subjectHint) {
      subjectHint.textContent = subject || '(Preencha o assunto)';
    }
  },

  setupUpload() {
    const zone = document.getElementById('template-upload-zone');
    const input = document.getElementById('template-file-input');

    // Drag & drop
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.loadFile(e.dataTransfer.files[0]);
    });

    input.addEventListener('change', () => {
      if (input.files[0]) this.loadFile(input.files[0]);
    });

    // Assunto event
    document.getElementById('email-subject').addEventListener('input', () => this.onEditorChange());
  },

  loadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;

      if (ext === 'json') {
        try {
          const json = JSON.parse(content);
          document.getElementById('html-editor').value = json.html || json.body || json.content || '';
          if (json.subject || json.assunto) {
            document.getElementById('email-subject').value = json.subject || json.assunto;
          }
        } catch (err) {
          App.toast('error', 'Erro no JSON', 'O arquivo JSON não é válido.');
          return;
        }
      } else {
        document.getElementById('html-editor').value = content;
      }

      const zone = document.getElementById('template-upload-zone');
      zone.classList.add('has-file');
      zone.querySelector('.upload-text').textContent = `✅ ${file.name} carregado`;

      this.onEditorChange();
      App.toast('success', 'Template Carregado', `Arquivo "${file.name}" importado com sucesso.`);
    };

    reader.readAsText(file);
  },

  updateTags() {
    const container = document.getElementById('tag-pills');
    const tags = App.state.template.tags;

    if (tags.length === 0) {
      container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">Nenhuma tag detectada — use {{campo}} no HTML</span>';
      return;
    }

    container.innerHTML = tags.map(tag =>
      `<span class="tag-pill" onclick="TemplateEditor.insertTag('${tag}')" title="Clique para inserir">{{${tag}}}</span>`
    ).join('');
  },

  insertTag(tag) {
    const editor = document.getElementById('html-editor');
    const pos = editor.selectionStart;
    const text = editor.value;
    const insertion = `{{${tag}}}`;
    editor.value = text.substring(0, pos) + insertion + text.substring(pos);
    editor.selectionStart = editor.selectionEnd = pos + insertion.length;
    editor.focus();
    this.onEditorChange();
  },

  updatePreview() {
    const html = App.state.template.html;
    const iframe = document.getElementById('preview-iframe');

    if (!html) {
      iframe.srcdoc = `<body style="font-family:Arial,sans-serif;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><p>Escreva ou importe um template HTML para ver a pré-visualização.</p></body>`;
      return;
    }

    // Merge com dados de exemplo
    let previewHtml = html;
    const contacts = App.state.validContacts;

    if (contacts.length > 0) {
      previewHtml = App.mergeTemplate(html, contacts[0]);
    } else {
      // Dados fictícios
      const tags = App.state.template.tags;
      const fakeData = {};
      tags.forEach(tag => { fakeData[tag] = `[${tag}]`; });
      previewHtml = App.mergeTemplate(html, fakeData);
    }

    iframe.srcdoc = previewHtml;
  },

  updateSpamScore(subject, html) {
    let score = 0;
    const warnings = [];
    const fullText = (subject + ' ' + html).toLowerCase();

    // 1. Palavras que acionam filtros de spam
    const spamWords = ['grátis', 'gratis', 'urgente', 'promoção', '100% garantido', 'compre agora', 'dinheiro fácil', 'clique aqui'];
    spamWords.forEach(word => {
      if (fullText.includes(word)) {
        score += 15;
        warnings.push(`Palavra de risco: "${word}"`);
      }
    });

    // 2. Excesso de exclamações
    const exclamations = (fullText.match(/!/g) || []).length;
    if (exclamations > 3) {
      score += 10;
      warnings.push("Excesso de pontos de exclamação (!)");
    }

    // 3. CAIXA ALTA (Caps Lock)
    const upperCaseText = (subject + ' ' + html).replace(/<[^>]*>/g, ''); // remove tags html
    const uppercaseCount = (upperCaseText.match(/[A-Z]{3,}/g) || []).length;
    if (uppercaseCount > 2) {
      score += 10;
      warnings.push("Muito texto em CAIXA ALTA");
    }

    // Calcular nível
    score = Math.min(score, 100);
    const bar = document.getElementById('spam-score-bar');
    const text = document.getElementById('spam-status-text');
    const warningsContainer = document.getElementById('spam-warnings');

    bar.style.width = Math.max(5, score) + '%';

    if (score < 20) {
      bar.style.background = 'var(--accent)';
      text.className = 'badge badge-success';
      text.textContent = 'Excelente (Baixo Risco)';
      warningsContainer.style.display = 'none';
    } else if (score < 50) {
      bar.style.background = 'var(--warning)';
      text.className = 'badge badge-warning';
      text.textContent = 'Atenção (Risco Médio)';
      warningsContainer.style.display = 'block';
    } else {
      bar.style.background = 'var(--danger)';
      text.className = 'badge badge-danger';
      text.textContent = 'Perigo (Alto Risco de Spam)';
      warningsContainer.style.display = 'block';
    }

    if (warnings.length > 0) {
      warningsContainer.innerHTML = '<strong>Avisos:</strong><ul>' + warnings.map(w => `<li>${w}</li>`).join('') + '</ul>';
    }
  },

  setupSampleButton() {
    document.getElementById('btn-load-sample').addEventListener('click', () => {
      const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f7; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #6C63FF, #3B82F6); padding: 40px 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; }
    .content { padding: 30px; }
    .content h2 { color: #333; margin-top: 0; }
    .content p { color: #555; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6C63FF, #3B82F6); color: #fff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Novidades Incríveis!</h1>
      <p>Uma mensagem especial para você, {{nome}}</p>
    </div>
    <div class="content">
      <h2>Olá, {{nome}}!</h2>
      <p>Temos o prazer de compartilhar as últimas novidades com você. Sua conta <strong>{{email}}</strong> está ativa e pronta para aproveitar tudo que temos a oferecer.</p>
      <p>Preparamos uma oferta exclusiva especialmente para clientes como você.</p>
      <a href="#" class="btn">Ver Oferta Exclusiva</a>
      <p>Se tiver alguma dúvida, responda este email que teremos o prazer de ajudar!</p>
      <p>Atenciosamente,<br><strong>Equipe Marketing</strong></p>
    </div>
    <div class="footer">
      <p>Você recebeu este email porque está cadastrado em nossa lista. <a href="#">Descadastrar-se</a></p>
      <p>© 2026 Sua Empresa. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;

      document.getElementById('html-editor').value = sampleHtml;
      document.getElementById('email-subject').value = 'Olá {{nome}}, temos novidades incríveis para você! 🚀';
      this.onEditorChange();
      App.toast('success', 'Exemplo Carregado', 'Template de exemplo com tags {{nome}} e {{email}} inserido.');
    });
  },

  setupClearButton() {
    document.getElementById('btn-clear-template').addEventListener('click', () => {
      document.getElementById('html-editor').value = '';
      document.getElementById('email-subject').value = '';
      
      const zone = document.getElementById('template-upload-zone');
      zone.classList.remove('has-file');
      zone.querySelector('.upload-text').textContent = 'Arraste um arquivo HTML ou JSON aqui';
      document.getElementById('template-file-input').value = '';

      this.onEditorChange();
      App.toast('info', 'Limpo', 'Template e assunto removidos.');
    });
  },

  setupRefreshButton() {
    document.getElementById('btn-refresh-preview').addEventListener('click', () => {
      this.onEditorChange();
      App.toast('info', 'Atualizado', 'Preview atualizado.');
    });
  },

  restoreTemplate() {
    if (App.state.template.html) {
      document.getElementById('html-editor').value = App.state.template.html;
      document.getElementById('email-subject').value = App.state.template.subject || '';
      this.updateTags();
      this.updatePreview();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => TemplateEditor.init());
