import { saveIncomingImage } from '../lib/media.js';
import { startAutoJPM, stopAutoJPM, isAutoJPMRunning } from '../lib/autojpm.js';
import { catatanMode } from '../lib/mode.js';

const PANDUAN = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ autojpm <pesan>   -> mulai kirim berulang
➽ autojpm stop      -> hentikan

Contoh: autojpm Promo hari ini`;

export default async function autojpm({ client, event, from, body, reply, react }) {
  if (body.toLowerCase() === 'stop') {
    if (!isAutoJPMRunning()) return reply('❌ AutoJPM tidak sedang berjalan.');
    stopAutoJPM();
    return reply('🛑 AutoJPM telah dihentikan.');
  }

  if (isAutoJPMRunning()) {
    return reply('⚠️ AutoJPM sudah berjalan. Ketik *autojpm stop* untuk menghentikan.');
  }

  if (!body) return reply(PANDUAN);

  const imagePath = await saveIncomingImage(client, event, `${from}.jpeg`);

  await react('⏰');
  await startAutoJPM(client, { text: body, imagePath, kabari: reply });
  await reply(`✅ AutoJPM selesai atau dihentikan.${catatanMode()}`);
}
