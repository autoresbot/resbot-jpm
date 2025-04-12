const clc = require('cli-color');
const fs = require('fs');


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getallgc(sock) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        // Format data grup
        return Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject
        }));
    } catch (error) {
        console.error("Failed to fetch groups:", error);
        return false;
    }
}

async function jpm(sock, sender, messages, key, messageEvent) {
    const message = messageEvent.messages?.[0];
    let imagePath = null;

    const { isImageMessage, downloadAndSaveMedia } = require('../lib/utils');

    if (isImageMessage(messageEvent)) {
        try {
            const filename = `${sender}.jpeg`;
            const result = await downloadAndSaveMedia(sock, message, filename);

            if (result) {
                imagePath = `./tmp/${filename}`;
            }
        } catch (error) {
            console.error("An error occurred during image download and save:", error);
        }
    }

    const parts = messages.trim().split(' ');

    if (parts.length < 2) {
        const usageTemplate = `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*
➽ ᴊᴘᴍ ᴛᴇxᴛ

ᴄᴏɴᴛᴏʜ: ᴊᴘᴍ ᴘᴇꜱᴀɴ`;
        return sock.sendMessage(sender, { text: usageTemplate });
    }

    const command = parts[0];
    const text = parts.slice(1).join(' ');

    if (!text) {
        return sock.sendMessage(sender, { react: { text: "🚫", key } });
    }

    await sock.sendMessage(sender, { react: { text: "⏰", key } });

    const groupList = await getallgc(sock);

    if (!groupList) {
        return sock.sendMessage(sender, { react: { text: "🚫", key } });
    }

    let groupCount = 1;
    for (const group of groupList) {
        console.log(clc.green(`[${groupCount}] Mengirim Pesan ke grup: ${group.name}`));

        try {
            if (imagePath) {
                await sock.sendMessage(group.id, {
                    image: fs.readFileSync(imagePath),
                    caption: text
                });
            } else {
                await sock.sendMessage(group.id, { text: text });
            }
        } catch (error) {
            console.error(`Failed to send message to group ${group.name}:`, error);
        }

        await sleep(global.jeda);
        groupCount++;
    }

    const completionMessage = `*✅ Kirim Pesan Ke ${groupList.length} Grup Telah Selesai*`;
    return sock.sendMessage(sender, { text: completionMessage });
}

module.exports = jpm;
