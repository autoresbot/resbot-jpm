import { getGroupParticipants } from '../lib/groups.js';
import { sendMessage, jedaKirim } from '../lib/broadcast.js';
import { log } from '../lib/logger.js';
import { siapKirim } from '../lib/state.js';
import { catatanMode } from '../lib/mode.js';

const PANDUAN = `*PUSH KONTAK*

Cara Penggunaan:
pushkontak <ID_Grup> <pesan>

Contoh:
pushkontak 123456789@g.us Informasi penting...

ID grup bisa dilihat dengan perintah *listgc*`;

export default async function pushkontak({ client, args, reply }) {
  const [idGrup, ...sisa] = args;
  const text = sisa.join(' ').trim();

  if (!idGrup?.includes('@g.us') || !text) return reply(PANDUAN);

  await reply('Permintaan diproses, sedang mengambil daftar kontak...');

  const anggota = await getGroupParticipants(client, idGrup);
  if (!anggota.length) {
    return reply('Gagal: tidak dapat membaca anggota grup. Pastikan bot masih berada di grup itu.');
  }

  let terkirim = 0;
  let nomor = 1;

  for (const peserta of anggota) {
    if (!siapKirim()) {
      log('Koneksi terputus - push kontak dihentikan.', 'red');
      break;
    }

    // Pakai nomor telepon kalau tersedia, baru jatuh ke JID grup (@lid)
    const tujuan = peserta.phoneNumber ?? peserta.jid;
    log(`PUSHKONTAK [${nomor}/${anggota.length}] Mengirim ke: ${tujuan}`);

    try {
      await sendMessage(client, tujuan, { type: 'text', text });
      terkirim += 1;
    } catch (error) {
      log(`Gagal mengirim ke ${tujuan}: ${error.message}`, 'red');
    }

    await jedaKirim();
    nomor += 1;
  }

  await reply(`Proses push kontak selesai.\nBerhasil: ${terkirim} dari ${anggota.length} nomor.${catatanMode()}`);
}
