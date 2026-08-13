const app = require('../server/server');

// Delegate all incoming requests under /api/* to the Express app
module.exports = (req, res) => {
  try {
    app(req, res);
  } catch (err) {
    console.error('API handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Server error' }));
  }
};
