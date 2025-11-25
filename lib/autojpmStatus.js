import fs from 'fs';
import path from 'path';

const statusPath = path.join(process.cwd(), 'ADDTIONAL', 'autojpm_status.json');

export function ensureDirExists() {
    const dir = path.dirname(statusPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Deteksi apakah string adalah base64 image (dengan atau tanpa prefix data:image/)
 */
function isBase64Image(str) {
    return typeof str === 'string' && (
        /^data:image\/[a-zA-Z]+;base64,/.test(str) || /^[A-Za-z0-9+/=]+\s*$/.test(str)
    );
}

/**
 * Ambil base64 dari path atau langsung dari input jika sudah base64
 */
function resolveToBase64(imagePath) {
    if (!imagePath) return '';

    // Jika input adalah base64 string
    if (isBase64Image(imagePath)) {
        if (imagePath.startsWith('data:image/')) {
            return imagePath; // Sudah lengkap
        } else {
            // Tambahkan prefix default jika tidak ada
            return `data:image/png;base64,${imagePath}`;
        }
    }

    // Jika input adalah path file
    const resolvedPath = path.resolve(imagePath);
    if (fs.existsSync(resolvedPath)) {
        const buffer = fs.readFileSync(resolvedPath);
        const ext = path.extname(resolvedPath).substring(1).toLowerCase() || 'png';
        return `data:image/${ext};base64,${buffer.toString('base64')}`;
    } else {
        console.warn(`❌ Image file not found at: ${resolvedPath}`);
        return '';
    }
}


function saveAutoJPMStatus(isRunning, text = '', imagePath = '') {
    ensureDirExists();

    let imageBase64 = resolveToBase64(imagePath);

    fs.writeFileSync(statusPath, JSON.stringify({
        running: isRunning,
        text,
        imageBase64
    }, null, 2));
}

function readAutoJPMStatus() {
    try {
        const data = fs.readFileSync(statusPath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return { running: false, text: '', imageBase64: '' };
    }
}

export { saveAutoJPMStatus, readAutoJPMStatus };

