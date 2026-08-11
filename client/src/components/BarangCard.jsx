import { formatRupiah } from '../utils.js';

export default function BarangCard({ barang, onEdit, onDelete }) {
  return (
    <div className="barang-card">
      {barang.foto_url ? (
        <img className="barang-thumb" src={barang.foto_url} alt={barang.nama} />
      ) : (
        <div className="barang-thumb">Tanpa Foto</div>
      )}

      <div className="barang-info">
        <div className="nama">{barang.nama}</div>
        {barang.merek && <div className="merek">{barang.merek}</div>}

        <div className="varian-tags">
          {barang.varian_harga.map((v) => (
            <div className="varian-tag" key={v.id}>
              <span className="label">{v.label_varian}</span>
              <span className="harga">{formatRupiah(v.harga)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="barang-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(barang)}>Edit</button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(barang)}>Hapus</button>
      </div>
    </div>
  );
}
