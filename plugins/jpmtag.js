import clc from 'cli-color';
import fs from 'fs';
import path from 'path';
import { isImageMessage, downloadAndSaveMedia, readWhitelist } from '../lib/utils.js';


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllGroups(sock) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        return Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject,
            participants : group.participants
        }));
    } catch (error) {
        console.error(clc.red("❌ Gagal mengambil grup:"), error);
        return [];
    }
}

async function jpmtag(sock, sender, messages, key, messageEvent) {
    const message = messageEvent.messages?.[0];
    let imagePath = null;

    // Cek apakah ada gambar
    if (isImageMessage(messageEvent)) {
        try {
            const filename = `${sender}.jpeg`;
            const result = await downloadAndSaveMedia(sock, message, filename);
            if (result) imagePath = `./tmp/${filename}`;
        } catch (error) {
            console.error(clc.red("❌ Error saat mengunduh gambar:"), error);
        }
    }

    // Validasi isi pesan
    const parts = messages.trim().split(' ');
    if (parts.length < 2) {
        return sock.sendMessage(sender, {
            text: `*ᴄᴀʀᴀ ᴘᴇɴɢɢᴜɴᴀᴀɴ*\n➽ ᴊᴘᴍᴛᴀɢ ᴛᴇxᴛ\n\nᴄᴏɴᴛᴏʜ: ᴊᴘᴍᴛᴀɢ ᴘᴇꜱᴀɴ`
        });
    }

    const text = parts.slice(1).join(' ');
    if (!text) {
        return sock.sendMessage(sender, { react: { text: "🚫", key } });
    }

    await sock.sendMessage(sender, { react: { text: "⏰", key } });

    // Ambil semua grup
    const allGroups = await getAllGroups(sock);
    if (!allGroups.length) {
        return sock.sendMessage(sender, { react: { text: "🚫", key } });
    }

    // Baca whitelist (jadi blacklist)
    const whitelist = readWhitelist();
    const targetGroups = whitelist
        ? allGroups.filter(group => !whitelist.includes(group.id))
        : allGroups;

    if (targetGroups.length === 0) {
        return sock.sendMessage(sender, {
            text: "⚠️ Tidak ada grup yang cocok untuk dikirim pesan (semua ada di whitelist)."
        });
    }

    let groupCount = 1;
    for (const group of targetGroups) {
         const participants = Array.isArray(group?.participants) ? group.participants : [];
        const mentions = participants.map(p => p.id);

        console.log(clc.green(`[${groupCount}/${targetGroups.length}] Kirim ke grup: ${group.name}`));
 

        try {
            // Timeout pengiriman agar tidak hang selamanya
            await Promise.race([
                sock.sendMessage(group.id, imagePath
                    ? { image: fs.readFileSync(imagePath), caption: text, mentions: mentions, }
                    : { text, mentions: mentions }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout saat kirim pesan')), 10000)
                )
            ]);
        } catch (error) {
            console.error(clc.red(`❌ Gagal mengirim ke ${group.name}:`));
        }

        await sleep(global.jeda || 5000); // jeda antar grup
        groupCount++;
    }

    return sock.sendMessage(sender, {
        text: `✅ *Pesan berhasil dikirim ke ${targetGroups.length} grup.*`
    });
}

export default jpmtag;
