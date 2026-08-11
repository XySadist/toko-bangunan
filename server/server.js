// server.js
// Entry point backend. Menjalankan Express, menghubungkan routes,
// dan menyajikan folder /uploads secara statis supaya foto bisa diakses browser.

const express = require('express');
const cors = require('cors');
const path = require('path');

const barangRouter = require('./routes/barang');
const pesananRouter = require('./routes/pesanan');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // izinkan frontend (port beda) mengakses API ini
app.use(express.json()); // supaya req.body bisa baca JSON

// Sajikan file di folder /uploads sebagai static file,
// jadi foto bisa diakses lewat http://localhost:3001/uploads/nama-file.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routes ---
app.use('/api/barang', barangRouter);
app.use('/api/pesanan', pesananRouter);

// Endpoint sederhana buat cek server hidup
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Serve React Client (Production Mode) ---
const fs = require('fs');
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Handler kalau ada error yang tidak tertangkap (misal error dari multer)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan di server' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
