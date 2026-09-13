import config from '../config.js';
import { log } from './logger.js';
import { siapKirim } from './state.js';
import { modeUjiCoba, JEDA_DEV_MS } from './mode.js';

const TIMEOUT_KIRIM = 10000; // 10 detik per pesan

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jeda antar pengiriman, dari config.jedaKirim (detik) */
export function jedaKirim() {
  if (modeUjiCoba()) return sleep(JEDA_DEV_MS);
  return sleep((config.jedaKirim ?? 5) * 1000);
}

/** Ringkasan isi pesan untuk ditampilkan di terminal */
function ringkasIsi(content) {
  if (typeof content === 'string') return content;
  if (content.type === 'image') return `[gambar] ${content.caption ?? ''}`;
  if (content.type === 'reaction') return `[reaksi ${content.emoji}]`;
  return content.text ?? content.type ?? '[pesan]';
}

/** Susun isi pesan: teks saja, atau gambar + caption */
export function buildContent(text, imagePath) {
  if (!imagePath) return { type: 'text', text };
  return { type: 'image', media: imagePath, mimetype: 'image/jpeg', caption: text };
}

/** Kirim satu pesan dengan batas waktu supaya tidak menggantung */
export async function sendMessage(client, to, content, options) {
  if (!siapKirim()) throw new Error('Koneksi WhatsApp sedang terputus');

  // Mode uji coba: tampilkan saja di terminal, jangan kirim ke siapa pun
  if (modeUjiCoba()) {
    const tag = options?.mentions?.length ? ` (tag ${options.mentions.length} orang)` : '';
    const isi = ringkasIsi(content).split('\n')[0].slice(0, 60);
    log(`[DEV] TIDAK DIKIRIM -> ${to} : ${isi}${tag}`, 'yellow');
    return { id: 'mode-development', simulasi: true };
  }

  let timer;
  const batasWaktu = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout saat mengirim pesan')), TIMEOUT_KIRIM);
  });

  try {
    return await Promise.race([client.message.send(to, content, options), batasWaktu]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kirim satu pesan ke banyak grup, satu per satu dengan jeda.
 *
 * @param {object} client        client WhatsApp
 * @param {Array}  groups        hasil getTargetGroups()
 * @param {object} opsi
 * @param {string} opsi.text     isi pesan
 * @param {string} [opsi.imagePath] path gambar (opsional)
 * @param {boolean}[opsi.tagAll] tag semua anggota grup
 * @param {string} [opsi.label]  label untuk log, mis. 'AUTOJPM'
 * @param {Function}[opsi.isCancelled] dipanggil tiap grup; true = berhenti
 * @returns {Promise<number>} jumlah grup yang berhasil dikirimi
 */
export async function broadcastToGroups(client, groups, opsi = {}) {
  const { text, imagePath = null, tagAll = false, label = 'JPM', isCancelled } = opsi;
  const content = buildContent(text, imagePath);
  let terkirim = 0;
  let nomor = 1;

  for (const group of groups) {
    if (isCancelled?.()) break;
    if (!siapKirim()) {
      log('Koneksi terputus - pengiriman dihentikan.', 'red');
      break;
    }

    const mentions = tagAll ? group.participants.map((p) => p.jid) : [];
    log(`${label} [${nomor}/${groups.length}] Kirim ke grup: ${group.name}`);

    try {
      await sendMessage(client, group.id, content, mentions.length ? { mentions } : undefined);
      terkirim += 1;
    } catch (error) {
      log(`Gagal mengirim ke ${group.name}: ${error.message}`, 'red');
    }

    await jedaKirim();
    nomor += 1;
  }

  return terkirim;
}
