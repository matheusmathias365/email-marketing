const nodemailer = require('nodemailer');

/**
 * Configurações pré-definidas dos provedores
 */
const PROVIDERS = {
  gmail: { host: 'smtp.gmail.com', port: 465, secure: true, label: 'Gmail' },
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false, label: 'Outlook / Hotmail' },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 465, secure: true, label: 'Yahoo Mail' },
  office365: { host: 'smtp.office365.com', port: 587, secure: false, label: 'Office 365' },
  zoho: { host: 'smtp.zoho.com', port: 465, secure: true, label: 'Zoho Mail' },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false, label: 'SendGrid' },
  amazonses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false, label: 'Amazon SES' },
  custom: { host: '', port: 587, secure: false, label: 'SMTP Customizado' }
};

/**
 * Cria um transporter Nodemailer a partir da configuração
 */
function createTransporter(config) {
  const provider = PROVIDERS[config.provider] || {};
  const isCustom = config.provider === 'custom';

  // Para provedores conhecidos, usar as configurações pré-definidas
  // Para custom, usar os valores informados pelo usuário
  const host = isCustom ? config.host : (provider.host || config.host);
  const port = isCustom ? parseInt(config.port || 587, 10) : (provider.port || parseInt(config.port || 587, 10));
  const secure = isCustom ? (config.secure === true || config.secure === 'true') : (provider.secure !== undefined ? provider.secure : false);

  const authConfig = config.oauth ? {
    type: 'OAuth2',
    user: config.user,
    clientId: config.oauth.clientId,
    clientSecret: config.oauth.clientSecret,
    refreshToken: config.oauth.refreshToken,
    accessToken: config.oauth.accessToken
  } : {
    user: config.user,
    pass: config.pass
  };

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: authConfig,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });
}

/**
 * Remove HTML tags para gerar versão texto
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { PROVIDERS, createTransporter, stripHtml };
