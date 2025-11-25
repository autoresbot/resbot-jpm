async function listgc(sock, sender, message) {
    try {
        const groups = await sock.groupFetchAllParticipating();

        const groupList = Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject,
            size: group.size,
            announce: group.announce
        }));

        const totalGrub = groupList.length;
        const grubTerbuka = groupList.filter(g => !g.announce).length;
        const grubTertutup = groupList.filter(g => g.announce).length;

        groupList.sort((a, b) => b.size - a.size);

        let msg = `
╭───❰  *GROUP LIST*  ❱
│ Total     : *${totalGrub}* Grup
│ Terbuka   : *${grubTerbuka}* Grup
│ Tertutup  : *${grubTertutup}* Grup
╰───────────❱

*Detail Grup:*
`;

        groupList.forEach((group, index) => {
            const status = group.announce ? "🔒 TERTUTUP" : "🟢 TERBUKA";
            msg += `
◆ *${index + 1}. ${group.name}*
┇ ID     : ${group.id}
┇ Anggota: ${group.size}
┇ Status : ${status}
`;
        });

        await sock.sendMessage(sender, { text: msg });

    } catch (error) {
        console.error('Gagal mendapatkan daftar grup:', error);
        await sock.sendMessage(sender, { text: '❌ Gagal mengambil daftar grup, coba lagi nanti.' });
    }
}

export default listgc;
