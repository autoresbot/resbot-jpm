import fs from 'fs';
import { FILE_AUTOJPM_STATE, FILE_AUTOJPM_IMAGE, ensureDataDir } from './paths.js';

const STATUS_KOSONG = { running: false, text: '', imagePath: null };

/**
 * Simpan status AUTOJPM supaya bisa dilanjutkan otomatis setelah bot restart.
 * Gambar (kalau ada) disalin ke data/ agar tidak hilang bersama folder tmp.
 */
export function saveAutoJPMStatus(running, text = '', sumberGambar = null) {
  // Tidak berjalan = tidak perlu menyimpan apa pun, filenya dibuang saja
  if (!running) {
    fs.rmSync(FILE_AUTOJPM_STATE, { force: true });
    fs.rmSync(FILE_AUTOJPM_IMAGE, { force: true });
    return;
  }

  ensureDataDir();

  let gambar = null;
  if (sumberGambar && fs.existsSync(sumberGambar)) {
    fs.copyFileSync(sumberGambar, FILE_AUTOJPM_IMAGE);
    gambar = FILE_AUTOJPM_IMAGE;
  }

  fs.writeFileSync(FILE_AUTOJPM_STATE, JSON.stringify({ running: true, text, imagePath: gambar }, null, 2));
}

/** Baca status AUTOJPM terakhir */
export function readAutoJPMStatus() {
  try {
    const status = JSON.parse(fs.readFileSync(FILE_AUTOJPM_STATE, 'utf8'));
    const gambar = status.imagePath && fs.existsSync(status.imagePath) ? status.imagePath : null;
    return { ...STATUS_KOSONG, ...status, imagePath: gambar };
  } catch {
    return STATUS_KOSONG;
  }
}
