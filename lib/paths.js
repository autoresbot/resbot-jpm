import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

/** Folder data bot: whitelist, link grup, status autojpm */
export const DATA_DIR = path.join(ROOT, 'data');

/** Folder file sementara: gambar yang diunduh dari pesan */
export const TMP_DIR = path.join(ROOT, 'tmp');

export const FILE_WHITELIST = path.join(DATA_DIR, 'whitelist.json');
export const FILE_GROUP_LINKS = path.join(DATA_DIR, 'group-links.json');
export const FILE_AUTOJPM_STATE = path.join(DATA_DIR, 'autojpm-state.json');
export const FILE_AUTOJPM_IMAGE = path.join(DATA_DIR, 'autojpm-image.jpg');

/** Pastikan folder data ada */
export function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Struktur folder lama (sebelum dirapikan) -> lokasi baru
const PINDAHAN = [
  ['ADDTIONAL/whitelist.json', FILE_WHITELIST],
  ['ADDTIONAL/autojpm_status.json', FILE_AUTOJPM_STATE],
  ['ADDTIONAL/autojpm_image.jpg', FILE_AUTOJPM_IMAGE],
  ['DATABASE/data_grub.json', FILE_GROUP_LINKS],
];

/**
 * Pindahkan data dari folder lama (ADDTIONAL/ dan DATABASE/) ke folder data/.
 * Hanya berjalan sekali, untuk pengguna yang memperbarui dari versi lama.
 */
export function migrateOldFolders() {
  const dipindah = [];

  for (const [lama, baru] of PINDAHAN) {
    const asal = path.join(ROOT, lama);
    if (!fs.existsSync(asal) || fs.existsSync(baru)) continue;

    ensureDataDir();
    fs.renameSync(asal, baru);
    dipindah.push(`${lama} -> data/${path.basename(baru)}`);
  }

  // Buang folder lama kalau sudah kosong
  for (const folder of ['ADDTIONAL', 'DATABASE']) {
    const dir = path.join(ROOT, folder);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }

  return dipindah;
}
