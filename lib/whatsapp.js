import fs from 'fs';
import path from 'path';
import readline from 'readline';
import clc from 'cli-color';
import qrcode from 'qrcode-terminal';
import { WaClient, createStore, createNoopLogger, createPinoLogger } from 'zapo-js';
import { createSqliteStore } from '@zapo-js/store-sqlite';
import { createMediaProcessor } from '@zapo-js/media-utils';

import config from '../config.js';
import { log } from './logger.js';
import { handleMessage, initHandler } from './handler.js';
import { koneksi } from './state.js';

// Node 20 belum punya WebSocket bawaan -> pakai paket "ws" sebagai gantinya.
if (typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws');
  globalThis.WebSocket = WebSocket;
}

const SESSION_PATH = path.join(process.cwd(), config.fileSesi);

// Penyebab putus koneksi yang TIDAK boleh disambung ulang otomatis
const PUTUS_PERMANEN = new Set([
  'stream_error_replaced',
  'stream_error_device_removed',
  'stream_error_force_logout',
  'failure_not_authorized',
  'failure_banned',
  'failure_locked',
  'failure_bad_user_agent',
  'primary_identity_key_change',
]);

const MAKS_PERCOBAAN = 10;

/** Tanya cara login saat sesi masih kosong (satu sesi readline untuk semua pertanyaan) */
async function tanyaMetodeLogin() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Pertanyaan dicetak sebagai baris utuh (diakhiri baris baru), bukan lewat
  // prompt readline. Konsol panel seperti Pterodactyl menampilkan output per
  // baris, jadi teks tanpa baris baru tidak akan pernah terlihat di sana.
  const tanya = (pertanyaan) =>
    new Promise((resolve) => {
      console.log(clc.yellow.bold(pertanyaan));
      rl.question('', (j) => resolve(j.trim()));
    });

  try {
    while (true) {
      const metode = (await tanya('Ketik metode koneksi lalu tekan Enter -> qr / pairing')).toLowerCase();

      if (metode === 'qr') return { metode };

      if (metode === 'pairing') {
        const nomor = (await tanya('Ketik nomor WhatsApp lalu tekan Enter (contoh 628xxx)')).replace(/\D/g, '');
        if (nomor) return { metode, nomor };
        log('Nomor tidak boleh kosong.', 'red');
        continue;
      }

      log('Metode tidak valid. Ketik "qr" atau "pairing".', 'red');
    }
  } finally {
    rl.close();
  }
}

/**
 * Login otomatis dari config.js, untuk panel / VPS yang konsolnya
 * tidak bisa menerima ketikan. Mengembalikan null kalau tidak diatur.
 */
function loginDariConfig() {
  const metode = String(config.login?.metode ?? '').toLowerCase().trim();
  if (!metode) return null;

  if (metode === 'qr') {
    log('Metode login diambil dari config.js: qr', 'yellow');
    return { metode };
  }

  if (metode === 'pairing') {
    const nomor = String(config.login?.nomor ?? '').replace(/\D/g, '');
    if (!nomor) {
      log('config.js: login.metode "pairing" tapi login.nomor masih kosong.', 'red');
      return null;
    }
    log(`Metode login diambil dari config.js: pairing (${nomor})`, 'yellow');
    return { metode, nomor };
  }

  log(`config.js: login.metode "${metode}" tidak dikenal, harus "qr" atau "pairing".`, 'red');
  return null;
}

/** Buat penyimpanan sesi (SQLite) */
function buatStore() {
  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });

  return createStore({
    backends: { sqlite: createSqliteStore({ path: SESSION_PATH, driver: 'auto' }) },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'sqlite',
      threads: 'sqlite',
      contacts: 'sqlite',
    },
  });
}

/** Minta kode pairing 8 digit lalu tampilkan di terminal */
async function tampilkanKodePairing(client, nomor) {
  try {
    const code = await client.auth.requestPairingCode(nomor);
    const rapi = code.match(/.{1,4}/g)?.join('-') ?? code;
    console.log(`${clc.green.bold('Code Pairing :')} ${rapi}`);
    console.log(
      clc.yellow('Buka WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon, lalu masukkan kode di atas.'),
    );
  } catch (error) {
    log(`Gagal meminta code pairing: ${error.message}`, 'red');
    log('Coba jalankan ulang dan pilih metode "qr".', 'yellow');
  }
}

