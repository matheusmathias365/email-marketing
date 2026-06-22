const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const replacements = {
  '📧': '<i data-lucide="mail" class="lucide-icon"></i>',
  '📊': '<i data-lucide="layout-dashboard" class="lucide-icon"></i>',
  '⚙️': '<i data-lucide="settings" class="lucide-icon"></i>',
  '✉️': '<i data-lucide="file-text" class="lucide-icon"></i>',
  '👥': '<i data-lucide="users" class="lucide-icon"></i>',
  '🚀': '<i data-lucide="rocket" class="lucide-icon"></i>',
  '✅': '<i data-lucide="check-circle" class="lucide-icon"></i>',
  '❌': '<i data-lucide="x-circle" class="lucide-icon"></i>',
  '📋': '<i data-lucide="clipboard-list" class="lucide-icon"></i>',
  '🏷️': '<i data-lucide="tag" class="lucide-icon"></i>',
  '🛡️': '<i data-lucide="shield" class="lucide-icon"></i>',
  '🔐': '<i data-lucide="lock" class="lucide-icon"></i>',
  '🐌': '<i data-lucide="snail" class="lucide-icon"></i>',
  '📝': '<i data-lucide="file-edit" class="lucide-icon"></i>',
  '🔗': '<i data-lucide="link" class="lucide-icon"></i>',
  '📮': '<i data-lucide="inbox" class="lucide-icon"></i>',
  '🔑': '<i data-lucide="key" class="lucide-icon"></i>',
  '📁': '<i data-lucide="folder" class="lucide-icon"></i>',
  '📌': '<i data-lucide="pin" class="lucide-icon"></i>',
  '💻': '<i data-lucide="monitor" class="lucide-icon"></i>',
  '👁️': '<i data-lucide="eye" class="lucide-icon"></i>',
  '👀': '<i data-lucide="eye" class="lucide-icon"></i>',
  '⚡': '<i data-lucide="zap" class="lucide-icon"></i>',
  '⏳': '<i data-lucide="hourglass" class="lucide-icon"></i>',
  '📜': '<i data-lucide="scroll-text" class="lucide-icon"></i>',
  '🔄': '<i data-lucide="refresh-cw" class="lucide-icon"></i>',
  '🗑️': '<i data-lucide="trash-2" class="lucide-icon"></i>',
  '🧪': '<i data-lucide="flask-conical" class="lucide-icon"></i>',
  '⏹️': '<i data-lucide="square" class="lucide-icon"></i>',
  '▶️': '<i data-lucide="play" class="lucide-icon"></i>',
  '⏸️': '<i data-lucide="pause" class="lucide-icon"></i>',
  '📬': '<i data-lucide="mail-open" class="lucide-icon"></i>',
  '📨': '<i data-lucide="send" class="lucide-icon"></i>',
  '🏢': '<i data-lucide="building" class="lucide-icon"></i>',
  '🅿️': '<i data-lucide="mail" class="lucide-icon"></i>',
  '🔷': '<i data-lucide="send" class="lucide-icon"></i>',
  '☁️': '<i data-lucide="cloud" class="lucide-icon"></i>',
  '🔧': '<i data-lucide="wrench" class="lucide-icon"></i>',
  '🗺️': '<i data-lucide="map" class="lucide-icon"></i>',
  '📄': '<i data-lucide="file" class="lucide-icon"></i>'
};

for (const [emoji, icon] of Object.entries(replacements)) {
  html = html.split(emoji).join(icon);
}

// Inserir script do Lucide antes de fechar </body>
if (!html.includes('lucide@latest')) {
  html = html.replace('</body>', `  <script src="https://unpkg.com/lucide@latest"></script>\n  <script>lucide.createIcons();</script>\n</body>`);
}

fs.writeFileSync(htmlPath, html);
console.log('HTML updated successfully.');

// Agora atualizar o app.js para rodar lucide.createIcons() quando a aba mudar
const appJsPath = path.join(__dirname, 'public', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');
if (!appJs.includes('lucide.createIcons();')) {
  appJs = appJs.replace('navigateTo(sectionId) {', 'navigateTo(sectionId) {\n    if (typeof lucide !== "undefined") setTimeout(() => lucide.createIcons(), 50);');
}
fs.writeFileSync(appJsPath, appJs);
console.log('app.js updated successfully.');

// Agora atualizar o dashboard.js para substituir emojis por icones de modo seguro
const dashPath = path.join(__dirname, 'public', 'js', 'dashboard.js');
let dash = fs.readFileSync(dashPath, 'utf8');
dash = dash.replace("'Concluído ✅'", "'Concluído <i data-lucide=\"check-circle\" class=\"lucide-icon\"></i>'");
dash = dash.replace('badge.textContent = ', 'badge.innerHTML = ');
fs.writeFileSync(dashPath, dash);
console.log('dashboard.js updated successfully.');

// Atualizar contactManager.js
const cmPath = path.join(__dirname, 'public', 'js', 'contactManager.js');
let cm = fs.readFileSync(cmPath, 'utf8');
cm = cm.replace(/'✅ /g, '\'<i data-lucide="check-circle" class="lucide-icon inline-icon"></i> ');
cm = cm.replace(/'❌ /g, '\'<i data-lucide="x-circle" class="lucide-icon inline-icon"></i> ');
fs.writeFileSync(cmPath, cm);
console.log('contactManager.js updated successfully.');

// Atualizar sendManager.js
const smPath = path.join(__dirname, 'public', 'js', 'sendManager.js');
let sm = fs.readFileSync(smPath, 'utf8');
sm = sm.replace(/'✅ /g, '\'<i data-lucide="check-circle" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'❌ /g, '\'<i data-lucide="x-circle" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'🚀 /g, '\'<i data-lucide="rocket" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'⏸️ /g, '\'<i data-lucide="pause" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'▶️ /g, '\'<i data-lucide="play" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'⏹️ /g, '\'<i data-lucide="square" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'🏁 /g, '\'<i data-lucide="flag" class="lucide-icon inline-icon"></i> ');
sm = sm.replace(/'✅ Tudo pronto para o envio!'/g, '\'<i data-lucide="check-circle" class="lucide-icon inline-icon"></i> Tudo pronto para o envio!\'');
sm = sm.replace(/'⚠️ Falta configurar:/g, '\'<i data-lucide="alert-triangle" class="lucide-icon inline-icon"></i> Falta configurar:');
fs.writeFileSync(smPath, sm);
console.log('sendManager.js updated successfully.');
