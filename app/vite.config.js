import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Bij GitHub Pages staat de app op /<repo>/. Zet VITE_BASE in CI om dat
// pad door te geven; lokaal blijft het '/'.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'De Waterval — oefen-app',
        short_name: 'Waterval',
        description: 'Oefenen met Druppie — leer de toetsen van leerjaar 5.',
        lang: 'nl-BE',
        theme_color: '#1fa9ce',
        background_color: '#eaf7fb',
        display: 'standalone',
        orientation: 'portrait',
        // Relatief t.o.v. manifest-locatie → werkt op zowel '/' als '/<repo>/'.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
