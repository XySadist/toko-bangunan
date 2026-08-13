// api/db.js - Database setup untuk Vercel serverless
// Menggunakan /tmp untuk Vercel (tempat yang writable)

const Database = require('better-sqlite3');
const path = require('path');

// Di Vercel, gunakan /tmp folder (persistent selama runtime)
const dbPath = path.join('/tmp', 'data.db');
const db = new Database(dbPath);

// Aktifkan foreign key constraint
db.pragma('foreign_keys = ON');

// Create tables jika belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kategori TEXT NOT NULL,
    merek TEXT,
    foto_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS varian_harga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barang_id INTEGER NOT NULL,
    label_varian TEXT NOT NULL,
    satuan TEXT NOT NULL,
    harga REAL NOT NULL,
    FOREIGN KEY (barang_id) REFERENCES barang(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pesanan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_pelanggan TEXT NOT NULL,
    tanggal TEXT DEFAULT (date('now')),
    status TEXT NOT NULL DEFAULT 'aktif',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pesanan_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pesanan_id INTEGER NOT NULL,
    varian_harga_id INTEGER NOT NULL,
    nama_barang_snapshot TEXT NOT NULL,
    label_varian_snapshot TEXT NOT NULL,
    satuan_snapshot TEXT NOT NULL,
    harga_satuan_snapshot REAL NOT NULL,
    jumlah REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (pesanan_id) REFERENCES pesanan(id) ON DELETE CASCADE,
    FOREIGN KEY (varian_harga_id) REFERENCES varian_harga(id)
  );
`);

module.exports = db;
