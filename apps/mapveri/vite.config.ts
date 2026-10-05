import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT || '5173';
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || '/';

const certDir = path.resolve(import.meta.dirname, '.cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const cnfPath = path.join(certDir, 'openssl.cnf');

// Auto-generate SSL certificate if not present
if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  try {
    fs.mkdirSync(certDir, { recursive: true });
    if (!fs.existsSync(cnfPath)) {
      fs.writeFileSync(
        cnfPath,
        `[req]\ndistinguished_name = req_distinguished_name\nx509_extensions = v3_req\nprompt = no\n\n[req_distinguished_name]\nCN = localhost\n\n[v3_req]\nkeyUsage = critical, digitalSignature, keyEncipherment\nextendedKeyUsage = serverAuth\nsubjectAltName = @alt_names\n\n[alt_names]\nDNS.1 = localhost\nDNS.2 = *.localhost\nIP.1 = 127.0.0.1\nIP.2 = 0.0.0.0\nIP.3 = 192.168.115.178\n`
      );
    }
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -keyout "${keyPath}" -out "${certPath}" -days 365 -config "${cnfPath}"`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    console.warn('Could not auto-generate SSL cert:', e);
  }
}

const httpsConfig =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    : undefined;

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  envDir: path.resolve(import.meta.dirname, '../..'),
  envPrefix: ['VITE_', 'SUPABASE_'],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    https: httpsConfig,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
    https: httpsConfig,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
