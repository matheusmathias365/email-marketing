const { PROVIDERS, createTransporter } = require('./_utils');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    // Verificar conexão SMTP
    try {
      const { provider, user, pass, host, port, secure } = req.body;

      if (!provider || !user || !pass) {
        return res.status(400).json({ success: false, error: 'Campos obrigatórios: provider, user, pass' });
      }

      const transporter = createTransporter({ provider, user, pass, host, port, secure });
      await transporter.verify();
      transporter.close();

      const providerInfo = PROVIDERS[provider] || {};
      return res.json({
        success: true,
        message: `Conexão com ${host || providerInfo.host} estabelecida com sucesso!`
      });
    } catch (error) {
      let userMessage = error.message;
      if (error.code === 'EAUTH') {
        userMessage = 'Falha na autenticação. Verifique seu email e senha/senha de app.';
      } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
        userMessage = 'Não foi possível conectar ao servidor SMTP. Verifique host e porta.';
      } else if (error.code === 'ETIMEDOUT') {
        userMessage = 'Tempo de conexão esgotado. Verifique sua internet.';
      }
      return res.status(400).json({ success: false, error: userMessage });
    }
  }

  if (req.method === 'GET') {
    // Listar provedores
    const providers = Object.entries(PROVIDERS).map(([id, config]) => ({
      id,
      label: config.label,
      host: config.host,
      port: config.port,
      secure: config.secure
    }));
    return res.json({ success: true, providers });
  }

  return res.status(405).json({ success: false, error: 'Método não permitido' });
};
