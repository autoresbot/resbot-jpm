async function ping(sock, sender, message, key, messageEvent) {
    const msg = `*${global.name_script} Version ${global.version}*

_Status Bot_ : *aktif* `;
    await sock.sendMessage(sender, { text: msg });
}

module.exports = ping;