/** Pasang semua event: login, pesan masuk, koneksi putus */
function pasangEvent(client, login, onReady) {
  const modePairing = login?.metode === 'pairing' && Boolean(login.nomor);
  let kodeSudahDiminta = false;

  // Kode pairing baru boleh diminta setelah server siap.
  // Tanda kesiapan itu adalah QR pertama yang dikirim server
  // (event auth_pairing_required hanya muncul saat kode PERLU diperbarui).
  client.on('auth_qr', ({ qr }) => {
    if (modePairing) {
      if (!kodeSudahDiminta) {
        kodeSudahDiminta = true;
        void tampilkanKodePairing(client, login.nomor);
      }
      return; // metode pairing: QR tidak ditampilkan
    }

    // login === null artinya sesi lama dipakai; kalau ternyata ditolak, QR tetap ditampilkan
    if (login && login.metode !== 'qr') return;
    qrcode.generate(qr, { small: true });
    console.log(clc.red.bold('Silakan scan QR code di atas.'));
  });

  client.on('auth_pairing_required', ({ forceManual }) => {
    if (!modePairing) return;
    if (kodeSudahDiminta && !forceManual) return; // kode lama masih berlaku

    kodeSudahDiminta = true;
    log('Kode pairing kedaluwarsa, meminta kode baru ...', 'yellow');
    void tampilkanKodePairing(client, login.nomor);
  });

  client.on('auth_paired', ({ credentials }) => {
    log(`Berhasil terhubung sebagai ${credentials.meJid}`);
  });

  client.on('message', (event) => handleMessage(client, event));

  client.on('connection', (event) => {
    if (event.status === 'open') {
      koneksi.siap = true;
      log('Connection Success');
      onReady?.(client);
      return;
    }
    if (event.status === 'close') {
      koneksi.siap = false;
      log(`Connection Closed (${event.reason})`, 'red');
    }
  });
}

/** Sambung ulang otomatis dengan jeda yang makin lama */
function pasangReconnect(client) {
  let percobaan = 0;
  let sedangMenyambung = false;

  client.on('connection', async (event) => {
    if (event.status === 'open') {
      percobaan = 0;
      return;
    }
    if (event.status !== 'close') return;

    if (event.reason === 'client_disconnected') return; // kita sendiri yang menutup
    if (event.isLogout || PUTUS_PERMANEN.has(event.reason)) {
      koneksi.mati = true;
      console.log('');
      log('SESI SUDAH TIDAK BISA DIPAKAI - perangkat dikeluarkan oleh WhatsApp.', 'red');
      log('Sesi dihapus otomatis. Jalankan "npm start" lagi, lalu login kembali.', 'yellow');
      log('Semua pengiriman yang sedang berjalan dihentikan.', 'yellow');
      return;
    }
    if (sedangMenyambung) return;

    sedangMenyambung = true;
    while (percobaan < MAKS_PERCOBAAN) {
      const jeda = Math.min(30000, 1000 * 2 ** percobaan);
      percobaan += 1;
      log(`Menyambung ulang dalam ${jeda / 1000} detik (percobaan ${percobaan})`, 'yellow');
      await new Promise((r) => setTimeout(r, jeda));

      try {
        await client.connect();
        break;
      } catch (error) {
        log(`Gagal menyambung ulang: ${error.message}`, 'red');
      }
    }
    sedangMenyambung = false;

    if (percobaan >= MAKS_PERCOBAAN) log('Menyerah menyambung ulang.', 'red');
  });
}

/**
 * Nyalakan bot: siapkan sesi, tanya cara login kalau perlu, lalu connect.
 * @param {Function} onReady dipanggil setiap koneksi berhasil terbuka
 */
export async function startBot(onReady) {
  await initHandler();

  const store = buatStore();

  // Sesi dianggap siap pakai hanya kalau sudah punya meJid
  // (baris kredensial bisa ada tapi belum selesai login).
  const kredensial = await store
    .session('default')
    .auth.load()
    .catch(() => null);
  const sudahLogin = Boolean(kredensial?.meJid);

  let login = null;
  if (sudahLogin) {
    log(`Sesi ditemukan: ${kredensial.meJid.split(/[:@]/)[0]} - tidak perlu login ulang.`);
  } else {
    log(kredensial ? 'Login sebelumnya belum selesai.' : 'Belum ada sesi tersimpan.', 'yellow');
    login = loginDariConfig() ?? (await tanyaMetodeLogin());
  }

  const logger = process.env.DEBUG ? await createPinoLogger({ level: 'info', pretty: true }) : createNoopLogger();

  const client = new WaClient(
    {
      store,
      sessionId: 'default',
      connectTimeoutMs: 15000,
      media: { processor: createMediaProcessor(), generateThumbnail: true },
    },
    logger,
  );

  pasangEvent(client, login, onReady);
  pasangReconnect(client);

  log('Connecting ...');
  await client.connect();

  process.on('SIGINT', async () => {
    log('Menutup koneksi ...', 'yellow');
    await client.disconnect().catch(() => {});
    process.exit(0);
  });

  return client;
}
