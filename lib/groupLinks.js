import fs from 'fs';
import { log } from './logger.js';
import { FILE_GROUP_LINKS, ensureDataDir } from './paths.js';
const POLA_LINK = /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/g;
const JEDA_SIMPAN = 30 * 1000; // tulis ke file paling cepat 30 detik sekali

let links = new Set();
let timer = null;

function load() {
  try {
    if (!fs.existsSync(FILE_GROUP_LINKS)) return;
    const data = JSON.parse(fs.readFileSync(FILE_GROUP_LINKS, 'utf8'));
    if (Array.isArray(data)) links = new Set(data);
  } catch (error) {
    log(`Gagal membaca group-links.json: ${error.message}`, 'red');
  }
}

function scheduleSave() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const data = [...links];
    ensureDataDir();
    fs.writeFileSync(FILE_GROUP_LINKS, JSON.stringify(data, null, 2));
    log(`${data.length} link grup tersimpan ke group-links.json`);
  }, JEDA_SIMPAN);
  timer.unref?.();
}

/** Ambil semua link undangan grup dari sebuah teks */
export function extractGroupLinks(text) {
  return text.match(POLA_LINK) ?? [];
}

/** Simpan link grup baru (duplikat diabaikan) */
export function addGroupLinks(newLinks) {
  const sebelum = links.size;
  for (const link of newLinks) links.add(link);
  if (links.size > sebelum) scheduleSave();
}

/**
 * Kosongkan daftar link grup, termasuk yang masih di memori dan
 * simpanan yang sedang menunggu ditulis. Mengembalikan jumlah link terhapus.
 */
export function resetGroupLinks() {
  const jumlah = links.size;

  links.clear();
  clearTimeout(timer);
  timer = null;

  ensureDataDir();
  fs.writeFileSync(FILE_GROUP_LINKS, '[]');
  return jumlah;
}

load();
