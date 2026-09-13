import { getAllGroups } from '../lib/groups.js';
import { readWhitelist } from '../lib/whitelist.js';

export default async function whitelist({ client, reply }) {
  const daftar = readWhitelist();

  if (!daftar.length) {
    return reply(`╭───❰  *WHITELIST*  ❱
│ Masih kosong.
╰───────────❱

Grup di whitelist akan *dilewati* oleh jpm, jpmtag, autojpm, dan autoreply.

Cara menambah:
➽ addwhitelist 1,2,3   (nomor dari perintah *listgc*)
➽ addwhitelist 12036xxxx@g.us`);
  }

  // Cocokkan ID dengan nama grup yang bot ikuti sekarang
  const groups = await getAllGroups(client);
  const nama = new Map(groups.map((g) => [g.id, g.name]));

  const detail = daftar
    .map((id, i) => `
◆ *${i + 1}. ${nama.get(id) ?? '(bot tidak ada di grup ini)'}*
┇ ID : ${id}`)
    .join('\n');

  await reply(`╭───❰  *WHITELIST*  ❱
│ Total : *${daftar.length}* Grup
╰───────────❱

Grup berikut *dilewati* oleh jpm, jpmtag, autojpm, dan autoreply:
${detail}

Hapus dengan: *delwhitelist 1* (nomor dari daftar ini)`);
}
