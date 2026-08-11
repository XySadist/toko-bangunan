import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPesanan } from '../api.js';
import { formatRupiah } from '../utils.js';

export default function DetailPesanan() {
  const { id } = useParams();
  const [pesanan, setPesanan] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPesanan(id).then(setPesanan).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!pesanan) return <div className="page"><div className="spinner-wrap">Memuat...</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/riwayat" className="btn btn-ghost btn-sm" style={{ marginBottom: 8, paddingLeft: 0 }}>← Kembali ke Riwayat</Link>
          <h1>{pesanan.nama_pelanggan}</h1>
          <p>
            {pesanan.tanggal} · <span className={`status-badge ${pesanan.status}`}>{pesanan.status}</span>
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="pesanan-table">
          <thead>
            <tr>
              <th>Barang</th>
              <th>Varian</th>
              <th>Harga</th>
              <th>Jumlah</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pesanan.items.map((item) => (
              <tr key={item.id}>
                <td>{item.nama_barang_snapshot}</td>
                <td style={{ color: 'var(--ink-soft)' }}>{item.label_varian_snapshot}</td>
                <td className="mono">{formatRupiah(item.harga_satuan_snapshot)}</td>
                <td>{item.jumlah} {item.satuan_snapshot}</td>
                <td className="mono">{formatRupiah(item.subtotal)}</td>
              </tr>
            ))}
            <tr className="row-total">
              <td colSpan={4}>Total</td>
              <td className="total-value">{formatRupiah(pesanan.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
