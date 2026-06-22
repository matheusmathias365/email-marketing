/**
 * CONTACT MANAGER — Importação e gerenciamento de contatos Excel/CSV
 * Parsing feito no cliente via SheetJS (CDN)
 */
const ContactManager = {
  init() {
    this.setupUpload();
    this.setupClearButton();
  },

  setupUpload() {
    const zone = document.getElementById('contacts-upload-zone');
    const input = document.getElementById('contacts-file-input');

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.parseFile(e.dataTransfer.files[0]);
    });

    input.addEventListener('change', () => {
      if (input.files[0]) this.parseFile(input.files[0]);
    });
  },

  parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      App.toast('error', 'Formato Inválido', 'Use arquivos .xlsx, .xls ou .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellText: true });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (jsonData.length === 0) {
          App.toast('error', 'Arquivo Vazio', 'Nenhum dado encontrado na planilha.');
          return;
        }

        this.processContacts(jsonData, file.name);
      } catch (err) {
        App.toast('error', 'Erro no Parsing', `Não foi possível ler o arquivo: ${err.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
  },

  processContacts(data, fileName) {
    const fields = Object.keys(data[0]);
    App.state.fields = fields;

    // Detectar campo de email
    const emailField = this.detectEmailField(fields, data);

    // Processar e validar
    const seen = new Set();
    const contacts = [];
    let duplicates = 0;

    for (const row of data) {
      const email = String(row[emailField] || '').trim().toLowerCase();
      if (!email) continue;
      
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);

      const contact = {};
      for (const field of fields) {
        contact[field] = row[field] != null ? String(row[field]).trim() : '';
      }
      if (emailField !== 'email') {
        contact.email = email;
      }
      contact._valid = this.isValidEmail(email);
      contacts.push(contact);
    }

    App.state.contacts = contacts;
    App.state.validContacts = contacts.filter(c => c._valid).map(({ _valid, ...rest }) => rest);

    // Atualizar UI
    this.showResults(fields, contacts, data, fileName, duplicates);

    // Atualizar badge
    const badge = document.getElementById('contacts-badge');
    badge.textContent = App.state.validContacts.length;
    badge.classList.remove('hidden');

    // Atualizar preview do template
    if (typeof TemplateEditor !== 'undefined') TemplateEditor.updatePreview();

    App.toast('success', 'Contatos Importados', `${App.state.validContacts.length} contatos válidos carregados de "${fileName}".`);
  },

  detectEmailField(fields, data) {
    const patterns = ['email', 'e-mail', 'e_mail', 'mail', 'emailaddress', 'email_address', 'correo'];
    for (const field of fields) {
      const n = field.toLowerCase().replace(/[\s\-_]/g, '');
      if (patterns.some(p => n.includes(p.replace(/[\s\-_]/g, '')))) return field;
    }
    // Fallback: checar conteúdo
    if (data.length > 0) {
      for (const field of fields) {
        const val = String(data[0][field] || '');
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return field;
      }
    }
    return fields[0];
  },

  isValidEmail(email) {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
  },

  showResults(fields, contacts, rawData, fileName, duplicates) {
    const valid = contacts.filter(c => c._valid).length;
    const invalid = contacts.filter(c => !c._valid).length;

    // Upload zone
    const zone = document.getElementById('contacts-upload-zone');
    zone.classList.add('has-file');
    zone.querySelector('.upload-text').innerHTML = `<i data-lucide="check-circle" class="lucide-icon inline-icon"></i> ${fileName}`;
    zone.querySelector('.upload-hint').innerHTML = `${contacts.length} contatos (${valid} válidos, ${duplicates} duplicados removidos)`;
    if (typeof lucide !== "undefined") lucide.createIcons({ root: zone });

    // Resumo
    document.getElementById('valid-count').textContent = valid;
    document.getElementById('invalid-count').textContent = invalid;
    document.getElementById('fields-count').textContent = fields.length;
    document.getElementById('duplicate-count').textContent = duplicates;
    document.getElementById('contacts-summary-card').classList.remove('hidden');

    // Mapeamento de campos
    this.showFieldsMapping(fields, rawData);
    document.getElementById('fields-mapping-card').classList.remove('hidden');

    // Preview de contatos
    this.showContactsPreview(fields, contacts);
    document.getElementById('contacts-preview-card').classList.remove('hidden');
    document.getElementById('preview-count-badge').textContent = `${Math.min(10, contacts.length)} de ${contacts.length}`;

    // Botão limpar
    document.getElementById('btn-clear-contacts').classList.remove('hidden');
  },

  showFieldsMapping(fields, rawData) {
    const tbody = document.getElementById('fields-table-body');
    tbody.innerHTML = fields.map(field => {
      const samples = rawData.slice(0, 3).map(row => `<td>${this.escapeHtml(String(row[field] || ''))}</td>`).join('');
      return `<tr>
        <td><strong>${this.escapeHtml(field)}</strong></td>
        <td><code style="color:var(--primary-light);background:rgba(108,99,255,0.1);padding:2px 8px;border-radius:4px;">{{${field}}}</code></td>
        ${samples}
      </tr>`;
    }).join('');
  },

  showContactsPreview(fields, contacts) {
    const displayFields = fields.slice(0, 6); // Mostrar máx 6 colunas
    const thead = document.getElementById('contacts-table-head');
    const tbody = document.getElementById('contacts-table-body');

    thead.innerHTML = `<tr>
      <th>#</th>
      ${displayFields.map(f => `<th>${this.escapeHtml(f)}</th>`).join('')}
      <th>Status</th>
    </tr>`;

    tbody.innerHTML = contacts.slice(0, 10).map((c, i) => {
      const statusBadge = c._valid
        ? '<span class="badge badge-success">✅ Válido</span>'
        : '<span class="badge badge-danger">❌ Inválido</span>';

      return `<tr>
        <td>${i + 1}</td>
        ${displayFields.map(f => `<td>${this.escapeHtml(String(c[f] || ''))}</td>`).join('')}
        <td>${statusBadge}</td>
      </tr>`;
    }).join('');
  },

  setupClearButton() {
    document.getElementById('btn-clear-contacts').addEventListener('click', () => {
      App.state.contacts = [];
      App.state.validContacts = [];
      App.state.fields = [];

      document.getElementById('contacts-summary-card').classList.add('hidden');
      document.getElementById('fields-mapping-card').classList.add('hidden');
      document.getElementById('contacts-preview-card').classList.add('hidden');
      document.getElementById('btn-clear-contacts').classList.add('hidden');
      document.getElementById('contacts-badge').classList.add('hidden');

      const zone = document.getElementById('contacts-upload-zone');
      zone.classList.remove('has-file');
      zone.querySelector('.upload-text').textContent = 'Arraste sua planilha de contatos aqui';
      zone.querySelector('.upload-hint').textContent = 'Formatos aceitos: .xlsx, .xls, .csv • Máximo 50MB';
      document.getElementById('contacts-file-input').value = '';

      App.toast('info', 'Limpo', 'Contatos removidos.');
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => ContactManager.init());
