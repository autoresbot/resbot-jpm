import config from '../config.js';
import { log, displayTime } from './logger.js';
import { loadPlugins } from './plugins.js';
import { extractGroupLinks, addGroupLinks } from './groupLinks.js';

let commands = {};
const sudahDilog = new Set(); // supaya peringatan nomor tidak spam

/** Hitung jumlah chat per grup, dipakai plugin autoreply */
global.chatCounter = global.chatCounter || {};

export async function initHandler() {
  commands = await loadPlugins();
}

/** Ambil teks dari berbagai jenis pesan */
function extractText(message) {
  return (
    message?.conversation ??
    message?.extendedTextMessage?.text ??
    message?.imageMessage?.caption ??
    message?.videoMessage?.caption ??
    ''
  );
}

/** Pilih JID bentuk nomor telepon kalau tersedia */
function phoneJid(utama, alternatif) {
  return alternatif?.endsWith('@s.whatsapp.net') ? alternatif : utama;
}

function onlyDigits(jid) {
  return jid?.split('@')[0].replace(/\D/g, '') || 'unknown';
}

/** Buang satu karakter awalan (prefix) dari perintah, kalau ada */
function stripPrefix(word) {
  return config.prefix.includes(word.charAt(0)) ? word.slice(1) : word;
}

/** Hanya nomor owner (atau bot itu sendiri) yang boleh memerintah */
function isAllowed(senderNumber, fromMe) {
  if (fromMe || config.nomorOwner.includes(senderNumber)) return true;

  if (!sudahDilog.has(senderNumber)) {
    sudahDilog.add(senderNumber);
    log(`Nomor ${senderNumber} tidak diizinkan untuk chat ke bot.`, 'red');
  }
  return false;
}

/** Kirim balasan tanpa membuat seluruh perintah gagal kalau koneksi bermasalah */
async function kirimAman(client, to, isi) {
  try {
    return await client.message.send(to, isi);
  } catch (error) {
    log(`Gagal mengirim balasan: ${error.message}`, 'red');
    return null;
  }
}

/** Dipanggil setiap ada pesan masuk */
export async function handleMessage(client, event) {
  try {
    const key = event.key;
    const from = key.remoteJid;
    if (!from) return;

    const text = extractText(event.message).trim();
    if (!text) return;

    const isGroup = Boolean(key.isGroup);
    const senderJid = isGroup
      ? phoneJid(key.participant, key.participantAlt)
      : phoneJid(from, key.remoteJidAlt);
    const senderNumber = onlyDigits(senderJid);

    global.chatCounter[from] = global.chatCounter[from] || { total: 0 };
    global.chatCounter[from].total += 1;

    // Kumpulkan link grup yang lewat di chat
    const links = extractGroupLinks(text);
    if (links.length) addGroupLinks(links);

    const [firstWord, ...args] = text.split(/\s+/);
    const command = stripPrefix(firstWord).toLowerCase();
    const handler = commands[command];
    if (!handler) return;

    console.log(`[${displayTime()}] ${senderNumber} : ${command}`);
    if (!isAllowed(senderNumber, key.fromMe)) return;

    await handler({
      client,
      event,
      key,
      from,
      isGroup,
      senderJid,
      senderNumber,
      text,
      command,
      args,
      body: args.join(' ').trim(),
      reply: (isi) => kirimAman(client, from, isi),
      react: (emoji) => kirimAman(client, from, { type: 'reaction', emoji, target: event }),
    });
  } catch (error) {
    log(`Gagal memproses pesan masuk: ${error.message}`, 'red');
  }
}
