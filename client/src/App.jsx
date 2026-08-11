import { Routes, Route, NavLink } from 'react-router-dom';
import DaftarHarga from './pages/DaftarHarga.jsx';
import KalkulatorPesanan from './pages/KalkulatorPesanan.jsx';
import RiwayatPesanan from './pages/RiwayatPesanan.jsx';
import DetailPesanan from './pages/DetailPesanan.jsx';

export default function App() {
  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <span className="dot" />
          Toko Bangunan
        </div>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Daftar Harga
          </NavLink>
          <NavLink to="/kalkulator" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Kalkulator
          </NavLink>
          <NavLink to="/riwayat" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Riwayat
          </NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<DaftarHarga />} />
        <Route path="/kalkulator" element={<KalkulatorPesanan />} />
        <Route path="/riwayat" element={<RiwayatPesanan />} />
        <Route path="/riwayat/:id" element={<DetailPesanan />} />
      </Routes>
    </>
  );
}
