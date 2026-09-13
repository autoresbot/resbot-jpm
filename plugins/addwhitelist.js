import { getSortedGroups } from '../lib/groups.js';
import { addToWhitelist, pecahTarget } from '../lib/whitelist.js';

const PANDUAN = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ addwhitelist 1,2,3          (nomor dari perintah *listgc*)
➽ addwhitelist 12036xxxx@g.us (ID grup langsung)

Boleh dicampur: addwhitelist 1,4 12036xxxx@g.us

Grup di whitelist akan dilewati oleh jpm, jpmtag, autojpm, dan autoreply.`;

export default async function addwhitelist({ client, body, reply }) {
  if (!body) return reply(PANDUAN);

  const { nomor, jid, salah } = pecahTarget(body);
  if (!nomor.length && !jid.length) return reply(PANDUAN);

  const ids = [...jid];
  const nomorSalah = [];

  // Nomor urut mengikuti daftar dari perintah listgc
  if (nomor.length) {
    const groups = await getSortedGroups(client);
    for (const n of nomor) {
      const group = groups[n - 1];
      if (group) ids.push(group.id);
      else nomorSalah.push(n);
    }
  }

  const { ditambah, sudahAda } = addToWhitelist([...new Set(ids)]);

  const baris = [];
  if (ditambah.length) baris.push(`✅ Ditambahkan (${ditambah.length}):\n${ditambah.join('\n')}`);
  if (sudahAda.length) baris.push(`ℹ️ Sudah ada sebelumnya (${sudahAda.length}):\n${sudahAda.join('\n')}`);
  if (nomorSalah.length) baris.push(`❌ Nomor tidak ada di daftar listgc: ${nomorSalah.join(', ')}`);
  if (salah.length) baris.push(`❌ Tidak dikenali: ${salah.join(', ')}`);

  await reply(baris.join('\n\n') || PANDUAN);
}
