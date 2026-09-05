import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    // Por omision Vite escucha solo en localhost, que en macOS resuelve a IPv6
    // (::1). Un navegador que prefiera IPv4 recibe conexion rechazada y muestra
    // la pagina como inaccesible, sin que el codigo llegue a ejecutarse.
    //
    // Con host activado escucha en todas las interfaces, IPv4 e IPv6, y ademas
    // queda accesible desde la red local: hace falta para probar la interfaz en
    // una tableta, que es como se usara en el aula.
    host: true,
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.test.jsx'],
  },
});
