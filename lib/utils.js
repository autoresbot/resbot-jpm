// lib/utils.js
const fs = require('fs');
const path = require('path');
const clc = require('cli-color');
const P = require('pino');
const { writeFile, mkdir } = require('fs/promises');
const { downloadMediaMessage } = require('baileys');

async function downloadAndSaveMedia(sock, message, filename) {
    try {
        // Tentukan path ke folder tmp, keluar satu folder dari __dirname
        const tmpDir = path.join(__dirname, '..', 'tmp');
        const filePath = path.join(tmpDir, filename);

        // Cek apakah folder tmp ada, jika tidak, buat folder tersebut
        if (!fs.existsSync(tmpDir)) {
            await mkdir(tmpDir, { recursive: true });
        }

        // Unduh media
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            { 
                logger: P({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }
        );

        // Simpan buffer ke file di folder tmp
        await writeFile(filePath, buffer);
        return true; // Kembalikan true jika berhasil
    } catch (error) {
        console.log(error)
        return false; // Kembalikan false jika terjadi kesalahan
    }
}

function isImageMessage(messageEvent) {
    if (messageEvent.messages && messageEvent.messages.length > 0) {
        const message = messageEvent.messages[0].message;
        if (message && message.imageMessage) {
            return true;
        }
    }
    return false;
}

function deleteFolderRecursive(basePath, folderName) {
    const folderPath = path.join(basePath, folderName);

    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // Jika adalah folder, panggil fungsi ini secara rekursif
                deleteFolderRecursive(folderPath, file);
            } else {
                // Jika adalah file, hapus file tersebut
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

function ChangeStatus(basePath, status) {
    const filePath = path.join(basePath, 'status.txt');
    fs.writeFileSync(filePath, status, 'utf8');
}

function getStatus(basePath) {
    const filePath = path.join(basePath, 'status.txt');
    if (fs.existsSync(filePath)) {
        const status = fs.readFileSync(filePath, 'utf8');
        return status;
    } else {
        return null;
    }
}


function displayTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    // Tambahkan nol di depan angka jika kurang dari 10
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    const timeString = `${hours}:${minutes}`;
    return timeString;
}


function loadCommands() {
    const commands = {};
    const pluginDir = path.join(__dirname, '..', 'plugins');
    const files = fs.readdirSync(pluginDir);
    files.forEach(file => {
        if (file.endsWith('.js')) {
            const commandName = path.basename(file, '.js');
            const commandPath = path.join(pluginDir, file);
            commands[commandName] = require(commandPath);
        }
    });
    return commands;
}
const commandHandlers = loadCommands();
async function handleCommand(sock, sender, command, key, senderNumber, messageEvent) {
    let firstWord = command.split(' ')[0];

    // Buang karakter awal jika dia termasuk dalam array global.prefix
    while (global.prefix.includes(firstWord.charAt(0))) {
        firstWord = firstWord.substring(1);
    }

    const handler = commandHandlers[firstWord];
    if (handler) {
        console.log(`[${clc.yellow(displayTime())}] ${clc.yellow(senderNumber)} : ${clc.green(firstWord)}`);
        // saya mau kirim lagi : isImageMessage, downloadAndSaveMedia, downloadMediaMessage
        await handler(sock, sender, command, key, messageEvent);
    }
}


module.exports = { deleteFolderRecursive, ChangeStatus, getStatus, handleCommand, displayTime, isImageMessage, downloadAndSaveMedia };
