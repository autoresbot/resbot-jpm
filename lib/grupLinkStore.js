import fs from 'fs';
import path from 'path';
const dataPath = path.join(process.cwd(), 'DATABASE', 'data_grub.json');

let groupLinksSet = new Set();
let saveTimeout = null;

// Muat link dari file
function loadGroupLinks() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, 'utf8');
            const json = JSON.parse(raw);
            if (Array.isArray(json)) {
                groupLinksSet = new Set(json);
            }
        } catch (err) {
            console.error('❌ Gagal membaca data_grub.json:', err.message);
        }
    }
}

// Simpan ke file dengan delay
function scheduleSave() {
    if (saveTimeout) return;
    saveTimeout = setTimeout(() => {
        const data = Array.from(groupLinksSet);
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log(`💾 ${data.length} link grup tersimpan ke data_grub.json`);
        saveTimeout = null;
    }, 30 * 1000);
}

// Tambah link grup baru (hindari duplikat)
function addGroupLinks(newLinks) {
    let added = false;
    for (const link of newLinks) {
        if (!groupLinksSet.has(link)) {
            groupLinksSet.add(link);
            added = true;
        }
    }
    if (added) scheduleSave();
}

// Ambil semua link dari teks
function extractGroupLinks(text) {
    const regex = /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/g;
    return text.match(regex) || [];
}

// Init saat pertama kali file diimport
loadGroupLinks();

export { extractGroupLinks, addGroupLinks };
