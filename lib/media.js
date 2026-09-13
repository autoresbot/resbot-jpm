import fs from 'fs';
import path from 'path';
import { log } from './logger.js';
import { TMP_DIR } from './paths.js';

/** Apakah pesan yang masuk berisi gambar? */
export function isImageMessage(event) {
  return Boolean(event?.message?.imageMessage);
}

/**
 * Unduh gambar dari pesan masuk ke folder tmp/.
 * Mengembalikan path file, atau null kalau gagal / bukan gambar.
 */
export async function saveIncomingImage(client, event, filename) {
  if (!isImageMessage(event)) return null;

  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const aman = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(TMP_DIR, aman);
    await client.message.downloadToFile(event, filePath);
    return filePath;
  } catch (error) {
    log(`Gagal mengunduh gambar: ${error.message}`, 'red');
    return null;
  }
}

/** Kosongkan folder tmp/. Mengembalikan jumlah file yang dihapus. */
export function clearTmp() {
  if (!fs.existsSync(TMP_DIR)) return 0;

  let jumlah = 0;
  for (const nama of fs.readdirSync(TMP_DIR)) {
    try {
      fs.rmSync(path.join(TMP_DIR, nama), { recursive: true, force: true });
      jumlah += 1;
    } catch (error) {
      log(`Gagal menghapus tmp/${nama}: ${error.message}`, 'red');
    }
  }
  return jumlah;
}
