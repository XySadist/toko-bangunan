// db/database.js
// File ini bertugas: (1) membuka/membuat file database SQLite,
// (2) membuat tabel-tabel jika belum ada (schema),
// lalu meng-export koneksi db supaya bisa dipakai di file routes.

const Database = require('better-sqlite3');
const path = require('path');

// File data.db akan dibuat otomatis di folder /server kalau belum ada.
const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Aktifkan foreign key constraint (secara default SQLite mematikan ini).
// Ini penting supaya misalnya kita tidak bisa menambah varian_harga
// dengan barang_id yang tidak ada di tabel barang.
db.pragma('foreign_keys = ON');

// exec() menjalankan banyak statement SQL sekaligus.
// "CREATE TABLE IF NOT EXISTS" artinya: kalau tabel sudah ada, tidak diapa-apakan.
// Jadi aman dijalankan setiap kali server start.
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
