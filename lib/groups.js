import { log } from './logger.js';
import { readWhitelist } from './whitelist.js';

/**
 * Ambil semua grup yang diikuti bot.
 * Bentuk hasil: { id, name, size, announce, participants: [{ jid }] }
 */
export async function getAllGroups(client) {
  try {
    const groups = await client.group.queryAllGroups();
    return groups.map((group) => ({
      id: group.jid,
      name: group.subject,
      size: group.size ?? group.participants?.length ?? 0,
      announce: Boolean(group.announce),
      participants: group.participants ?? [],
    }));
  } catch (error) {
    log(`Gagal mengambil daftar grup: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Semua grup dengan urutan yang TETAP (anggota terbanyak dulu).
 * Dipakai bersama oleh listgc dan addwhitelist supaya nomor urutnya sama.
 */
export async function getSortedGroups(client) {
  const groups = await getAllGroups(client);
  return groups.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));
}

/** Semua grup, dikurangi grup yang ada di whitelist.json */
export async function getTargetGroups(client) {
  const whitelist = readWhitelist();
  const groups = await getAllGroups(client);
  return groups.filter((group) => !whitelist.includes(group.id));
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
