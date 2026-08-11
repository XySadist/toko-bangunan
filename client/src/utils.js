// src/utils.js

// Format angka jadi "Rp25.000" (pemisah ribuan pakai titik, gaya Indonesia).
export function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

// Daftar kategori barang yang tetap (sesuai spesifikasi awal).
// Ditaruh di 1 tempat supaya konsisten dipakai di form tambah/edit dan filter tab.
export const KATEGORI_LIST = ['Pipa', 'Sambungan Pipa', 'Paku', 'Besi', 'Atap', 'Semen', 'Lainnya'];

// Daftar satuan umum untuk rekomendasi dropdown, tapi user tetap bisa mengetik satuan kustom bebas.
export const SATUAN_LIST = ['Pcs', 'Batang', 'mm', 'Meter', 'Kg', 'Gram', 'Roll', 'Sak', 'Dus', 'Liter', 'Set'];
