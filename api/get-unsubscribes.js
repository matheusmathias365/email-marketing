const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const file = path.join(dataDir, 'unsubscribes.json');
    let unsubscribes = [];

    try {
      if (fs.existsSync(file)) {
        unsubscribes = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch (e) {}

    if (global.unsubscribes_db) {
      unsubscribes = [...unsubscribes, ...global.unsubscribes_db];
    }
    
    // Remove duplicatas
    unsubscribes = Array.from(new Map(unsubscribes.map(item => [item.email, item])).values());

    const unread = unsubscribes.filter(item => item.read === false);
    return res.status(200).json({ success: true, unsubscribes: unread });
  } catch (error) {
    console.error('Erro get-unsubscribes:', error);
    return res.status(500).json({ success: false, error: 'Erro interno no servidor' });
  }
};
