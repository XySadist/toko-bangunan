// api/index.js - Main API handler untuk Vercel serverless
// Ini adalah entry point untuk semua request ke /api

const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ========== BARANG ROUTES ==========

// Helper: ambil barang dengan varian
function getBarangWithVarian(id) {
  const barang = db.prepare('SELECT * FROM barang WHERE id = ?').get(id);
  if (!barang) return null;
  const varian = db.prepare('SELECT * FROM varian_harga WHERE barang_id = ? ORDER BY id ASC').all(id);
  return { ...barang, varian_harga: varian };
}

// GET /api/barang
app.get('/barang', (req, res) => {
  const { search, kategori } = req.query;

  let sql = 'SELECT * FROM barang WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND nama LIKE ?';
    params.push(`%${search}%`);
  }
  if (kategori) {
    sql += ' AND kategori = ?';
    params.push(kategori);
  }
  sql += ' ORDER BY kategori ASC, nama ASC';

  const barangList = db.prepare(sql).all(...params);
  const varianStmt = db.prepare('SELECT * FROM varian_harga WHERE barang_id = ? ORDER BY id ASC');
  const result = barangList.map((b) => ({
    ...b,
    varian_harga: varianStmt.all(b.id),
  }));

  res.json(result);
});

// GET /api/barang/:id
app.get('/barang/:id', (req, res) => {
  const barang = getBarangWithVarian(req.params.id);
  if (!barang) return res.status(404).json({ error: 'Barang tidak ditemukan' });
  res.json(barang);
});

// ========== PESANAN ROUTES ==========

// Helper: ambil pesanan dengan items
function getPesananWithItems(id) {
  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return null;
  const items = db.prepare('SELECT * FROM pesanan_item WHERE pesanan_id = ? ORDER BY id ASC').all(id);
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { ...pesanan, items, total };
}

// GET /api/pesanan
app.get('/pesanan', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db.prepare('SELECT * FROM pesanan WHERE status = ? ORDER BY id DESC').all(status);
  } else {
    rows = db.prepare('SELECT * FROM pesanan ORDER BY id DESC').all();
  }

  const totalStmt = db.prepare('SELECT COALESCE(SUM(subtotal), 0) as total FROM pesanan_item WHERE pesanan_id = ?');
  const result = rows.map((p) => ({
    ...p,
    total: totalStmt.get(p.id).total,
  }));

  res.json(result);
});

// GET /api/pesanan/:id
app.get('/pesanan/:id', (req, res) => {
  const pesanan = getPesananWithItems(req.params.id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  res.json(pesanan);
});

// POST /api/pesanan
app.post('/pesanan', (req, res) => {
  const { nama_pelanggan } = req.body;
  if (!nama_pelanggan || !nama_pelanggan.trim()) {
    return res.status(400).json({ error: 'Nama pelanggan tidak boleh kosong' });
  }

  const info = db.prepare('INSERT INTO pesanan (nama_pelanggan) VALUES (?)').run(nama_pelanggan.trim());

  res.status(201).json(getPesananWithItems(info.lastInsertRowid));
});

// POST /api/pesanan/:id/items
app.post('/pesanan/:id/items', (req, res) => {
  const { id } = req.params;
  const { varian_harga_id, jumlah } = req.body;

  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (pesanan.status !== 'aktif') {
    return res.status(400).json({ error: 'Pesanan ini sudah selesai, tidak bisa diubah lagi' });
  }

  const jumlahNum = Number(jumlah);
  if (!jumlahNum || jumlahNum <= 0) {
    return res.status(400).json({ error: 'Jumlah harus berupa angka positif' });
  }

  const varian = db
    .prepare(
      `SELECT v.*, b.nama as nama_barang
       FROM varian_harga v
       JOIN barang b ON b.id = v.barang_id
       WHERE v.id = ?`,
    )
    .get(varian_harga_id);

  if (!varian) return res.status(404).json({ error: 'Varian barang tidak ditemukan' });

  const subtotal = varian.harga * jumlahNum;

  const info = db
    .prepare(
      `INSERT INTO pesanan_item
        (pesanan_id, varian_harga_id, nama_barang_snapshot, label_varian_snapshot, satuan_snapshot, harga_satuan_snapshot, jumlah, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, varian.id, varian.nama_barang, varian.label_varian, varian.satuan, varian.harga, jumlahNum, subtotal);

  res.status(201).json(getPesananWithItems(id));
});

// PUT /api/pesanan/:id/items/:itemId
app.put('/pesanan/:id/items/:itemId', (req, res) => {
  const { id, itemId } = req.params;
  const { jumlah } = req.body;

  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (pesanan.status !== 'aktif') {
    return res.status(400).json({ error: 'Pesanan ini sudah selesai, tidak bisa diubah lagi' });
  }

  const item = db.prepare('SELECT * FROM pesanan_item WHERE id = ? AND pesanan_id = ?').get(itemId, id);
  if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' });

  const jumlahNum = Number(jumlah);
  if (!jumlahNum || jumlahNum <= 0) {
    return res.status(400).json({ error: 'Jumlah harus berupa angka positif' });
  }

  const subtotal = item.harga_satuan_snapshot * jumlahNum;
  db.prepare('UPDATE pesanan_item SET jumlah = ?, subtotal = ? WHERE id = ?').run(jumlahNum, subtotal, itemId);

  res.json(getPesananWithItems(id));
});

// DELETE /api/pesanan/:id/items/:itemId
app.delete('/pesanan/:id/items/:itemId', (req, res) => {
  const { id, itemId } = req.params;

  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (pesanan.status !== 'aktif') {
    return res.status(400).json({ error: 'Pesanan ini sudah selesai, tidak bisa diubah lagi' });
  }

  db.prepare('DELETE FROM pesanan_item WHERE id = ? AND pesanan_id = ?').run(itemId, id);
  res.json(getPesananWithItems(id));
});

// PUT /api/pesanan/:id/selesai
app.put('/pesanan/:id/selesai', (req, res) => {
  const { id } = req.params;
  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  const items = db.prepare('SELECT * FROM pesanan_item WHERE pesanan_id = ?').all(id);
  if (items.length === 0) {
    return res.status(400).json({ error: 'Pesanan belum punya item, tidak bisa diselesaikan' });
  }

  db.prepare("UPDATE pesanan SET status = 'selesai' WHERE id = ?").run(id);
  res.json(getPesananWithItems(id));
});

// DELETE /api/pesanan/:id
app.delete('/pesanan/:id', (req, res) => {
  const { id } = req.params;
  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  db.prepare('DELETE FROM pesanan WHERE id = ?').run(id);
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Terjadi kesalahan di server' });
});

module.exports = app;
