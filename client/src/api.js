// src/api.js
// Semua fungsi di sini membungkus fetch() ke backend Express.
// Dikumpulkan di 1 file supaya komponen React tidak perlu tahu detail URL/method,
// cukup panggil misal getBarang() atau createBarang(data).

const BASE = '/api'; // diteruskan ke backend lewat proxy Vite (lihat vite.config.js)

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request gagal (status ${res.status})`);
  }
  return data;
}

// ---------- Barang & Varian Harga ----------

export function getBarangList({ search = '', kategori = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (kategori) params.set('kategori', kategori);
  const qs = params.toString();
  return fetch(`${BASE}/barang${qs ? `?${qs}` : ''}`).then(handleResponse);
}

export function getBarang(id) {
  return fetch(`${BASE}/barang/${id}`).then(handleResponse);
}

// formData harus berupa objek FormData (karena ada file foto)
export function createBarang(formData) {
  return fetch(`${BASE}/barang`, { method: 'POST', body: formData }).then(handleResponse);
}

export function updateBarang(id, formData) {
  return fetch(`${BASE}/barang/${id}`, { method: 'PUT', body: formData }).then(handleResponse);
}

export function deleteBarang(id) {
  return fetch(`${BASE}/barang/${id}`, { method: 'DELETE' }).then(handleResponse);
}

// ---------- Pesanan ----------

export function getPesananList(status) {
  const qs = status ? `?status=${status}` : '';
  return fetch(`${BASE}/pesanan${qs}`).then(handleResponse);
}

export function getPesanan(id) {
  return fetch(`${BASE}/pesanan/${id}`).then(handleResponse);
}

export function createPesanan(nama_pelanggan) {
  return fetch(`${BASE}/pesanan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pelanggan })
  }).then(handleResponse);
}

export function addPesananItem(pesananId, { varian_harga_id, jumlah }) {
  return fetch(`${BASE}/pesanan/${pesananId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ varian_harga_id, jumlah })
  }).then(handleResponse);
}

export function updatePesananItem(pesananId, itemId, jumlah) {
  return fetch(`${BASE}/pesanan/${pesananId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jumlah })
  }).then(handleResponse);
}

export function deletePesananItem(pesananId, itemId) {
  return fetch(`${BASE}/pesanan/${pesananId}/items/${itemId}`, { method: 'DELETE' }).then(handleResponse);
}

export function selesaikanPesanan(pesananId) {
  return fetch(`${BASE}/pesanan/${pesananId}/selesai`, { method: 'PUT' }).then(handleResponse);
}

export function deletePesanan(pesananId) {
  return fetch(`${BASE}/pesanan/${pesananId}`, { method: 'DELETE' }).then(handleResponse);
}
