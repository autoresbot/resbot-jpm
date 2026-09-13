import fs from 'fs';
import { FILE_AUTOJPM_STATE, FILE_AUTOJPM_IMAGE } from '../lib/paths.js';
import { readWhitelist, clearWhitelist } from '../lib/whitelist.js';
import { resetGroupLinks } from '../lib/groupLinks.js';
import { clearTmp } from '../lib/media.js';
import { isAutoJPMRunning, stopAutoJPM } from '../lib/autojpm.js';
import { isAutoreplyRunning, stopAutoreply } from './autoreply.js';
import { log } from '../lib/logger.js';

const KATA_KUNCI = 'ya';

/** Hapus file kalau ada, kembalikan true bila benar-benar terhapus */
function hapusFile(lokasi) {
  if (!fs.existsSync(lokasi)) return false;
  fs.rmSync(lokasi, { force: true });
  return true;
}

export default async function resetdata({ body, reply }) {
  const jumlahWhitelist = readWhitelist().length;

  // Minta konfirmasi dulu — perintah ini tidak bisa dibatalkan
  if (body.toLowerCase() !== KATA_KUNCI) {
    return reply(`⚠️ *RESET DATA*

Perintah ini mengembalikan bot ke kondisi baru:

• Whitelist dikosongkan (*${jumlahWhitelist}* grup)
• Kumpulan link grup dihapus
• AutoJPM & Autoreply dihentikan
• File sementara di tmp/ dibersihkan

Sesi login WhatsApp *TIDAK* dihapus, bot tetap tersambung.

Data yang hilang tidak bisa dikembalikan.
Kalau yakin, ketik:
➽ *resetdata ${KATA_KUNCI}*`);
  }

  const autojpmTadinyaJalan = isAutoJPMRunning();
  if (autojpmTadinyaJalan) stopAutoJPM();

  const autoreplyTadinyaJalan = stopAutoreply();

  const whitelistTerhapus = clearWhitelist();
  const linkTerhapus = resetGroupLinks();
  const fileTmp = clearTmp();

  hapusFile(FILE_AUTOJPM_STATE);
  hapusFile(FILE_AUTOJPM_IMAGE);

  global.chatCounter = {};

  log('Semua data bot direset oleh pengguna.', 'yellow');

  await reply(`✅ *DATA SUDAH DIRESET*

• Whitelist       : ${whitelistTerhapus} grup dihapus
• Link grup       : ${linkTerhapus} link dihapus
• AutoJPM         : ${autojpmTadinyaJalan ? 'dihentikan' : 'memang tidak berjalan'}
• Autoreply       : ${autoreplyTadinyaJalan ? 'dihentikan' : 'memang tidak berjalan'}
• File sementara  : ${fileTmp} file dihapus
• Hitungan chat   : direset

Bot sekarang seperti baru dipasang. Sesi login tetap aman.`);
}

export { isAutoreplyRunning };
