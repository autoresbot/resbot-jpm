import fs from 'fs';
import { log } from './logger.js';
import { FILE_WHITELIST, ensureDataDir } from './paths.js';

/**
 * Daftar ID grup yang TIDAK ikut dikirimi pesan (pengecualian)
 * untuk jpm, jpmtag, autojpm, dan autoreply.
 * File dibuat otomatis kalau belum ada.
 */
export function readWhitelist() {
  try {
    ensureDataDir();
    if (!fs.existsSync(FILE_WHITELIST)) fs.writeFileSync(FILE_WHITELIST, '[]', 'utf8');

    const data = JSON.parse(fs.readFileSync(FILE_WHITELIST, 'utf8'));
    return Array.isArray(data) ? data.filter((id) => typeof id === 'string') : [];
  } catch (error) {
    log(`Gagal membaca whitelist.json: ${error.message}`, 'red');
    return [];
  }
}

/** Simpan daftar whitelist ke file */
function writeWhitelist(list) {
  ensureDataDir();
  fs.writeFileSync(FILE_WHITELIST, JSON.stringify(list, null, 2), 'utf8');
}

/** Tambah beberapa ID grup. Mengembalikan yang berhasil & yang sudah ada. */
export function addToWhitelist(ids) {
  const list = readWhitelist();
  const ditambah = [];
  const sudahAda = [];

  for (const id of ids) {
    if (list.includes(id)) sudahAda.push(id);
    else {
      list.push(id);
      ditambah.push(id);
    }
  }

  if (ditambah.length) writeWhitelist(list);
  return { ditambah, sudahAda };
}

/** Hapus beberapa ID grup. Mengembalikan yang terhapus & yang tidak ketemu. */
export function removeFromWhitelist(ids) {
  const list = readWhitelist();
  const dihapus = [];
  const tidakAda = [];

  for (const id of ids) {
    const posisi = list.indexOf(id);
    if (posisi === -1) tidakAda.push(id);
    else {
      list.splice(posisi, 1);
      dihapus.push(id);
    }
  }

  if (dihapus.length) writeWhitelist(list);
  return { dihapus, tidakAda };
}

/** Kosongkan whitelist. Mengembalikan jumlah grup yang dihapus. */
export function clearWhitelist() {
  const jumlah = readWhitelist().length;
  writeWhitelist([]);
  return jumlah;
}

/**
 * Pecah masukan pengguna jadi nomor urut atau ID grup.
 * Contoh: "1,2 5"  ->  { nomor: [1, 2, 5], jid: [] }
 *         "12036@g.us" -> { nomor: [], jid: ['12036@g.us'] }
 */
export function pecahTarget(teks) {
  const nomor = [];
  const jid = [];
  const salah = [];

  for (const bagian of teks.split(/[\s,]+/).filter(Boolean)) {
    if (bagian.includes('@')) jid.push(bagian);            // ID grup langsung
    else if (/^\d{1,3}$/.test(bagian)) nomor.push(Number(bagian)); // nomor dari daftar
    else if (/^[\d-]{4,}$/.test(bagian)) jid.push(`${bagian}@g.us`); // ID tanpa @g.us
    else salah.push(bagian);
  }

  return { nomor, jid, salah };
}

export default readWhitelist;
