import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server jalan di port 5173 (default).
// Kita pasang "proxy": setiap request dari frontend ke /api/... atau /uploads/...
// otomatis diteruskan ke backend Express di port 3001.
// Jadi di kode React kita cukup fetch('/api/barang') tanpa perlu tulis
// http://localhost:3001 setiap saat, dan tidak ada masalah CORS saat development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001'
    }
  }
});
