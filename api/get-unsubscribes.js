const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const file = path.join(__dirname, '..', 'data', 'unsubscribes.json');
    let unsubscribes = [];

    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      try {
        unsubscribes = JSON.parse(content);
      } catch (e) {
        unsubscribes = [];
      }
    }

    // Retorna todos os unreads
    const unread = unsubscribes.filter(u => !u.read);

    return res.status(200).json({ success: true, unsubscribes: unread });
  } catch (error) {
    console.error('Erro get-unsubscribes:', error);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
};
