import { getTargetGroups } from '../lib/groups.js';
import { broadcastToGroups } from '../lib/broadcast.js';
import { saveIncomingImage } from '../lib/media.js';
import { catatanMode } from '../lib/mode.js';

const PANDUAN = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ jpm <pesan>

Contoh: jpm Selamat pagi semuanya
(kirim bersama gambar kalau ingin pakai gambar)`;

export default async function jpm({ client, event, from, body, reply, react }) {
  if (!body) return reply(PANDUAN);

  const imagePath = await saveIncomingImage(client, event, `${from}.jpeg`);

  await react('⏰');
  await reply('Memproses pengiriman pesan, harap tunggu...');

  const groups = await getTargetGroups(client);
  if (!groups.length) {
    return reply('Tidak ada grup yang bisa dikirimi pesan (kosong atau semua ada di whitelist).');
  }

  const terkirim = await broadcastToGroups(client, groups, { text: body, imagePath, label: 'JPM' });
  await reply(`Pesan selesai dikirim ke ${terkirim} dari ${groups.length} grup.${catatanMode()}`);
}
