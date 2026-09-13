import { readWhitelist, removeFromWhitelist, pecahTarget } from '../lib/whitelist.js';

const PANDUAN = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ delwhitelist 1,2            (nomor dari perintah *whitelist*)
➽ delwhitelist 12036xxxx@g.us (ID grup langsung)
➽ delwhitelist all            (kosongkan semua)`;

export default async function delwhitelist({ body, reply }) {
  if (!body) return reply(PANDUAN);

  const daftar = readWhitelist();
  if (!daftar.length) return reply('Whitelist masih kosong, tidak ada yang bisa dihapus.');

  if (body.toLowerCase() === 'all') {
    const { dihapus } = removeFromWhitelist([...daftar]);
    return reply(`🗑️ Whitelist dikosongkan (${dihapus.length} grup dihapus).`);
  }

  const { nomor, jid, salah } = pecahTarget(body);
  if (!nomor.length && !jid.length) return reply(PANDUAN);

  const ids = [...jid];
  const nomorSalah = [];

  // Nomor urut mengikuti daftar dari perintah whitelist
  for (const n of nomor) {
    const id = daftar[n - 1];
    if (id) ids.push(id);
    else nomorSalah.push(n);
  }

  const { dihapus, tidakAda } = removeFromWhitelist([...new Set(ids)]);

  const baris = [];
  if (dihapus.length) baris.push(`🗑️ Dihapus (${dihapus.length}):\n${dihapus.join('\n')}`);
  if (tidakAda.length) baris.push(`ℹ️ Tidak ada di whitelist (${tidakAda.length}):\n${tidakAda.join('\n')}`);
  if (nomorSalah.length) baris.push(`❌ Nomor tidak ada di daftar whitelist: ${nomorSalah.join(', ')}`);
  if (salah.length) baris.push(`❌ Tidak dikenali: ${salah.join(', ')}`);

  await reply(baris.join('\n\n') || PANDUAN);
}
