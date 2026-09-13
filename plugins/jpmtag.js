import { getTargetGroups } from '../lib/groups.js';
import { broadcastToGroups } from '../lib/broadcast.js';
import { saveIncomingImage } from '../lib/media.js';
import { catatanMode } from '../lib/mode.js';

const PANDUAN = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ jpmtag <pesan>

Contoh: jpmtag Selamat pagi semuanya
(semua anggota grup ikut ditag)`;

export default async function jpmtag({ client, event, from, body, reply, react }) {
  if (!body) return reply(PANDUAN);

  const imagePath = await saveIncomingImage(client, event, `${from}.jpeg`);

  await react('⏰');

  const groups = await getTargetGroups(client);
  if (!groups.length) {
    return reply('Tidak ada grup yang bisa dikirimi pesan (kosong atau semua ada di whitelist).');
  }

  const terkirim = await broadcastToGroups(client, groups, {
    text: body,
    imagePath,
    tagAll: true,
    label: 'JPMTAG',
  });

  await reply(`✅ *Pesan berhasil dikirim ke ${terkirim} dari ${groups.length} grup.*${catatanMode()}`);
}
