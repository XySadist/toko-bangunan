import { useEffect, useState, useCallback } from 'react';
import BarangCard from '../components/BarangCard.jsx';
import BarangForm from '../components/BarangForm.jsx';
import { getBarangList, deleteBarang } from '../api.js';
import { KATEGORI_LIST } from '../utils.js';

export default function DaftarHarga() {
  const [barangList, setBarangList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kategoriAktif, setKategoriAktif] = useState('Semua');
  const [formOpen, setFormOpen] = useState(false);
  const [barangEdit, setBarangEdit] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getBarangList({ search, kategori: kategoriAktif === 'Semua' ? '' : kategoriAktif })
      .then(setBarangList)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, kategoriAktif]);

  useEffect(() => {
    // debounce kecil supaya tidak fetch di setiap ketikan huruf
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openTambah() {
    setBarangEdit(null);
    setFormOpen(true);
  }

  function openEdit(barang) {
    setBarangEdit(barang);
    setFormOpen(true);
  }

  async function handleDelete(barang) {
    if (!confirm(`Hapus "${barang.nama}" beserta semua variannya?`)) return;
    try {
      await deleteBarang(barang.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleSaved() {
    setFormOpen(false);
    load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Daftar Harga Barang</h1>
          <p>{barangList.length} barang{kategoriAktif !== 'Semua' ? ` di kategori ${kategoriAktif}` : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openTambah}>+ Tambah Barang</button>
      </div>

      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Cari nama barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="kategori-tabs">
        {['Semua', ...KATEGORI_LIST].map((k) => (
          <button
            key={k}
            className={`kategori-tab${kategoriAktif === k ? ' active' : ''}`}
            onClick={() => setKategoriAktif(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="spinner-wrap">Memuat data...</div>
      ) : barangList.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📦</div>
          <h3>Belum ada barang</h3>
          <p>{search || kategoriAktif !== 'Semua' ? 'Tidak ada barang yang cocok dengan filter ini.' : 'Mulai tambahkan barang pertama kamu.'}</p>
          <button className="btn btn-primary" onClick={openTambah}>+ Tambah Barang</button>
        </div>
      ) : (
        <div className="barang-grid">
          {barangList.map((b) => (
            <BarangCard key={b.id} barang={b} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {formOpen && (
        <BarangForm barangEdit={barangEdit} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
