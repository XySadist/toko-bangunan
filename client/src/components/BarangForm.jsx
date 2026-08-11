import { useState } from 'react';
import { KATEGORI_LIST, SATUAN_LIST } from '../utils.js';
import { createBarang, updateBarang } from '../api.js';

let varianKeyCounter = 0;
function newVarianRow(v = {}) {
  varianKeyCounter += 1;
  return {
    key: varianKeyCounter,
    label_varian: v.label_varian || '',
    satuan: v.satuan || '',
    harga: v.harga != null ? String(v.harga) : ''
  };
}

// barangEdit: kalau diisi (objek barang), form dalam mode "edit". Kalau null, mode "tambah".
export default function BarangForm({ barangEdit, onClose, onSaved }) {
  const isEdit = !!barangEdit;

  const [nama, setNama] = useState(barangEdit?.nama || '');
  const [kategori, setKategori] = useState(barangEdit?.kategori || KATEGORI_LIST[0]);
  const [merek, setMerek] = useState(barangEdit?.merek || '');
  const [fotoFile, setFotoFile] = useState(null);
  const [varianRows, setVarianRows] = useState(
    barangEdit?.varian_harga?.length
      ? barangEdit.varian_harga.map((v) => newVarianRow(v))
      : [newVarianRow()]
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateVarianRow(key, field, value) {
    setVarianRows((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addVarianRow() {
    setVarianRows((rows) => [...rows, newVarianRow()]);
  }

  function removeVarianRow(key) {
    setVarianRows((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.key !== key)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!nama.trim()) return setError('Nama barang tidak boleh kosong');

    const varianPayload = [];
    for (const row of varianRows) {
      if (!row.label_varian.trim() || !row.satuan.trim() || row.harga === '') {
        return setError('Lengkapi semua kolom varian (ukuran, satuan, harga) atau hapus baris yang kosong');
      }
      const hargaNum = Number(row.harga);
      if (isNaN(hargaNum) || hargaNum <= 0) {
        return setError(`Harga untuk varian "${row.label_varian}" harus angka positif`);
      }
      varianPayload.push({ label_varian: row.label_varian.trim(), satuan: row.satuan.trim(), harga: hargaNum });
    }

    const formData = new FormData();
    formData.append('nama', nama.trim());
    formData.append('kategori', kategori);
    formData.append('merek', merek.trim());
    formData.append('varian', JSON.stringify(varianPayload));
    if (fotoFile) formData.append('foto', fotoFile);

    try {
      setSaving(true);
      if (isEdit) {
        await updateBarang(barangEdit.id, formData);
      } else {
        await createBarang(formData);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Barang' : 'Tambah Barang'}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Tutup">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="nama">Nama barang</label>
            <input id="nama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="misal: Paku 5cm" />
          </div>

          <div className="field">
            <label htmlFor="kategori">Kategori</label>
            <select id="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)}>
              {KATEGORI_LIST.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="merek">Merek (opsional)</label>
            <input id="merek" type="text" value={merek} onChange={(e) => setMerek(e.target.value)} placeholder="misal: Rucika" />
          </div>

          <div className="field">
            <label htmlFor="foto">Foto (opsional)</label>
            <div className="file-input">
              <input
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => setFotoFile(e.target.files[0] || null)}
              />
              {isEdit && barangEdit.foto_url && !fotoFile && (
                <div className="field-hint">Kosongkan kalau tidak ingin mengganti foto lama</div>
              )}
            </div>
          </div>

          <div className="field">
            <label>Varian ukuran & harga</label>
            {varianRows.map((row) => (
              <div className="varian-row" key={row.key}>
                <input
                  type="text"
                  placeholder="Ukuran, misal 20 mm atau 1/2 inch"
                  value={row.label_varian}
                  onChange={(e) => updateVarianRow(row.key, 'label_varian', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Satuan (misal Kg, Pcs)"
                  value={row.satuan}
                  onChange={(e) => updateVarianRow(row.key, 'satuan', e.target.value)}
                  list="satuan-list"
                />
                <datalist id="satuan-list">
                  {SATUAN_LIST.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input
                  type="number"
                  min="0"
                  placeholder="Harga"
                  value={row.harga}
                  onChange={(e) => updateVarianRow(row.key, 'harga', e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeVarianRow(row.key)}
                  disabled={varianRows.length === 1}
                  aria-label="Hapus varian"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addVarianRow}>
              + Tambah Varian
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Barang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
