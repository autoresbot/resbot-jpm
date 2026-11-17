/*
 Cek & update otomatis library zapo-js saat bot dinyalakan.

 - Membandingkan versi zapo-js (dan paket @zapo-js/*) yang terpasang
   dengan versi terbaru di npm.
 - Kalau config.autoUpdateZapo = true dan ada versi baru, langsung
   menjalankan "npm install <paket>@<versi terbaru>".
 - Kalau internet mati / npm gagal, bot tetap jalan dengan versi lama.

 PENTING: fungsi ini harus dipanggil SEBELUM file apa pun meng-import
 zapo-js, supaya versi baru yang langsung terpakai tanpa restart.
*/
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { log } from './logger.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org';
const BATAS_WAKTU_CEK = 8000; // ms, supaya start tidak lama kalau internet lambat
const BATAS_WAKTU_INSTALL = 5 * 60 * 1000; // ms

/** Paket zapo yang tercantum di dependencies package.json */
function daftarPaketZapo() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return Object.keys(pkg.dependencies ?? {}).filter(
    (nama) => nama === 'zapo-js' || nama.startsWith('@zapo-js/'),
  );
}

/** Versi yang terpasang di node_modules, atau null kalau belum terpasang */
function versiTerpasang(nama) {
  try {
    const file = path.join(ROOT, 'node_modules', ...nama.split('/'), 'package.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

/** Versi terbaru (tag "latest") dari registry npm */
async function versiTerbaru(nama) {
  const url = `${REGISTRY}/${nama.replace('/', '%2F')}/latest`;
  const res = await fetch(url, { signal: AbortSignal.timeout(BATAS_WAKTU_CEK) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).version;
}

/** true kalau versi a lebih baru dari b (format x.y.z, prerelease diabaikan) */
function lebihBaru(a, b) {
  if (!b) return true;
  const pa = a.split('-')[0].split('.').map(Number);
  const pb = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

// Hanya nama paket & versi yang wajar yang boleh masuk ke perintah npm
const POLA_PAKET = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*@\d+\.\d+\.\d+[0-9A-Za-z.+-]*$/;

function jalankanNpmInstall(paket) {
  const tidakValid = paket.filter((p) => !POLA_PAKET.test(p));
  if (tidakValid.length) throw new Error(`Nama paket tidak valid: ${tidakValid.join(', ')}`);

  const args = ['install', ...paket, '--no-audit', '--no-fund'];
  const opsi = { cwd: ROOT, encoding: 'utf8', timeout: BATAS_WAKTU_INSTALL };

  // Di Windows npm berupa npm.cmd yang wajib lewat shell. Kirim sebagai satu
  // string perintah (bukan array args) supaya tidak muncul peringatan DEP0190.
  const hasil =
    process.platform === 'win32'
      ? spawnSync(`npm ${args.join(' ')}`, { ...opsi, shell: true })
      : spawnSync('npm', args, opsi);
  if (hasil.error) throw hasil.error;
  if (hasil.status !== 0) {
    const pesan = (hasil.stderr || hasil.stdout || '').trim().split('\n').slice(-5).join('\n');
    throw new Error(pesan || `npm keluar dengan kode ${hasil.status}`);
  }
}

/**
 * Cek versi zapo-js dan update kalau diizinkan.
 * Tidak pernah melempar error — kegagalan hanya dicatat di terminal.
 */
export async function cekUpdateZapo({ autoUpdate = true } = {}) {
  let paket;
  try {
    paket = daftarPaketZapo();
  } catch (error) {
    log(`Cek update zapo-js dilewati: ${error.message}`, 'yellow');
    return;
  }

  log('Mengecek versi zapo-js terbaru...', 'blue');

  const hasilCek = await Promise.allSettled(
    paket.map(async (nama) => ({
      nama,
      terpasang: versiTerpasang(nama),
      terbaru: await versiTerbaru(nama),
    })),
  );

  const perluUpdate = [];
  for (const hasil of hasilCek) {
    if (hasil.status === 'rejected') continue;
    const { nama, terpasang, terbaru } = hasil.value;
    if (lebihBaru(terbaru, terpasang)) perluUpdate.push({ nama, terpasang, terbaru });
  }

  if (hasilCek.every((h) => h.status === 'rejected')) {
    log('Tidak bisa mengecek update zapo-js (tidak ada internet?). Lanjut dengan versi sekarang.', 'yellow');
    return;
  }

  if (!perluUpdate.length) {
    log(`zapo-js sudah versi terbaru (v${versiTerpasang('zapo-js')}).`, 'green');
    return;
  }

  for (const { nama, terpasang, terbaru } of perluUpdate) {
    log(`Update tersedia: ${nama} v${terpasang ?? '-'} → v${terbaru}`, 'yellow');
  }

  if (!autoUpdate) {
    log('autoUpdateZapo = false, update dilewati. Jalankan "npm install zapo-js@latest" untuk update manual.', 'yellow');
    return;
  }

  log('Mengupdate zapo-js, mohon tunggu...', 'blue');
  try {
    jalankanNpmInstall(perluUpdate.map(({ nama, terbaru }) => `${nama}@${terbaru}`));
    log(`zapo-js berhasil diupdate ke v${versiTerpasang('zapo-js')}.`, 'green');
  } catch (error) {
    log(`Gagal update zapo-js: ${error.message}`, 'red');
    log('Bot tetap jalan dengan versi lama.', 'yellow');
  }
}
