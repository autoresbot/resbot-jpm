/*
⚠️ PERINGATAN:
Script ini **TIDAK BOLEH DIPERJUALBELIKAN** dalam bentuk apa pun!

╔══════════════════════════════════════════════╗
║                🛠️ INFORMASI SCRIPT           ║
╠══════════════════════════════════════════════╣
║ 📦 Version   : 2.1
║ 👨‍💻 Developer  : Azhari Creative              ║
║ 🌐 Website    : https://autoresbot.com       ║
║ 💻 GitHub     : github.com/autoresbot/resbot-jpm
╚══════════════════════════════════════════════╝

📌 Mulai 11 April 2025,
Script **Autoresbot** resmi menjadi **Open Source** dan dapat digunakan secara gratis:
🔗 https://autoresbot.com

Semua pengaturan ada di file config.js
*/

import config from './config.js';
import { log } from './lib/logger.js';
import { startBot } from './lib/whatsapp.js';
import { resumeAutoJPM } from './lib/autojpm.js';
import { modeUjiCoba } from './lib/mode.js';
import { migrateOldFolders } from './lib/paths.js';

console.log(`Start App .. ${config.namaBot} v${config.versi}`);

// Pengguna versi lama: pindahkan ADDTIONAL/ & DATABASE/ ke data/
for (const pindahan of migrateOldFolders()) log(`Data dipindahkan: ${pindahan}`, 'yellow');

if (modeUjiCoba()) {
  log('=========================================================', 'yellow');
  log('MODE DEVELOPMENT (UJI COBA) - pesan massal TIDAK dikirim.', 'yellow');
  log('Ubah "mode" di config.js jadi "production" untuk kirim asli.', 'yellow');
  log('=========================================================', 'yellow');
}

// Nomor owner harus berupa angka semua, kalau tidak bot mengabaikan semua perintah
const nomorSalah = config.nomorOwner.filter((nomor) => !/^\d+$/.test(nomor));
if (nomorSalah.length) {
  log('=========================================================', 'red');
  log(`"nomorOwner" belum benar: ${nomorSalah.join(', ')}`, 'red');
  log('Isi dengan nomor WhatsApp Anda di config.js, contoh: 6281234567890', 'yellow');
  log('(pakai kode negara, tanpa tanda + dan tanpa spasi)', 'yellow');
  log('Selama belum diganti, bot tidak akan menuruti perintah siapa pun.', 'yellow');
  log('=========================================================', 'red');
}

startBot((client) => {
  // Dijalankan setiap koneksi berhasil terbuka
  resumeAutoJPM(client);
}).catch((error) => {
  log(`Gagal menjalankan bot: ${error.message}`, 'red');
  process.exit(1);
});
