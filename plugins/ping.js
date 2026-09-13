import config from '../config.js';

export default async function ping({ reply }) {
  await reply(`╭─❰  *${config.namaBot}*  ❱
│
│ Version : *${config.versi}*
│ Status  : *Aktif*
│ Time    : ${new Date().toLocaleTimeString('id-ID')}
╰──────────❱`);
}
