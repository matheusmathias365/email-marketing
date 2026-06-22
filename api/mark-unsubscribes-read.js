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

    let changed = false;
    unsubscribes.forEach(u => {
      if (!u.read) {
        u.read = true;
        changed = true;
      }
    });

    if (global.unsubscribes_db) {
      global.unsubscribes_db.forEach(u => u.read = true);
    }

    if (changed) {
      try {
        fs.writeFileSync(file, JSON.stringify(unsubscribes, null, 2));
      } catch (e) {}
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro mark-unsubscribes-read:', error);
    return res.status(500).json({ success: false, error: 'Erro interno' });
  }
};
