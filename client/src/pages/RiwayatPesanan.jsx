import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPesananList } from '../api.js';
import { formatRupiah } from '../utils.js';

export default function RiwayatPesanan() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPesananList('selesai')
      .then(setList)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Riwayat Pesanan</h1>
          <p>{list.length} pesanan sudah selesai</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="spinner-wrap">Memuat...</div>
      ) : list.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🗂️</div>
          <h3>Belum ada riwayat</h3>
          <p>Pesanan yang sudah diselesaikan akan muncul di sini.</p>
        </div>
      ) : (
        <div>
          {list.map((p) => (
            <Link to={`/riwayat/${p.id}`} className="riwayat-item" key={p.id}>
              <div>
                <div className="nama">{p.nama_pelanggan}</div>
                <div className="meta">{p.tanggal}</div>
              </div>
              <div className="total">{formatRupiah(p.total)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
