import clc from 'cli-color';
import fs from 'fs';
import { isImageMessage, downloadAndSaveMedia, readWhitelist } from '../lib/utils.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllGroups(sock) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        return Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject
        }));
    } catch (error) {
        console.error(clc.red("[ERROR] Gagal mengambil daftar grup:"), error);
        return [];
    }
}

async function jpm(sock, sender, messages, key, messageEvent) {
    const message = messageEvent.messages?.[0];
    let imagePath = null;

    // Cek apakah ada gambar yang ikut dikirim
    if (isImageMessage(messageEvent)) {
        try {
            const filename = `${sender}.jpeg`;
            const result = await downloadAndSaveMedia(sock, message, filename);
            if (result) imagePath = `./tmp/${filename}`;
        } catch (error) {
            console.error(clc.red("[ERROR] Saat mengunduh gambar:"), error);
        }
    }

    // Validasi perintah
    const parts = messages.trim().split(' ');
    if (parts.length < 2) {
        return sock.sendMessage(sender, {
            text:
`Cara Penggunaan Perintah JPM:
Ketik: jpm <pesan>

Contoh:
jpm Selamat pagi, semoga sehat selalu.`
        });
    }

    const text = parts.slice(1).join(' ');
    if (!text) {
        return sock.sendMessage(sender, {
            text: "Gagal mengirim: pesan tidak boleh kosong.",
            key
        });
    }

    await sock.sendMessage(sender, {
        text: "Memproses pengiriman pesan, harap tunggu..."
    });

    // Ambil semua grup yang diikuti bot
    const allGroups = await getAllGroups(sock);
    if (!allGroups.length) {
        return sock.sendMessage(sender, {
            text: "Tidak ada grup yang tersedia untuk mengirimkan pesan."
        });
    }

    // Baca whitelist (sebagai blacklist)
    const whitelist = readWhitelist();
    const targetGroups = whitelist
        ? allGroups.filter(group => !whitelist.includes(group.id))
        : allGroups;

    if (targetGroups.length === 0) {
        return sock.sendMessage(sender, {
            text: "Semua grup berada dalam daftar pengecualian. Tidak ada grup yang dikirimi pesan."
        });
    }

    let groupCount = 1;
    for (const group of targetGroups) {
        console.log(clc.green(`[${groupCount}/${targetGroups.length}] Mengirim ke grup: ${group.name}`));

        try {
            
            // Cegah menunggu terlalu lama
            await Promise.race([
                sock.sendMessage(
                    group.id,
                    imagePath
                        ? { image: fs.readFileSync(imagePath), caption: text }
                        : { text }
                ),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout saat mengirim pesan')), 10000)
                )
            ]);
        } catch (error) {
            console.error(clc.red(`[ERROR] Gagal mengirim ke grup ${group.name}:`));
        }

        await sleep(global.jeda || 5000); // jeda antar kirim
        groupCount++;
    }

    return sock.sendMessage(sender, {
        text: `Pesan selesai dikirim ke ${targetGroups.length} grup.`
    });
}

export default jpm;
