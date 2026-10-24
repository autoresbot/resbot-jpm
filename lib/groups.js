import { log } from './logger.js';
import { readWhitelist } from './whitelist.js';

/** Bagian nomor/ID dari JID, mis. "628xx:5@s.whatsapp.net" -> "628xx" */
const userDari = (jid) => jid?.split(/[:@]/)[0];

/** Apakah bot sendiri admin di grup ini? */
function botAdmin(client, participants) {
  const kredensial = client.getCredentials?.();
  const milikBot = new Set([userDari(kredensial?.meJid), userDari(kredensial?.meLid)].filter(Boolean));

  return participants.some(
    (p) =>
      (p.isAdmin || p.isSuperAdmin) &&
      [p.jid, p.lid, p.phoneNumber].some((jid) => milikBot.has(userDari(jid))),
  );
}

/**
 * Ambil semua grup yang diikuti bot.
 * Bentuk hasil: { id, name, size, announce, komunitas, induk, pengumuman, botAdmin, participants }
 */
export async function getAllGroups(client) {
  try {
    const groups = await client.group.queryAllGroups();
    return groups.map((group) => {
      const participants = group.participants ?? [];
      return {
        id: group.jid,
        name: group.subject,
        size: group.size ?? participants.length,
        announce: Boolean(group.announce),
        // Induk komunitas: bukan grup chat, tidak bisa dikirimi pesan sama sekali
        induk: Boolean(group.isParentGroup),
        // Grup pengumuman komunitas: hanya admin komunitas yang boleh kirim
        pengumuman: Boolean(group.defaultSubgroup),
        // Grup yang berada di dalam sebuah komunitas
        komunitas: Boolean(group.isParentGroup || group.defaultSubgroup || group.linkedParentJid),
        botAdmin: botAdmin(client, participants),
        participants,
      };
    });
  } catch (error) {
    log(`Gagal mengambil daftar grup: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Alasan grup ini pasti ditolak WhatsApp (error=420), atau null kalau bisa dikirimi.
 * Mengirim ke grup seperti ini hanya membuang waktu dan menambah risiko banned.
 */
export function alasanDilewati(group) {
  if (group.induk) return 'induk komunitas';
  if (group.pengumuman && !group.botAdmin) return 'pengumuman komunitas, bot bukan admin';
  if (group.announce && !group.botAdmin) return 'hanya admin yang boleh kirim, bot bukan admin';
  return null;
}

/**
 * Semua grup dengan urutan yang TETAP (anggota terbanyak dulu).
 * Dipakai bersama oleh listgc dan addwhitelist supaya nomor urutnya sama.
 */
export async function getSortedGroups(client) {
  const groups = await getAllGroups(client);
  return groups.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));
}

/**
 * Grup tujuan JPM: semua grup, dikurangi whitelist.json dan grup yang pasti
 * ditolak WhatsApp. Urutan: grup WA biasa dulu, grup komunitas menyusul.
 */
export async function getTargetGroups(client) {
  const whitelist = readWhitelist();
  const groups = (await getAllGroups(client)).filter((group) => !whitelist.includes(group.id));

  const bisaDikirim = groups.filter((group) => !alasanDilewati(group));
  const dilewati = groups.length - bisaDikirim.length;
  if (dilewati) log(`${dilewati} grup dilewati (pengumuman/komunitas yang hanya admin boleh kirim)`, 'yellow');

  return bisaDikirim.sort((a, b) => a.komunitas - b.komunitas || b.size - a.size);
}

/** Daftar JID anggota sebuah grup (dipakai pushkontak) */
export async function getGroupParticipants(client, groupId) {
  try {
    const metadata = await client.group.queryGroupMetadata(groupId);
    return metadata.participants ?? [];
  } catch (error) {
    log(`Gagal mengambil anggota grup ${groupId}: ${error.message}`, 'red');
    return [];
  }
}
