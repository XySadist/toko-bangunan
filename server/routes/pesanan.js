// routes/pesanan.js
// Endpoint untuk fitur Kalkulator Pesanan: buat pesanan, tambah/hapus item,
// selesaikan pesanan, dan lihat riwayat.

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Helper: ambil satu pesanan lengkap dengan semua itemnya + total.
function getPesananWithItems(id) {
  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return null;
  const items = db
    .prepare('SELECT * FROM pesanan_item WHERE pesanan_id = ? ORDER BY id ASC')
    .all(id);
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { ...pesanan, items, total };
}

// GET /api/pesanan?status=selesai
// Dipakai untuk halaman riwayat (status=selesai) atau daftar pesanan aktif.
router.get('/', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db.prepare('SELECT * FROM pesanan WHERE status = ? ORDER BY id DESC').all(status);
  } else {
    rows = db.prepare('SELECT * FROM pesanan ORDER BY id DESC').all();
  }

  // Sertakan total per pesanan supaya daftar riwayat bisa langsung tampilkan total.
  const totalStmt = db.prepare(
    'SELECT COALESCE(SUM(subtotal), 0) as total FROM pesanan_item WHERE pesanan_id = ?'
  );
  const result = rows.map((p) => ({
    ...p,
    total: totalStmt.get(p.id).total
  }));

  res.json(result);
});

// GET /api/pesanan/:id
router.get('/:id', (req, res) => {
  const pesanan = getPesananWithItems(req.params.id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  res.json(pesanan);
});

// POST /api/pesanan
// Body JSON: { nama_pelanggan: "Budi" }
router.post('/', (req, res) => {
  const { nama_pelanggan } = req.body;
  if (!nama_pelanggan || !nama_pelanggan.trim()) {
    return res.status(400).json({ error: 'Nama pelanggan tidak boleh kosong' });
  }

  const info = db
    .prepare('INSERT INTO pesanan (nama_pelanggan) VALUES (?)')
    .run(nama_pelanggan.trim());

  res.status(201).json(getPesananWithItems(info.lastInsertRowid));
});

// POST /api/pesanan/:id/items
// Body JSON: { varian_harga_id: 3, jumlah: 2 }
// Menghitung subtotal otomatis dari harga varian saat ini, lalu menyimpannya
// sebagai snapshot (nama, label, satuan, harga) supaya riwayat tidak berubah
// walau data barang/varian aslinya diedit atau dihapus nanti.
router.post('/:id/items', (req, res) => {
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

  // Ambil data varian + nama barangnya untuk dibuat snapshot.
  const varian = db
    .prepare(
      `SELECT v.*, b.nama as nama_barang
       FROM varian_harga v
       JOIN barang b ON b.id = v.barang_id
       WHERE v.id = ?`
    )
    .get(varian_harga_id);

  if (!varian) return res.status(404).json({ error: 'Varian barang tidak ditemukan' });

  const subtotal = varian.harga * jumlahNum;

  const info = db
    .prepare(
      `INSERT INTO pesanan_item
        (pesanan_id, varian_harga_id, nama_barang_snapshot, label_varian_snapshot, satuan_snapshot, harga_satuan_snapshot, jumlah, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, varian.id, varian.nama_barang, varian.label_varian, varian.satuan, varian.harga, jumlahNum, subtotal);

  res.status(201).json(getPesananWithItems(id));
});

// PUT /api/pesanan/:id/items/:itemId
// Body JSON: { jumlah: 5 }  -> update jumlah, subtotal dihitung ulang otomatis
router.put('/:id/items/:itemId', (req, res) => {
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
router.delete('/:id/items/:itemId', (req, res) => {
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
// Menandai pesanan sebagai selesai (masuk ke riwayat) supaya tidak bisa diubah lagi.
router.put('/:id/selesai', (req, res) => {
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
// Membatalkan pesanan yang masih aktif (belum diselesaikan).
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const pesanan = db.prepare('SELECT * FROM pesanan WHERE id = ?').get(id);
  if (!pesanan) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  db.prepare('DELETE FROM pesanan WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
