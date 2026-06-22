const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const file = path.join(__dirname, '..', 'data', 'unsubscribes.json');
    
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      try {
        let unsubscribes = JSON.parse(content);
        
        // Marca todos como lidos
        unsubscribes = unsubscribes.map(u => ({ ...u, read: true }));
        
        fs.writeFileSync(file, JSON.stringify(unsubscribes, null, 2));
      } catch (e) {
        // ignora
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro mark-unsubscribes-read:', error);
    return res.status(500).json({ success: false, error: 'Erro interno' });
  }
};
