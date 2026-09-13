import config from '../config.js';

const perintah = [
  'listgc',
  'jpm',
  'jpmtag',
  'autojpm',
  'autoreply',
  'pushkontak',
  'whitelist',
  'addwhitelist',
  'delwhitelist',
  'ping',
  'resetdata',
];

export default async function menu({ reply, senderNumber }) {
  const daftar = perintah.map((nama) => `│ ➤  ${nama}`).join('\n');

  await reply(`╭❰  *${config.namaBot}*  ❱
│
│ Status : ACTIVE
│ User   : ${senderNumber}
╰────────────❱

┌─ *COMMANDS*
│
${daftar}
└───────────

© autoresbot.com`);
}
