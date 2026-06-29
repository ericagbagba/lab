import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// Enregistrer le Service Worker du PWA
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Une nouvelle version de Bit est disponible. Voulez-vous mettre à jour ?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('L\'application Bit est prête pour une utilisation hors ligne.');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
