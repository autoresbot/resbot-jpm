const clc = require('cli-color');
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pushkontak(sock, sender, message, key) {
    const parts = message.split(' ');
    const templates = `*✯ ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ ✯*

*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ ɪᴅɢʀᴜʙ ᴛᴇxᴛ

ᴄᴏɴᴛᴏʜ: ᴘᴜꜱʜᴋᴏɴᴛᴀᴋ 123456789@g.us ᴘᴇꜱᴀɴ`;
    
    if (parts.length < 3) {
    return await sock.sendMessage(sender, { text: templates });
    }


    const command = parts[0]; // Kata pertama
    const idgrub = parts[1];  // Kata kedua
    const text = parts.slice(2).join(' '); // Gabungkan sisa pesan


    if (!message.includes("@g.us")) {
        return await sock.sendMessage(sender, { text: templates });
    }
    
    if(text.length == 0){
        return await sock.sendMessage(sender, { react: { text: "🚫", key } });
    }

    await sock.sendMessage(sender, { react: { text: "⏰", key } });

    const allParticipant = await getGroupParticipants(sock, idgrub);


    if(!allParticipant){
        return await sock.sendMessage(sender, { react: { text: "🚫", key } });
    }

    const totalMember = allParticipant.length;

    let nomor = 1;
    for (const participant of allParticipant) {
        console.log(clc.green(`[${nomor}] Mengirim Pesan ke nomor : ${participant.id}`));
        await sock.sendMessage(participant.id, { text: text });
        await sleep(global.jeda);
        nomor++;
    }
    const pushcontact_finish = `*✅ Proses Pushkontak ke ${totalMember} Nomor telah Selesai*`
    return await sock.sendMessage(sender, { text: pushcontact_finish });
}

async function getGroupParticipants(sock, groupId) {
    try {
        const metadata = await sock.groupMetadata(groupId);
        const participants = metadata.participants;
        return participants;
    } catch (error) {
        return false;
    }
}



module.exports = pushkontak;