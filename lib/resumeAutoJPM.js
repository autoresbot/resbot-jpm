import fs from "fs";
import path from "path";
import clc from "cli-color";
import { saveAutoJPMStatus, readAutoJPMStatus } from "./autojpmStatus.js";
import { readWhitelist } from "./utils.js";


async function getAllGroups(sock) {
  try {
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups).map((group) => ({
      id: group.id,
      name: group.subject,
      participants: group.participants,
    }));
  } catch (error) {
    console.error(clc.red("❌ Gagal mengambil grup:"), error);
    return [];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resumeAutoJPM(sock) {


  const status = readAutoJPMStatus();

  if (!status.running || !status.text) {
    //console.log("✅ AutoJPM tidak aktif saat server dimulai.");
    return;
  }

  const tmpDir = path.join(process.cwd(), "tmp");
  const tmpImagePath = path.join(tmpDir, "autojpm_resume.jpeg");

  // Pastikan folder ./tmp ada
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  let imageBuffer = null;
  if (status.imageBase64) {
    try {
      const base64Data = status.imageBase64.split(",").pop();

      // Konversi base64 ke buffer
      imageBuffer = Buffer.from(base64Data, "base64");

      // Simpan buffer ke file
      if (tmpImagePath) {
        fs.writeFileSync(tmpImagePath, imageBuffer);
      }
    } catch (err) {
      console.error("❌ Gagal decode gambar dari base64:", err.message);
    }
  }

  console.log("🔁 AUTOJPM DIJALANKAN ULANG SETELAH RESTART");

  global.autojpmRunning = true;

  saveAutoJPMStatus(true, status.text, status.imageBase64);

  let putaran = 1;
  while (global.autojpmRunning) {
    const allGroups = await getAllGroups(sock);
    if (!allGroups.length) {
      console.log("❌ Tidak ada grup ditemukan.");
      break;
    }

    const whitelist = readWhitelist();
    const targetGroups = whitelist
      ? allGroups.filter((group) => !whitelist.includes(group.id))
      : allGroups;

    if (targetGroups.length === 0) {
      console.log(
        "⚠️ Semua grup ada di whitelist. Tidak ada target untuk dikirim pesan."
      );

      break;
    }

    let groupCount = 1;
    for (const group of targetGroups) {
      if (!global.autojpmRunning) break;

      const participants = Array.isArray(group?.participants)
        ? group.participants
        : [];
      const mentions = global.autojpmtag ? participants.map((p) => p.id) : [];

      console.log(
        clc.green(
          `AUTOJPM [${groupCount}/${targetGroups.length}] Kirim ke grup: ${group.name}`
        )
      );

      try {
        await Promise.race([
          sock.sendMessage(
            group.id,
            imageBuffer
              ? {
                  image: fs.readFileSync(tmpImagePath),
                  caption: status.text,
                  mentions,
                }
              : { text: status.text, mentions }
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout saat kirim pesan")),
              10000
            )
          ),
        ]);
      } catch (error) {
        console.error(clc.red(`❌ Gagal mengirim ke ${group.name}:`), error);
      }

      await sleep(global.jeda || 5000);
      groupCount++;
    }

    if (!global.autojpmRunning) break;

    console.log(
      clc.yellow(`🔁 Selesai ${putaran} putaran. Menunggu sebelum ulang...\n`)
    );
    putaran++;
    await sleep(global.jedaPutaran || 20000); // 20 detik jeda antar putaran
  }
}

export default resumeAutoJPM;

