# Aplikasi Daftar Harga & Kalkulator Pesanan — Toko Bangunan

Aplikasi web sederhana untuk toko bangunan: (1) daftar harga barang per kategori
dengan varian ukuran/harga, dan (2) kalkulator pesanan yang menghitung total
belanja pelanggan secara otomatis dan real-time.

Stack: **React + Vite** (frontend) · **Node.js/Express** (backend) · **SQLite** (database).

## Struktur folder

```
toko-bangunan/
├── server/          Backend (Express + SQLite)
│   ├── db/          Koneksi & schema database
│   ├── routes/      Endpoint API (barang, pesanan)
│   ├── uploads/      Folder tempat foto barang tersimpan
│   ├── uploadConfig.js
│   └── server.js     Entry point backend
└── client/          Frontend (React + Vite)
    └── src/
        ├── pages/        Halaman: Daftar Harga, Kalkulator, Riwayat, Detail
        ├── components/   Komponen: BarangCard, BarangForm
        ├── api.js        Fungsi pemanggil API backend
        └── utils.js      Format Rupiah & daftar kategori/satuan
```

## Cara menjalankan di komputer kamu

Butuh **Node.js versi 18 ke atas** (cek dengan `node --version`).

### 1. Jalankan backend

```bash
cd server
npm install
npm start
```

Backend akan jalan di **http://localhost:3001**. Database `data.db` otomatis
dibuat saat pertama kali dijalankan — tidak perlu setup database manual.

### 2. Jalankan frontend (buka terminal baru)

```bash
cd client
npm install
npm run dev
```

Frontend akan jalan di **http://localhost:5173** — buka alamat ini di browser
(atau di HP kalau mau akses dari jaringan WiFi yang sama, ganti `localhost`
dengan alamat IP komputer kamu, misal `http://192.168.1.5:5173`).

> Kedua server (backend & frontend) harus jalan bersamaan, jadi butuh 2 jendela
> terminal terbuka.

## Cara pakai

### Halaman "Daftar Harga"
- Klik **+ Tambah Barang** untuk menambah barang baru: isi nama, pilih kategori,
  merek (opsional), upload foto (opsional), lalu klik **+ Tambah Varian**
  berkali-kali untuk menambahkan ukuran & harga (misal 1 Kg, 1/2 Kg, 1/4 Kg).
- Barang bisa dicari lewat kotak pencarian, dan difilter per kategori lewat tab.
- Klik **Edit** di kartu barang untuk mengubah data, atau **Hapus** untuk menghapusnya.

### Halaman "Kalkulator"
- Isi nama pelanggan untuk memulai pesanan baru.
- Ketik nama barang di kotak pencarian, pilih barangnya, pilih varian ukuran,
  isi jumlah, lalu klik **+ Tambah**.
- Total dihitung otomatis setiap kali item ditambah, jumlah diubah, atau item
  dihapus — tidak perlu klik tombol hitung.
- Kalau halaman di-refresh, pesanan yang sedang dikerjakan tidak hilang (asal
  belum diselesaikan).
- Klik **Selesaikan Pesanan** untuk menyimpannya ke riwayat.

### Halaman "Riwayat"
- Menampilkan semua pesanan yang sudah diselesaikan. Klik salah satu untuk
  lihat rinciannya. Harga di riwayat tidak berubah walaupun harga barang
  aslinya diedit belakangan (karena disimpan sebagai snapshot).

## Cara kerja database (untuk belajar)

- Tabel `barang` + `varian_harga`: satu barang (misal "Paku 5cm") bisa punya
  banyak baris varian (1 Kg, 1/2 Kg, 1/4 Kg) masing-masing dengan harga sendiri.
- Tabel `pesanan` + `pesanan_item`: satu pesanan bisa punya banyak item. Tiap
  item menyimpan **snapshot** nama barang, varian, satuan, dan harga saat itu
  — jadi kalau nanti barang diedit/dihapus, riwayat pesanan lama tetap utuh.
- Backend pakai `better-sqlite3` yang sifatnya *synchronous* (tidak perlu
  `async/await` untuk query), jadi kodenya lebih mudah dibaca untuk pemula.

## Troubleshooting

- **"Port sudah dipakai"**: matikan proses lain yang pakai port 3001/5173, atau
  ubah port di `server/server.js` (variabel `PORT`) dan `client/vite.config.js`.
- **Foto tidak muncul**: pastikan backend (port 3001) jalan, karena foto
  disajikan dari sana, bukan dari frontend.
- **Perubahan tidak tersimpan**: cek console terminal backend untuk pesan error.
