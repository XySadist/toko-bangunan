// src/api.js
// Membungkus fetch() ke backend Express, dan menyediakan fallback localStorage jika dipanggil di environment statis (seperti Vercel Demo).

const BASE = '/api';

// Sample data awal jika backend offline (Vercel static demo)
const DEFAULT_BARANG = [
  {
    id: 1,
    nama: 'Pipa PVC AW 1/2 inch',
    kategori: 'Pipa',
    merek: 'Rucika',
    foto_url: null,
    varian_harga: [
      { id: 101, barang_id: 1, label_varian: '4 Meter', satuan: 'Batang', harga: 32000 },
      { id: 102, barang_id: 1, label_varian: '20 mm', satuan: 'mm', harga: 8000 }
    ]
  },
  {
    id: 2,
    nama: 'Paku Kayu 5 cm',
    kategori: 'Paku',
    merek: 'Gajah',
    foto_url: null,
    varian_harga: [
      { id: 201, barang_id: 2, label_varian: '1 Kg', satuan: 'Kg', harga: 22000 },
      { id: 202, barang_id: 2, label_varian: '1/2 Kg', satuan: 'Kg', harga: 11500 }
    ]
  },
  {
    id: 3,
    nama: 'Semen PPC 50 Kg',
    kategori: 'Semen',
    merek: 'Gresik',
    foto_url: null,
    varian_harga: [
      { id: 301, barang_id: 3, label_varian: '1 Sak (50 Kg)', satuan: 'Sak', harga: 68000 }
    ]
  }
];

