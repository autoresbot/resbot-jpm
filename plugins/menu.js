async function menu(sock, sender, message) {

  const templates = `
╭❰  *✯ RESBOT JPM ✯*  ❱
│
│ Status : ACTIVE
│ User   : ${sender.split('@')[0]}
╰────────────❱

┌─ *COMMANDS*
│
│ ➤  ʟɪꜱᴛɢᴄ
│ ➤  ᴀᴜᴛᴏᴊᴘᴍ
│ ➤  ᴀᴜᴛᴏʀᴇᴘʟʏ
│ ➤  ᴊᴘᴍ
│ ➤  ᴊᴘᴍᴛᴀɢ
│ ➤  ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ
└───────────

© autoresbot.com`;

  await sock.sendMessage(sender, { text: templates });
}

export default menu;
