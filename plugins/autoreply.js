import { sendMessage, jedaKirim } from '../lib/broadcast.js';
import { log } from '../lib/logger.js';
import { siapKirim } from '../lib/state.js';
import { readWhitelist } from '../lib/whitelist.js';

const JEDA_PUTARAN = 60 * 1000; // periksa grup aktif setiap 1 menit

const PANDUAN = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ autoreply <pesan>   -> mulai balas otomatis
➽ autoreply stop      -> hentikan

Contoh: autoreply Halo, ada yang bisa dibantu?`;

// timer juga dipakai sebagai penanda: null = tidak sedang berjalan
let timer = null;

function hentikan() {
  clearInterval(timer);
  timer = null;
}

/** Sedang berjalan? (dipakai perintah resetdata) */
export function isAutoreplyRunning() {
  return Boolean(timer);
}

/** Hentikan dari luar, mis. oleh perintah resetdata */
export function stopAutoreply() {
  if (!timer) return false;
  hentikan();
  return true;
}

/**
 * Balas otomatis ke grup yang baru saja ada chatnya.
 * global.chatCounter diisi oleh lib/handler.js setiap ada pesan masuk.
 */
export default async function autoreply({ client, body, reply, react }) {
  if (body.toLowerCase() === 'stop') {
    if (!timer) return reply('❌ Autoreply tidak sedang berjalan.');
    hentikan();
    log('Autoreply dihentikan oleh pengguna.', 'yellow');
    return reply('🛑 Autoreply telah dihentikan.');
  }

  if (timer) {
    return reply('⚠️ Autoreply sudah berjalan. Ketik *autoreply stop* untuk menghentikan.');
  }

  if (!body) return reply(PANDUAN);

  await react('⏰');
  await reply('✅ Autoreply diaktifkan.');

  timer = setInterval(async () => {
    if (!siapKirim()) return; // koneksi sedang putus, tunggu sampai tersambung lagi

    // Grup di whitelist dilewati, sama seperti jpm / autojpm
    const whitelist = readWhitelist();
    const grupAktif = Object.keys(global.chatCounter ?? {}).filter(
      (id) =>
        id.endsWith('@g.us') &&
        global.chatCounter[id].total > 0 &&
        !whitelist.includes(id),
    );

    if (!grupAktif.length) return;

    for (const groupId of grupAktif) {
      if (!timer) break; // dihentikan di tengah putaran

      try {
        await sendMessage(client, groupId, { type: 'text', text: body });
        global.chatCounter[groupId].total = 0;
        log(`AUTOREPLY Terkirim ke ${groupId}`);
      } catch (error) {
        log(`Gagal kirim autoreply ke ${groupId}: ${error.message}`, 'red');
      }

      await jedaKirim();
    }
  }, JEDA_PUTARAN);
}