function getLocalData(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLocalData(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

// Inisialisasi storage awal jika belum ada
if (typeof window !== 'undefined') {
  if (!localStorage.getItem('tb_barang')) {
    setLocalData('tb_barang', DEFAULT_BARANG);
  }
  if (!localStorage.getItem('tb_pesanan')) {
    setLocalData('tb_pesanan', []);
  }
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request gagal (status ${res.status})`);
  }
  return data;
}

// ---------- Barang & Varian Harga ----------

export async function getBarangList({ search = '', kategori = '' } = {}) {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (kategori) params.set('kategori', kategori);
    const qs = params.toString();
    const res = await fetch(`${BASE}/barang${qs ? `?${qs}` : ''}`);
    if (res.ok) return await res.json();
  } catch (e) {}

  // Fallback LocalStorage (Vercel Mode)
  let list = getLocalData('tb_barang', DEFAULT_BARANG);
  if (search) {
    list = list.filter((b) => b.nama.toLowerCase().includes(search.toLowerCase()));
  }
  if (kategori) {
    list = list.filter((b) => b.kategori === kategori);
  }
  return list;
}

export async function getBarang(id) {
  try {
    const res = await fetch(`${BASE}/barang/${id}`);
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_barang', DEFAULT_BARANG);
  return list.find((b) => String(b.id) === String(id)) || null;
}

export async function createBarang(formData) {
  try {
    const res = await fetch(`${BASE}/barang`, { method: 'POST', body: formData });
    if (res.ok) return await res.json();
  } catch (e) {}

  // Fallback LocalStorage
  const nama = formData.get('nama');
  const kategori = formData.get('kategori');
  const merek = formData.get('merek');
  const varianStr = formData.get('varian');
  const varianList = varianStr ? JSON.parse(varianStr) : [];

  const list = getLocalData('tb_barang', DEFAULT_BARANG);
  const newId = Date.now();
  const newBarang = {
    id: newId,
    nama,
    kategori,
    merek: merek || null,
    foto_url: null,
    varian_harga: varianList.map((v, i) => ({ id: newId + i + 1, barang_id: newId, ...v }))
  };
  list.push(newBarang);
  setLocalData('tb_barang', list);
  return newBarang;
}

export async function updateBarang(id, formData) {
  try {
    const res = await fetch(`${BASE}/barang/${id}`, { method: 'PUT', body: formData });
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_barang', DEFAULT_BARANG);
  const idx = list.findIndex((b) => String(b.id) === String(id));
  if (idx !== -1) {
    const nama = formData.get('nama');
    const kategori = formData.get('kategori');
    const merek = formData.get('merek');
    const varianStr = formData.get('varian');
    const varianList = varianStr ? JSON.parse(varianStr) : [];
    list[idx] = {
      ...list[idx],
      nama,
      kategori,
      merek,
      varian_harga: varianList.map((v, i) => ({ id: Date.now() + i, barang_id: id, ...v }))
    };
    setLocalData('tb_barang', list);
    return list[idx];
  }
  throw new Error('Barang tidak ditemukan');
}

export async function deleteBarang(id) {
  try {
    const res = await fetch(`${BASE}/barang/${id}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) {}

  let list = getLocalData('tb_barang', DEFAULT_BARANG);
  list = list.filter((b) => String(b.id) !== String(id));
  setLocalData('tb_barang', list);
  return { success: true };
}

// ---------- Pesanan ----------

export async function getPesananList(status) {
  try {
    const qs = status ? `?status=${status}` : '';
    const res = await fetch(`${BASE}/pesanan${qs}`);
    if (res.ok) return await res.json();
  } catch (e) {}

  let list = getLocalData('tb_pesanan', []);
  if (status) {
    list = list.filter((p) => p.status === status);
  }
  return list;
}

export async function getPesanan(id) {
  try {
    const res = await fetch(`${BASE}/pesanan/${id}`);
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_pesanan', []);
  return list.find((p) => String(p.id) === String(id)) || null;
}

export async function createPesanan(nama_pelanggan) {
  try {
    const res = await fetch(`${BASE}/pesanan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_pelanggan })
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_pesanan', []);
  const newPesanan = {
    id: Date.now(),
    nama_pelanggan,
    tanggal: new Date().toISOString().split('T')[0],
    status: 'aktif',
    items: [],
    total: 0
  };
  list.unshift(newPesanan);
  setLocalData('tb_pesanan', list);
  return newPesanan;
}

export async function addPesananItem(pesananId, { varian_harga_id, jumlah }) {
  try {
    const res = await fetch(`${BASE}/pesanan/${pesananId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ varian_harga_id, jumlah })
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_pesanan', []);
  const barangList = getLocalData('tb_barang', DEFAULT_BARANG);
  const pIdx = list.findIndex((p) => String(p.id) === String(pesananId));

  if (pIdx !== -1) {
    let selectedVarian = null;
    let selectedBarang = null;

    for (const b of barangList) {
      const v = b.varian_harga.find((item) => String(item.id) === String(varian_harga_id));
      if (v) {
        selectedVarian = v;
        selectedBarang = b;
        break;
      }
    }

    if (selectedVarian && selectedBarang) {
      const subtotal = selectedVarian.harga * Number(jumlah);
      const newItem = {
        id: Date.now(),
        pesanan_id: pesananId,
        varian_harga_id,
        nama_barang_snapshot: selectedBarang.nama,
        label_varian_snapshot: selectedVarian.label_varian,
        satuan_snapshot: selectedVarian.satuan,
        harga_satuan_snapshot: selectedVarian.harga,
        jumlah: Number(jumlah),
        subtotal
      };
      list[pIdx].items.push(newItem);
      list[pIdx].total = list[pIdx].items.reduce((sum, item) => sum + item.subtotal, 0);
      setLocalData('tb_pesanan', list);
      return list[pIdx];
    }
  }
  throw new Error('Gagal menambah item pesanan');
}

export async function updatePesananItem(pesananId, itemId, jumlah) {
  try {
    const res = await fetch(`${BASE}/pesanan/${pesananId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jumlah })
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_pesanan', []);
  const pIdx = list.findIndex((p) => String(p.id) === String(pesananId));
  if (pIdx !== -1) {
    const iIdx = list[pIdx].items.findIndex((it) => String(it.id) === String(itemId));
    if (iIdx !== -1) {
      list[pIdx].items[iIdx].jumlah = Number(jumlah);
      list[pIdx].items[iIdx].subtotal = list[pIdx].items[iIdx].harga_satuan_snapshot * Number(jumlah);
      list[pIdx].total = list[pIdx].items.reduce((sum, item) => sum + item.subtotal, 0);
      setLocalData('tb_pesanan', list);
      return list[pIdx];
    }
  }
  throw new Error('Item tidak ditemukan');
}

export async function deletePesananItem(pesananId, itemId) {
  try {
    const res = await fetch(`${BASE}/pesanan/${pesananId}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_pesanan', []);
  const pIdx = list.findIndex((p) => String(p.id) === String(pesananId));
  if (pIdx !== -1) {
    list[pIdx].items = list[pIdx].items.filter((it) => String(it.id) !== String(itemId));
    list[pIdx].total = list[pIdx].items.reduce((sum, item) => sum + item.subtotal, 0);
    setLocalData('tb_pesanan', list);
    return list[pIdx];
  }
  return { success: true };
}

export async function selesaikanPesanan(pesananId) {
  try {
    const res = await fetch(`${BASE}/pesanan/${pesananId}/selesai`, { method: 'PUT' });
    if (res.ok) return await res.json();
  } catch (e) {}

  const list = getLocalData('tb_pesanan', []);
  const pIdx = list.findIndex((p) => String(p.id) === String(pesananId));
  if (pIdx !== -1) {
    list[pIdx].status = 'selesai';
    setLocalData('tb_pesanan', list);
    return list[pIdx];
  }
  throw new Error('Pesanan tidak ditemukan');
}

export async function deletePesanan(pesananId) {
  try {
    const res = await fetch(`${BASE}/pesanan/${pesananId}`, { method: 'DELETE' });
    if (res.ok) return await res.json();
  } catch (e) {}

  let list = getLocalData('tb_pesanan', []);
  list = list.filter((p) => String(p.id) !== String(pesananId));
  setLocalData('tb_pesanan', list);
  return { success: true };
}
