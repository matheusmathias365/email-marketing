const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Configuração de CORS já feita no dev-server, mas adicionamos para garantir
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // O dev-server não faz parse automático da URL querystring
    const urlParts = new URL(req.url, `http://${req.headers.host}`);
    const email = urlParts.searchParams.get('email');

    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail não fornecido' });
    }

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const file = path.join(dataDir, 'unsubscribes.json');
    let unsubscribes = [];

    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      try {
        unsubscribes = JSON.parse(content);
      } catch (e) {
        unsubscribes = [];
      }
    }

    // Verifica se já está na lista
    if (!unsubscribes.some(item => item.email === email)) {
      unsubscribes.push({
        email: email,
        date: new Date().toISOString(),
        read: false // A dashboard marcará como true depois
      });
      fs.writeFileSync(file, JSON.stringify(unsubscribes, null, 2));
    }

    // Sucesso - o html publico que cuida da exibicao chamará essa rota
    return res.status(200).json({ success: true, message: 'Email removido com sucesso' });
  } catch (error) {
    console.error('Erro no unsubscribe:', error);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
};
