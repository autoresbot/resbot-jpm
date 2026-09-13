/*
╔══════════════════════════════════════════════╗
║              PENGATURAN BOT                  ║
╠══════════════════════════════════════════════╣
║ Cukup ubah angka / teks di bawah ini.        ║
║ Jangan hapus tanda koma ( , ) dan kutip ( ' )║
╚══════════════════════════════════════════════╝

Script Resbot JPM - https://autoresbot.com
Gratis & open source. DILARANG DIPERJUALBELIKAN.
*/

const config = {
  // 1) Nomor yang boleh menyuruh bot.  <-- WAJIB DIGANTI
  //    Pakai kode negara, tanpa tanda + dan tanpa spasi.
  //    Contoh benar : ['6281234567890']
  //    Contoh salah : ['+62 812-3456-7890']  (ada +, spasi, dan strip)
  //    Boleh lebih dari satu: ['628111', '628222']
  nomorOwner: ['628xxxxxxxxxx'],

  // 2) Awalan perintah. Contoh: .menu  atau  #menu
  //    Perintah tanpa awalan (menu) juga tetap bisa.
  prefix: ['.', '#'],

  // 3) Identitas bot (muncul di menu & ping)
  namaBot: 'Script Resbot Jpm',
  versi: '2.3.0',

  // 4) Jeda dalam DETIK antar pengiriman ke tiap grup / kontak.
  //    Makin besar makin aman dari banned. Jangan di bawah 5.
  jedaKirim: 15,

  // 5) Pengaturan AUTOJPM (broadcast yang mengulang terus)
  autojpm: {
    tagSemua: false, // true = tag semua anggota grup, false = tidak
    jedaPutaran: 10, // jeda DETIK sebelum mengulang putaran berikutnya
  },

  // 6) Lokasi penyimpanan sesi login WhatsApp.
  //    Hapus file ini kalau mau login ulang dengan nomor lain.
  fileSesi: 'sessions/whatsapp.sqlite',

  // 7) MODE BOT
  //
  //    'production'  = NORMAL. Pesan benar-benar dikirim.
  //
  //    'development' = UJI COBA. Pesan dari jpm, jpmtag, autojpm,
  //                    pushkontak, dan autoreply TIDAK dikirim ke siapa pun,
  //                    hanya ditampilkan di terminal. Bot tetap membalas
  //                    perintah Anda seperti biasa, jadi alurnya bisa dites
  //                    tanpa risiko spam atau banned.
  //                    Jeda antar pengiriman juga dipercepat jadi 1 detik.
  //
  //    Ganti ke 'production' kalau sudah siap dipakai sungguhan.
  mode: 'production',

  // 8) LOGIN OTOMATIS (untuk panel Pterodactyl / VPS)
  //    Sebagian panel tidak bisa menerima ketikan di konsol, jadi bot
  //    tidak bisa bertanya "qr atau pairing". Isi di sini supaya langsung
  //    jalan tanpa ditanya.
  //
  //    metode : '' (kosong) = ditanya lewat terminal seperti biasa
  //             'qr'        = langsung tampilkan QR code
  //             'pairing'   = langsung tampilkan kode 8 digit
  //    nomor  : wajib diisi kalau metode 'pairing'
  login: {
    metode: '',
    nomor: '',
  },
};

/*
──────────────────────────────────────────────────────────────
 JANGAN DIUBAH — bagian di bawah ini bukan pengaturan.

 Kalau ada file "local.config.js" di folder yang sama, isinya
 akan menimpa pengaturan di atas. File itu tidak ikut ke Git,
 jadi aman dipakai untuk pengaturan pribadi di komputer sendiri.
──────────────────────────────────────────────────────────────
*/
import fs from 'fs';

const fileLokal = new URL('./local.config.js', import.meta.url);

if (fs.existsSync(fileLokal)) {
  const lokal = (await import(fileLokal.href)).default ?? {};
  const autojpmBawaan = { ...config.autojpm };

  Object.assign(config, lokal);
  config.autojpm = { ...autojpmBawaan, ...(lokal.autojpm ?? {}) };

  console.log('Pengaturan pribadi dari local.config.js dipakai.');
}

export default config;
