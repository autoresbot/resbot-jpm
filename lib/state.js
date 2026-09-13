/**
 * Status koneksi yang dipakai bersama oleh semua fitur.
 * Diisi oleh lib/whatsapp.js, dibaca oleh proses kirim massal
 * supaya pengiriman langsung berhenti saat koneksi putus.
 */
export const koneksi = {
  siap: false, // true kalau socket terbuka
  mati: false, // true kalau sesi sudah tidak bisa dipakai (harus login ulang)
};

/** Aman untuk mengirim pesan? */
export function siapKirim() {
  return koneksi.siap && !koneksi.mati;
}
