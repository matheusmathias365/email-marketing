const { createTransporter, stripHtml } = require('./_utils');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Use POST' });

  try {
    const {
      // Credenciais SMTP
      provider, user, pass, host, port, secure, fromName,
      // Dados do email
      to, subject, html, replyTo
    } = req.body;

    if (!to || !html) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: to, html' });
    }

    const transporter = createTransporter({ provider, user, pass, host, port, secure });

    const safeUser = user || 'email@desconhecido.com';
    const domain = safeUser.split('@')[1] || 'localhost';
    const messageId = `<${crypto.randomUUID()}@${domain}>`;

    const mailOptions = {
      from: `"${fromName || safeUser.split('@')[0]}" <${safeUser}>`,
      to,
      subject: subject || 'Email de Teste',
      html,
      text: stripHtml(html),
      messageId,
      headers: {
        'X-Mailer': 'EmailMarketingPro/1.0',
        'X-Priority': '3',
        'Importance': 'normal'
      }
    };

    if (replyTo) mailOptions.replyTo = replyTo;

    const result = await transporter.sendMail(mailOptions);
    transporter.close();

    return res.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    });
  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
