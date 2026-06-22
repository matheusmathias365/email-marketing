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

    let unsubscribes = [];
    const dataDir = path.join(__dirname, '..', 'data');
    const file = path.join(dataDir, 'unsubscribes.json');

    // 1. Tentar ler do arquivo local (se existir e for legível)
    try {
      if (fs.existsSync(file)) {
        unsubscribes = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch (e) {
      // Ignora erro de leitura
    }

    // 2. Mesclar com a memória global (para instâncias Serverless / Vercel)
    if (!global.unsubscribes_db) {
      global.unsubscribes_db = [];
    }
    unsubscribes = [...unsubscribes, ...global.unsubscribes_db];
    
    // Remover duplicatas por email
    unsubscribes = Array.from(new Map(unsubscribes.map(item => [item.email, item])).values());

    // 3. Verifica se já está na lista
    if (!unsubscribes.some(item => item.email === email)) {
      const newEntry = {
        email: email,
        date: new Date().toISOString(),
        read: false
      };
      
      unsubscribes.push(newEntry);
      global.unsubscribes_db.push(newEntry); // Salva na memória da Lambda

      // 4. Tentar gravar no disco (Falhar silenciosamente na Vercel pois o disco é Read-Only)
      try {
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(unsubscribes, null, 2));
      } catch (writeError) {
        console.log("Vercel Serverless environment detected (Read-only disk). Using memory store temporarily.");
      }
    }

    // Sucesso
    return res.status(200).json({ success: true, message: 'Email removido com sucesso' });
  } catch (error) {
    console.error('Erro no unsubscribe:', error);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
};
