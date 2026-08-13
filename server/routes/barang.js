// routes/barang.js
// Semua endpoint terkait barang & varian_harga.
// Prefix path-nya nanti di server.js: app.use('/api/barang', router)

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const upload = require('../uploadConfig');
const fs = require('fs');
const path = require('path');

// Helper: ambil satu barang lengkap dengan daftar variannya.
function getBarangWithVarian(id) {
  const barang = db.prepare('SELECT * FROM barang WHERE id = ?').get(id);
  if (!barang) return null;
  const varian = db.prepare('SELECT * FROM varian_harga WHERE barang_id = ? ORDER BY id ASC').all(id);
  return { ...barang, varian_harga: varian };
}

// GET /api/barang?search=paku&kategori=Paku
// Ambil semua barang (bisa difilter pencarian nama & kategori), lengkap dengan variannya.
router.get('/', (req, res) => {
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

  // Ambil varian untuk tiap barang. Untuk jumlah data kecil (toko bangunan)
  // pendekatan query per-barang ini cukup sederhana dan mudah dipahami.
  const varianStmt = db.prepare('SELECT * FROM varian_harga WHERE barang_id = ? ORDER BY id ASC');
  const result = barangList.map((b) => ({
    ...b,
    varian_harga: varianStmt.all(b.id),
  }));

  res.json(result);
});

// GET /api/barang/:id
router.get('/:id', (req, res) => {
  const barang = getBarangWithVarian(req.params.id);
  if (!barang) return res.status(404).json({ error: 'Barang tidak ditemukan' });
  res.json(barang);
});

// POST /api/barang
// Body: JSON dengan field: nama, kategori, merek, foto_url (base64 string atau null),
// dan varian (array): [{"label_varian":"1 Kg","satuan":"Kg","harga":25000}, ...]
router.post('/', (req, res) => {
  try {
    const { nama, kategori, merek, foto_url, varian } = req.body;

    // --- Validasi sederhana ---
    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama barang tidak boleh kosong' });
    }
    if (!kategori || !kategori.trim()) {
      return res.status(400).json({ error: 'Kategori tidak boleh kosong' });
    }

    let varianList = varian || [];
    if (!Array.isArray(varianList) || varianList.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 varian ukuran & harga' });
    }
    for (const v of varianList) {
      if (!v.label_varian || !v.satuan) {
        return res.status(400).json({ error: 'Setiap varian harus punya label ukuran dan satuan' });
      }
      if (typeof v.harga !== 'number' || isNaN(v.harga) || v.harga <= 0) {
        return res.status(400).json({ error: 'Harga varian harus berupa angka positif' });
      }
    }

    const foto_url_final = foto_url || null;

    // Gunakan transaction supaya insert barang + semua variannya
    // "atomic": kalau salah satu gagal, semua dibatalkan (tidak ada data setengah jadi).
    const insertBarang = db.prepare('INSERT INTO barang (nama, kategori, merek, foto_url) VALUES (?, ?, ?, ?)');
    const insertVarian = db.prepare('INSERT INTO varian_harga (barang_id, label_varian, satuan, harga) VALUES (?, ?, ?, ?)');

    const createBarangTx = db.transaction(() => {
      const info = insertBarang.run(nama.trim(), kategori.trim(), merek ? merek.trim() : null, foto_url_final);
      const barangId = info.lastInsertRowid;
      for (const v of varianList) {
        insertVarian.run(barangId, v.label_varian.trim(), v.satuan.trim(), v.harga);
      }
      return barangId;
    });

    const barangId = createBarangTx();
    res.status(201).json(getBarangWithVarian(barangId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
});

// PUT /api/barang/:id
// Sama seperti POST, tapi meng-update data yang ada.
// Strategi varian: hapus semua varian lama, lalu insert ulang dari data baru.
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM barang WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Barang tidak ditemukan' });

    const { nama, kategori, merek, foto_url, varian } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama barang tidak boleh kosong' });
    }
    if (!kategori || !kategori.trim()) {
      return res.status(400).json({ error: 'Kategori tidak boleh kosong' });
    }

    let varianList = varian || [];
    if (!Array.isArray(varianList) || varianList.length === 0) {
      return res.status(400).json({ error: 'Minimal harus ada 1 varian ukuran & harga' });
    }
    for (const v of varianList) {
      if (!v.label_varian || !v.satuan) {
        return res.status(400).json({ error: 'Setiap varian harus punya label ukuran dan satuan' });
      }
      if (typeof v.harga !== 'number' || isNaN(v.harga) || v.harga <= 0) {
        return res.status(400).json({ error: 'Harga varian harus berupa angka positif' });
      }
    }

    // Gunakan foto_url dari request jika ada, atau tetap foto lama
    const foto_url_final = foto_url !== undefined ? foto_url : existing.foto_url;

    const updateBarang = db.prepare('UPDATE barang SET nama = ?, kategori = ?, merek = ?, foto_url = ? WHERE id = ?');
    const deleteVarian = db.prepare('DELETE FROM varian_harga WHERE barang_id = ?');
    const insertVarian = db.prepare('INSERT INTO varian_harga (barang_id, label_varian, satuan, harga) VALUES (?, ?, ?, ?)');

    const updateBarangTx = db.transaction(() => {
      updateBarang.run(nama.trim(), kategori.trim(), merek ? merek.trim() : null, foto_url_final, id);
      deleteVarian.run(id);
      for (const v of varianList) {
        insertVarian.run(id, v.label_varian.trim(), v.satuan.trim(), v.harga);
      }
    });

    updateBarangTx();
    res.json(getBarangWithVarian(id));

    const updateTx = db.transaction(() => {
      updateBarang.run(nama.trim(), kategori.trim(), merek ? merek.trim() : null, foto_url, id);
      deleteVarian.run(id);
      for (const v of varianList) {
        insertVarian.run(id, v.label_varian.trim(), v.satuan.trim(), v.harga);
      }
    });

    updateTx();
    res.json(getBarangWithVarian(id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
});

// DELETE /api/barang/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM barang WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Barang tidak ditemukan' });

  // varian_harga terhapus otomatis lewat ON DELETE CASCADE di schema.
  db.prepare('DELETE FROM barang WHERE id = ?').run(id);

  if (existing.foto_url) {
    const fotoPath = path.join(__dirname, '..', existing.foto_url);
    fs.unlink(fotoPath, () => {});
  }

  res.json({ success: true });
});

module.exports = router;
