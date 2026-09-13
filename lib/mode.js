import config from '../config.js';

/** Jeda antar pengiriman saat mode uji coba (biar tidak lama menunggu) */
export const JEDA_DEV_MS = 1000;

/** Sedang mode uji coba? (config.mode = 'development') */
export function modeUjiCoba() {
  return String(config.mode ?? 'production').toLowerCase() === 'development';
}

/** Catatan tambahan untuk laporan hasil, supaya tidak mengira pesan benar terkirim */
export function catatanMode() {
  return modeUjiCoba() ? '\n\n⚠️ _MODE UJI COBA - tidak ada pesan yang benar-benar dikirim._' : '';
}
