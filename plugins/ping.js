async function ping(sock, sender, message, key, messageEvent) {

    const msg = `
╭─❰  *${global.name_script}*  ❱
│
│ Version : *${global.version}*
│ Status  : *Aktif*
│ Time    : ${new Date().toLocaleTimeString("id-ID")}
╰──────────❱
`;

    await sock.sendMessage(sender, { text: msg });
}

export default ping;
