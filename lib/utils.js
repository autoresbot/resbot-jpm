import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";

import clc from "cli-color";
import P from "pino";
import { writeFile, mkdir } from "fs/promises";
import { downloadMediaMessage } from "baileys";
import { numberAllowed } from "../config.js";
import { extractGroupLinks, addGroupLinks } from "./grupLinkStore.js";

// Pengganti __dirname di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const loggedNumbers = new Set(); // simpan nomor yang sudah dilog

async function downloadAndSaveMedia(sock, message, filename) {
  try {
    // Tentukan path ke folder tmp, keluar satu folder dari __dirname
    const tmpDir = path.join(__dirname, "..", "tmp");
    const filePath = path.join(tmpDir, filename);

    // Cek apakah folder tmp ada, jika tidak, buat folder tersebut
    if (!fs.existsSync(tmpDir)) {
      await mkdir(tmpDir, { recursive: true });
    }

    // Unduh media
    const buffer = await downloadMediaMessage(
      message,
      "buffer",
      {},
      {
        logger: P({ level: "silent" }),
        reuploadRequest: sock.updateMediaMessage,
      }
    );

    // Simpan buffer ke file di folder tmp
    await writeFile(filePath, buffer);
    return true; // Kembalikan true jika berhasil
  } catch (error) {
    console.log(error);
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
  const filePath = path.join(basePath, "status.txt");
  fs.writeFileSync(filePath, status, "utf8");
}

function getStatus(basePath) {
  const filePath = path.join(basePath, "status.txt");
  if (fs.existsSync(filePath)) {
    const status = fs.readFileSync(filePath, "utf8");
    return status;
  } else {
    return null;
  }
}

function logWithTime(message, color = "green") {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timestamp = `[${hours}:${minutes}]`;

  // pilih warna
  let coloredMessage;
  switch (color.toLowerCase()) {
    case "red":
      coloredMessage = clc.red(`${timestamp} ${message}`);
      break;
    case "yellow":
      coloredMessage = clc.yellow(`${timestamp} ${message}`);
      break;
    case "blue":
      coloredMessage = clc.blue(`${timestamp} ${message}`);
      break;
    case "green":
    default:
      coloredMessage = clc.green(`${timestamp} ${message}`);
      break;
  }

  console.log(coloredMessage);
}


function displayTime() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  // Tambahkan nol di depan angka jika kurang dari 10
  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;

  const timeString = `${hours}:${minutes}`;
  return timeString;
}

function extractNumber(raw) {
  // Ambil hanya angka sebelum karakter @
  return raw?.split("@")[0].replace(/\D/g, "") || "unknown";
}

function isAllowed(senderNumber, fromMe) {
  const numericSender = extractNumber(senderNumber); // hasil: 6289501427163

  if (!numberAllowed.includes(numericSender) && !fromMe) {
    if (!loggedNumbers.has(numericSender)) {
      console.log(
        clc.red(
          `[${displayTime()}] Nomor ${senderNumber} tidak diizinkan untuk chat ke bot.`
        )
      );
      loggedNumbers.add(numericSender);
    }
    return false;
  }

  return true;
}

async function loadCommands() {
  const commands = {};
  const pluginDir = path.join(__dirname, "..", "plugins");
  const files = fs.readdirSync(pluginDir);

  for (const file of files) {
    if (file.endsWith(".js")) {
      const commandName = path.basename(file, ".js");
      const commandPath = path.join(pluginDir, file);

      // Ubah path Windows menjadi file:// URL
      const module = await import(pathToFileURL(commandPath).href);

      // Jika modul menggunakan default export
      commands[commandName] = module.default || module;
    }
  }

  return commands;
}


let commandHandlers;
(async () => {
  commandHandlers = await loadCommands();
})();

// Di luar fungsi, sebagai penyimpanan sementara di memori
global.chatCounter = global.chatCounter || {}; // Inisialisasi jika belum ada

async function handleCommand(
  sock,
  sender,
  command,
  key,
  senderNumber,
  messageEvent,
  fromMe
) {
  // Track sender
  if (!global.chatCounter[sender]) {
    global.chatCounter[sender] = { total: 0 };
  }
  global.chatCounter[sender].total += 1;

  // Insert link grub
  const links = extractGroupLinks(command);
  if (links.length > 0) {
    addGroupLinks(links);
  }
  let firstWord = command.split(" ")[0];

  // Buang karakter awal jika dia termasuk dalam array global.prefix
  while (global.prefix.includes(firstWord.charAt(0))) {
    firstWord = firstWord.substring(1);
  }

  const handler = commandHandlers[firstWord];
  if (handler) {
    console.log(
      `[${clc.yellow(displayTime())}] ${clc.yellow(senderNumber)} : ${clc.green(
        firstWord
      )}`
    );
    // saya mau kirim lagi : isImageMessage, downloadAndSaveMedia, downloadMediaMessage

    if (!isAllowed(senderNumber, fromMe)) return false;

    await handler(sock, sender, command, key, messageEvent);
  }
}

// Fungsi untuk membaca file whitelist.json dari direktori ADDTIONAL
function readWhitelist() {
  try {
    const dirPath = path.join(process.cwd(), "ADDTIONAL");
    const whitelistPath = path.join(dirPath, "whitelist.json");

    // Buat folder jika belum ada
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Buat file jika belum ada
    if (!fs.existsSync(whitelistPath)) {
      fs.writeFileSync(whitelistPath, "[]", "utf8"); // isi default array kosong
    }

    const rawData = fs.readFileSync(whitelistPath, "utf8");
    const whitelist = JSON.parse(rawData);

    return Array.isArray(whitelist) ? whitelist : [];
  } catch (error) {
    console.error("❌ Gagal membaca whitelist:", error);
    return [];
  }
}

export {
  readWhitelist,
  deleteFolderRecursive,
  ChangeStatus,
  getStatus,
  handleCommand,
  displayTime,
  isImageMessage,
  downloadAndSaveMedia,
  logWithTime
};
