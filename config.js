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

const numberAllowed = ['6285246154386']; // Nomor yang diizinkan untuk chat ke bot, tambahkan kalau diperlukan

global.prefix = ['.', '#']; // Daftar prefix

global.jeda = 15000; // 15 detik jeda pengiriman untuk pushkontak atau broadcast

global.name_script = 'Script Resbot Jpm';

global.version = '2.1';

global.autojpm = {
  hidetag: false, // jadikan true kalau mau hidetag, atau false kalau tidak
  jedaPutaran: 10000, // 10000 = 10 detik
};

export { numberAllowed };
