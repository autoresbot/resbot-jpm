import { getSortedGroups } from '../lib/groups.js';
import { readWhitelist } from '../lib/whitelist.js';

export default async function listgc({ client, reply }) {
  const groups = await getSortedGroups(client);

  if (!groups.length) return reply('Bot belum bergabung ke grup mana pun.');

  const terbuka = groups.filter((g) => !g.announce).length;
  const whitelist = readWhitelist();

  const detail = groups
    .map(
      (group, i) => `
◆ *${i + 1}. ${group.name}*
┇ ID     : ${group.id}
┇ Anggota: ${group.size}
┇ Status : ${group.announce ? '🔒 TERTUTUP' : '🟢 TERBUKA'}${
        whitelist.includes(group.id) ? '\n┇ ⛔ Ada di whitelist (dilewati)' : ''
      }`,
    )
    .join('\n');

  await reply(`╭───❰  *GROUP LIST*  ❱
│ Total     : *${groups.length}* Grup
│ Terbuka   : *${terbuka}* Grup
│ Tertutup  : *${groups.length - terbuka}* Grup
╰───────────❱

*Detail Grup:*
${detail}`);
}
