import config from '../config.js';
import { log } from './logger.js';
import { getTargetGroups } from './groups.js';
import { broadcastToGroups, sleep } from './broadcast.js';
import { saveAutoJPMStatus, readAutoJPMStatus } from './autojpmState.js';
import { siapKirim } from './state.js';

const state = { running: false };

export function isAutoJPMRunning() {
  return state.running;
}

export function stopAutoJPM() {
  state.running = false;
  saveAutoJPMStatus(false);
}

/**
 * Jalankan AUTOJPM: kirim pesan ke semua grup, lalu ulangi terus
 * sampai dihentikan dengan perintah "autojpm stop".
 *
 * @param {Function} [kabari] dipanggil untuk mengabari pengguna, mis. (teks) => reply(teks)
 */
export async function startAutoJPM(client, { text, imagePath = null, kabari } = {}) {
  if (state.running) return false;
  if (!text) return false;

  state.running = true;
  saveAutoJPMStatus(true, text, imagePath);

  const isCancelled = () => !state.running;
  let putaran = 1;

  while (state.running) {
    // Koneksi putus: berhenti sementara TANPA menghapus status,
    // supaya otomatis dilanjutkan lagi begitu bot tersambung kembali.
    if (!siapKirim()) {
      state.running = false;
      log('Koneksi terputus - AUTOJPM dijeda, lanjut otomatis setelah tersambung.', 'yellow');
      return false;
    }

    const groups = await getTargetGroups(client);

    if (!groups.length) {
      await kabari?.('Tidak ada grup yang bisa dikirimi pesan (kosong atau semua ada di whitelist).');
      break;
    }

    await broadcastToGroups(client, groups, {
      text,
      imagePath,
      tagAll: config.autojpm.tagSemua,
      label: 'AUTOJPM',
      isCancelled,
    });

    // Kembali ke atas: berhenti kalau distop, dijeda kalau koneksi putus
    if (!state.running || !siapKirim()) continue;

    log(`Selesai putaran ${putaran}. Menunggu sebelum mengulang ...`, 'yellow');
    putaran += 1;
    await sleep((config.autojpm.jedaPutaran ?? 20) * 1000);
  }

  stopAutoJPM();
  return true;
}

/** Lanjutkan AUTOJPM otomatis setelah bot dinyalakan ulang */
export async function resumeAutoJPM(client) {
  if (state.running) return;

  const status = readAutoJPMStatus();
  if (!status.running || !status.text) return;

  log('AUTOJPM dijalankan ulang setelah restart');
  await startAutoJPM(client, { text: status.text, imagePath: status.imagePath });
}
