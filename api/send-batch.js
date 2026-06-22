const { createTransporter, stripHtml } = require('./_utils');
const crypto = require('crypto');

/**
 * Envia um lote de emails (máx 5 por request para caber no timeout de 10s do Vercel free)
 */
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
      provider, user, pass, host, port, secure, fromName, oauth,
      // Lote de emails: [{ to, subject, html }, ...]
      emails,
      replyTo
    } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'Lista de emails inválida' });
    }

    // Limitar batch a 5 emails
    const batch = emails.slice(0, 5);
    const transporter = createTransporter({ provider, user, pass, host, port, secure, oauth });
    const safeUser = user || 'email@desconhecido.com';
    const domain = safeUser.split('@')[1] || 'localhost';
    const senderName = fromName || safeUser.split('@')[0];

    const results = [];

    for (const email of batch) {
      try {
        const messageId = `<${crypto.randomUUID()}@${domain}>`;

        const mailOptions = {
          from: `"${senderName}" <${user}>`,
          to: email.to,
          subject: email.subject || 'Sem Assunto',
          html: email.html,
          text: stripHtml(email.html),
          messageId,
          headers: {
            'X-Mailer': 'EmailMarketingPro/1.0',
            'X-Priority': '3',
            'Importance': 'normal'
          }
        };

        if (replyTo) mailOptions.replyTo = replyTo;

        const result = await transporter.sendMail(mailOptions);
        results.push({
          to: email.to,
          success: true,
          messageId: result.messageId
        });
      } catch (err) {
        results.push({
          to: email.to,
          success: false,
          error: err.message
        });
      }
    }

    transporter.close();

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return res.json({
      success: true,
      sent,
      failed,
      total: batch.length,
      results
    });
  } catch (error) {
    console.error('Batch send error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
