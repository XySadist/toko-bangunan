import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getPesananList,
  getPesanan,
  createPesanan,
  addPesananItem,
  updatePesananItem,
  deletePesananItem,
  selesaikanPesanan,
  deletePesanan,
  getBarangList
} from '../api.js';
import { formatRupiah } from '../utils.js';

export default function KalkulatorPesanan() {
  const [loading, setLoading] = useState(true);
  const [pesanan, setPesanan] = useState(null); // pesanan aktif yang sedang dikerjakan
  const [namaBaru, setNamaBaru] = useState('');
  const [error, setError] = useState('');
  const [barangList, setBarangList] = useState([]);

  // Saat halaman dibuka: cek apakah ada pesanan berstatus "aktif" yang belum diselesaikan,
  // supaya kalau kasir refresh halaman, pesanan yang sedang dikerjakan tidak hilang.
  useEffect(() => {
    Promise.all([getPesananList('aktif'), getBarangList()])
      .then(([aktifList, barang]) => {
        setBarangList(barang);
        if (aktifList.length > 0) {
          return getPesanan(aktifList[0].id).then(setPesanan);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleBuatPesanan(e) {
    e.preventDefault();
    if (!namaBaru.trim()) return;
    try {
      const p = await createPesanan(namaBaru.trim());
      setPesanan(p);
      setNamaBaru('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleBatalkan() {
    if (!confirm('Batalkan pesanan ini? Semua item yang sudah ditambahkan akan hilang.')) return;
    await deletePesanan(pesanan.id);
    setPesanan(null);
  }

  async function handleSelesai() {
    if (!pesanan.items.length) return;
    if (!confirm(`Selesaikan pesanan untuk ${pesanan.nama_pelanggan} dengan total ${formatRupiah(pesanan.total)}?`)) return;
    const updated = await selesaikanPesanan(pesanan.id);
    setPesanan(updated);
  }

  if (loading) return <div className="page"><div className="spinner-wrap">Memuat...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Kalkulator Pesanan</h1>
          <p>Hitung total belanja pelanggan secara otomatis</p>
        </div>
        {pesanan && (
          <Link to="/riwayat" className="btn btn-secondary btn-sm">Lihat Riwayat</Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!pesanan || pesanan.status === 'selesai' ? (
        pesanan?.status === 'selesai' ? (
          <PesananSelesai pesanan={pesanan} onBuatBaru={() => setPesanan(null)} />
        ) : (
          <div className="add-item-panel">
            <h3>Mulai pesanan baru</h3>
            <form onSubmit={handleBuatPesanan}>
              <div className="field">
                <label htmlFor="nama_pelanggan">Nama pelanggan</label>
                <input
                  id="nama_pelanggan"
                  type="text"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  placeholder="misal: Budi"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Buat Pesanan</button>
            </form>
          </div>
        )
      ) : (
        <PesananAktif
          pesanan={pesanan}
          setPesanan={setPesanan}
          barangList={barangList}
          onBatalkan={handleBatalkan}
          onSelesai={handleSelesai}
        />
      )}
    </div>
  );
}

function PesananSelesai({ pesanan, onBuatBaru }) {
  return (
    <div className="empty-state">
      <div className="icon">✅</div>
      <h3>Pesanan {pesanan.nama_pelanggan} selesai</h3>
      <p>Total {formatRupiah(pesanan.total)} sudah tersimpan di riwayat.</p>
      <button className="btn btn-primary" onClick={onBuatBaru}>+ Buat Pesanan Baru</button>
    </div>
  );
}

function PesananAktif({ pesanan, setPesanan, barangList, onBatalkan, onSelesai }) {
  const [namaBarangQuery, setNamaBarangQuery] = useState('');
  const [barangDipilih, setBarangDipilih] = useState(null);
  const [varianId, setVarianId] = useState('');
  const [jumlah, setJumlah] = useState('1');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const hasilPencarian =
    namaBarangQuery.trim().length > 0
      ? barangList.filter((b) => b.nama.toLowerCase().includes(namaBarangQuery.toLowerCase())).slice(0, 8)
      : [];

  function pilihBarang(b) {
    setBarangDipilih(b);
    setNamaBarangQuery(b.nama);
    setVarianId(b.varian_harga[0]?.id || '');
  }

  async function handleTambahItem(e) {
    e.preventDefault();
    setAddError('');
    if (!barangDipilih || !varianId) {
      setAddError('Pilih barang dan variannya dulu');
      return;
    }
    const jumlahNum = Number(jumlah);
    if (!jumlahNum || jumlahNum <= 0) {
      setAddError('Jumlah harus angka positif');
      return;
    }
    try {
      setAdding(true);
      const updated = await addPesananItem(pesanan.id, { varian_harga_id: Number(varianId), jumlah: jumlahNum });
      setPesanan(updated);
      setNamaBarangQuery('');
      setBarangDipilih(null);
      setVarianId('');
      setJumlah('1');
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <div className="add-item-panel">
        <h3>Tambah item — {pesanan.nama_pelanggan}</h3>
        {addError && <div className="alert alert-error">{addError}</div>}
        <form onSubmit={handleTambahItem}>
          <div className="field autocomplete">
            <label htmlFor="cari_barang">Cari barang</label>
            <input
              id="cari_barang"
              type="text"
              placeholder="Ketik nama barang..."
              value={namaBarangQuery}
              onChange={(e) => {
                setNamaBarangQuery(e.target.value);
                setBarangDipilih(null);
                setVarianId('');
              }}
            />
            {hasilPencarian.length > 0 && !barangDipilih && (
              <div className="autocomplete-list">
                {hasilPencarian.map((b) => (
                  <div key={b.id} className="autocomplete-item" onClick={() => pilihBarang(b)} role="button" tabIndex={0}>
                    <span>{b.nama}{b.merek ? ` · ${b.merek}` : ''}</span>
                    <span className="mono" style={{ color: 'var(--ink-soft)' }}>{b.varian_harga.length} varian</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {barangDipilih && (
            <div className="varian-row" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
              <select value={varianId} onChange={(e) => setVarianId(e.target.value)}>
                {barangDipilih.varian_harga.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label_varian} — {formatRupiah(v.harga)} / {v.satuan}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="any"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="Jumlah"
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                {adding ? '...' : '+ Tambah'}
              </button>
            </div>
          )}
        </form>
      </div>

      <ItemTable pesanan={pesanan} setPesanan={setPesanan} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={onBatalkan}>Batalkan Pesanan</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onSelesai} disabled={!pesanan.items.length}>
          Selesaikan Pesanan
        </button>
      </div>
    </>
  );
}

function ItemTable({ pesanan, setPesanan }) {
  // localTotals menyimpan subtotal yang dihitung ulang secara instan di browser
  // (harga_satuan_snapshot x jumlah) supaya tampilan total terasa real-time,
  // sementara request ke server jalan di belakang layar (debounced).
  const debounceRef = useRef({});

  function handleJumlahChange(itemId, jumlahBaru) {
    // Update tampilan secara optimistik dulu (instan, tanpa nunggu server).
    setPesanan((prev) => {
      const items = prev.items.map((it) =>
        it.id === itemId
          ? { ...it, jumlah: jumlahBaru, subtotal: (Number(jumlahBaru) || 0) * it.harga_satuan_snapshot }
          : it
      );
      const total = items.reduce((sum, it) => sum + it.subtotal, 0);
      return { ...prev, items, total };
    });

    // Debounce panggilan ke server supaya tidak spam request tiap ketikan angka.
    clearTimeout(debounceRef.current[itemId]);
    debounceRef.current[itemId] = setTimeout(async () => {
      const jumlahNum = Number(jumlahBaru);
      if (!jumlahNum || jumlahNum <= 0) return;
      try {
        const updated = await updatePesananItem(pesanan.id, itemId, jumlahNum);
        setPesanan(updated);
      } catch (err) {
        alert(err.message);
      }
    }, 500);
  }

  async function handleHapusItem(itemId) {
    try {
      const updated = await deletePesananItem(pesanan.id, itemId);
      setPesanan(updated);
    } catch (err) {
      alert(err.message);
    }
  }

  if (!pesanan.items.length) {
    return (
      <div className="empty-state">
        <div className="icon">🧾</div>
        <h3>Belum ada item</h3>
        <p>Cari dan tambahkan barang di atas untuk mulai menghitung pesanan.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="pesanan-table">
        <thead>
          <tr>
            <th>Barang</th>
            <th>Varian</th>
            <th>Harga</th>
            <th>Jumlah</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pesanan.items.map((item) => (
            <tr key={item.id}>
              <td>{item.nama_barang_snapshot}</td>
              <td style={{ color: 'var(--ink-soft)' }}>{item.label_varian_snapshot}</td>
              <td className="mono">{formatRupiah(item.harga_satuan_snapshot)}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="qty-input"
                  value={item.jumlah}
                  onChange={(e) => handleJumlahChange(item.id, e.target.value)}
                />
                <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--ink-soft)' }}>{item.satuan_snapshot}</span>
              </td>
              <td className="mono">{formatRupiah(item.subtotal)}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => handleHapusItem(item.id)} aria-label="Hapus item">✕</button>
              </td>
            </tr>
          ))}
          <tr className="row-total">
            <td colSpan={4}>Total</td>
            <td className="total-value">{formatRupiah(pesanan.total)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
