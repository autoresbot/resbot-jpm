/*
⚠️ PERINGATAN:
Script ini **TIDAK BOLEH DIPERJUALBELIKAN** dalam bentuk apa pun!

╔══════════════════════════════════════════════╗
║                🛠️ INFORMASI SCRIPT           ║
╠══════════════════════════════════════════════╣
║ 📦 Version   : 2.0
║ 👨‍💻 Developer  : Azhari Creative              ║
║ 🌐 Website    : https://autoresbot.com       ║
║ 💻 GitHub     : github.com/autoresbot/resbot-jpm
╚══════════════════════════════════════════════╝

📌 Mulai 11 April 2025,
Script **Autoresbot** resmi menjadi **Open Source** dan dapat digunakan secara gratis:
🔗 https://autoresbot.com
*/

console.log('Start App ..')


import fs from "fs";
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import qrcode from "qrcode-terminal";
import readline from "readline";
import clc from "cli-color";


import {
  deleteFolderRecursive,
  ChangeStatus,
  getStatus,
  handleCommand,
  displayTime,
  logWithTime
} from "./lib/utils.js";


import resumeAutoJPM from "./lib/resumeAutoJPM.js";

// Pengganti __dirname di ESM
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = __dirname;
const status = getStatus(`${basePath}/sessions/`);


async function connectToWhatsApp(number = null) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("sessions");
    const { version } = await fetchLatestBaileysVersion();

   
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 6000,
      logger: P({ level: "silent" }),
      // syncFullHistory: false,  // Nonaktifkan sinkronisasi riwayat chat
      // emitOwnEvents: false,  // Hindari pemrosesan event milik sendiri
      // markOnlineOnConnect: false,  // Hindari update status online setiap terhubung
      // downloadHistory: false,  // Hindari unduhan otomatis riwayat chat
    });

    sock.ev.on("connection.update", (update) =>
      handleConnectionUpdate(sock, update, number)
    );
    sock.ev.on("messages.upsert", (message) =>
      handleIncomingMessages(sock, message)
    );
    sock.ev.on("creds.update", saveCreds);
  } catch (error) {
    logWithTime("Failed to connect to WhatsApp", "red");
  }
}

async function handleConnectionUpdate(sock, update, number) {
  const { connection, lastDisconnect, qr } = update;
  if (pairingMethod === "qr" && qr) {
    qrcode.generate(qr, { small: true });
    console.log(clc.red.bold("Please scan the QR code displayed above."));
  } else if (
    connection &&
    pairingMethod === "pairing" &&
    number &&
    !sock.authState.creds.registered
  ) {
    const phoneNumber = number.toString();
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    console.log(clc.yellow(`Meminta Code...`));
    await delay(3000);
    const code = await sock.requestPairingCode(phoneNumber.trim());
    const formattedCode = code.slice(0, 4) + "-" + code.slice(4);

    console.log(`${clc.green.bold("Code Pairing :")} ${formattedCode}`);
  }

  if (connection === "close") {
    const shouldReconnect =
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    logWithTime("Connection Closed", "red");
    ChangeStatus(`${basePath}/sessions/`, "closed");
    if (shouldReconnect) {
      connectToWhatsApp();
    }
  } else if (connection === "open") {
    logWithTime("Connection Success", "green");
    ChangeStatus(`${basePath}/sessions/`, "connected");
    // Setelah sock siap:

    resumeAutoJPM(sock);
  }
}

async function handleIncomingMessages(sock, messageEvent) {
  try {
    const message = messageEvent.messages?.[0];
    if (!message) throw new Error("Message is undefined or empty");
    const type = messageEvent?.type ?? false;
    if (type && type == "append") {
      return false; // cegah bot kirim berulang
    }

    // Determine if the message is from a group
    const isGroup = Boolean(message.key?.participant);
    const sender = message.key?.remoteJidAlt || message.key?.remoteJid;
    const key = message?.key;
    // Determine the sender number based on whether the message is from a group or not
    const senderNumber = (() => {
      if (isGroup) {
        const participant = message.key?.participantAlt || message.key?.participant;
        return participant ? participant.split("@")[0] : "unknown";
      } else {
        return sender ? sender.split("@")[0] : "unknown";
      }
    })();

    const fromMe = message.key?.fromMe ?? false;
    const status = message?.status ?? false;
    const textMessage =
      message.message?.extendedTextMessage?.text ||
      message.message?.conversation ||
      message.message?.imageMessage?.caption ||
      "";

    if (textMessage) {
      await handleCommand(
        sock,
        sender,
        textMessage.trim(),
        key,
        senderNumber,
        messageEvent,
        fromMe
      );
    }
  } catch (error) {
    console.log(
      clc.yellow.underline(
        `[${displayTime()}] Failed to handle incoming message!`
      )
    );
  }
}

let pairingMethod = "";
if (status && status == "connected") {
  logWithTime("Connecting ...", "green");
  //deleteFolderRecursive(basePath, 'tmp');
  connectToWhatsApp();
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Flush the output to ensure it appears immediately
  function flushOutput() {
    process.stdout.write("");
  }

  // Display prompt and handle input
  console.log(clc.yellow.bold("Pilih metode koneksi (qr/pairing):"));
  flushOutput();
  deleteFolderRecursive(basePath, "sessions");
  rl.question("", (method) => {
    if (method === "qr" || method === "pairing") {
      pairingMethod = method;
      if (method === "pairing") {
        console.log(clc.yellow.bold("Masukkan nomor telepon: :"));
        rl.question("", (number) => {
          connectToWhatsApp(number.trim());
          rl.close();
          return;
        });
      } else {
        connectToWhatsApp();
        rl.close();
        return;
      }
    } else {
      logWithTime('Metode koneksi tidak valid. Pilih "qr" atau "pairing".');
      rl.close();
      return;
    }
  });
}
