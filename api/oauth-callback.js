const { OAuth2Client } = require('google-auth-library');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { code } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Parâmetros OAuth incompletos no servidor.' });
    }

    // Quando usamos popup no frontend, a redirectUri tem que ser 'postmessage'
    const oAuth2Client = new OAuth2Client(clientId, clientSecret, 'postmessage');

    // Trocar o código pelo Refresh Token e Access Token
    const { tokens } = await oAuth2Client.getToken(code);

    return res.status(200).json({
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    });

  } catch (error) {
    console.error('Erro no OAuth Callback:', error);
    return res.status(500).json({ 
      error: 'Falha ao autenticar com o Google.',
      details: error.message 
    });
  }
};
