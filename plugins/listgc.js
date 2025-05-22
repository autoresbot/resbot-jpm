async function listgc(sock, sender, message) {
    try {
        // Ambil daftar grup yang sedang diikuti
        const groups = await sock.groupFetchAllParticipating();

        // Format data grup
        const groupList = Object.values(groups).map(group => ({
            id: group.id,
            name: group.subject,
            size: group.size,
            announce: group.announce
        }));

       // Hitung total grup
        const totalGrub = groupList.length;

        // Hitung jumlah grup terbuka dan tertutup
        const grubTerbuka = groupList.filter(group => !group.announce).length;
        const grubTertutup = groupList.filter(group => group.announce).length;

        // Urutkan grup berdasarkan size dari terbesar ke terkecil
        groupList.sort((a, b) => b.size - a.size);

        // Buat pesan
        let message = `*LIST GRUB*\nTotal: ${totalGrub} grup\nTerbuka: ${grubTerbuka} grup\nTertutup: ${grubTertutup} grup\n\n`;

        groupList.forEach((group, index) => {
            const status = group.announce ? 'Tertutup' : 'Terbuka';
            message += `[${index + 1}]. *Nama:* ${group.name}\n*ID:* ${group.id}\n*Size:* ${group.size}\n*Status:* ${status}\n\n`;
        });



        // Kirim pesan ke pengirim
        await sock.sendMessage(sender, { text: message });
    } catch (error) {
        console.error('Gagal mendapatkan daftar grup:', error);
        // Kirim pesan kesalahan ke pengirim
        await sock.sendMessage(sender, { text: 'Gagal mendapatkan daftar grup. Silakan coba lagi nanti.' });
    }
}

module.exports = listgc;
