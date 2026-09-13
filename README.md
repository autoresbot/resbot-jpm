# ResBot JPM

Bot WhatsApp gratis untuk **JPM / broadcast ke banyak grup** dan **push kontak**.
Dibuat dengan JavaScript di atas library [zapo-js](https://zapo.to).

## Instalasi

Butuh **Node.js 20.9+** (disarankan 22).

```bash
git clone https://github.com/autoresbot/resbot-jpm.git
cd resbot-jpm
npm install
npm start
```

Saat pertama dijalankan, bot menanyakan cara login:

- `qr` — scan QR code yang muncul di terminal, atau
- `pairing` — masukkan nomor WhatsApp, lalu ketik kode 8 digit di
  **WhatsApp → Perangkat tertaut → Tautkan dengan nomor telepon**.

Login cukup sekali. Sesi tersimpan di `sessions/whatsapp.sqlite`.

## Pengaturan

Semua ada di **`config.js`** — hanya file ini yang perlu Anda ubah:

| Pengaturan | Keterangan |
| --- | --- |
| `nomorOwner` | **Wajib diisi.** Nomor yang boleh menyuruh bot, mis. `['6281234567890']` — kode negara, tanpa `+` dan spasi |
| `prefix` | Awalan perintah, mis. `['.', '#']` |
| `jedaKirim` | Jeda **detik** antar pengiriman. Makin besar makin aman dari banned |
| `autojpm.tagSemua` | `true` = tag semua anggota grup saat autojpm |
| `autojpm.jedaPutaran` | Jeda **detik** sebelum autojpm mengulang |
| `mode` | `'production'` = kirim sungguhan, `'development'` = uji coba |

Grup yang tidak ingin dikirimi pesan diatur lewat perintah `whitelist` /
`addwhitelist` / `delwhitelist` (tersimpan di `data/whitelist.json`).

Untuk pengaturan pribadi yang tidak ikut ke Git, buat file **`local.config.js`**
berisi pengaturan yang ingin diganti saja — isinya otomatis menimpa `config.js`.

## Perintah

| Perintah | Kegunaan |
| --- | --- |
| `menu` | Daftar perintah |
| `ping` | Cek bot aktif |
| `listgc` | Daftar grup beserta ID-nya |
| `jpm <pesan>` | Kirim ke semua grup (boleh sambil kirim gambar) |
| `jpmtag <pesan>` | Sama seperti jpm, semua anggota ikut ditag |
| `autojpm <pesan>` | Kirim ke semua grup berulang terus |
| `autojpm stop` | Hentikan autojpm |
| `autoreply <pesan>` | Balas otomatis ke grup yang sedang ada chatnya |
| `autoreply stop` | Hentikan autoreply |
| `pushkontak <ID_Grup> <pesan>` | Kirim japri ke semua anggota sebuah grup |
| `whitelist` | Daftar grup yang dilewati jpm, jpmtag, autojpm & autoreply |
| `addwhitelist 1,2,3` | Tambah ke whitelist — nomor dari `listgc`, atau ID `xxx@g.us` |
| `delwhitelist 1,2` | Hapus dari whitelist — nomor dari `whitelist`, ID, atau `all` |
| `resetdata` | Kosongkan semua data bot (perlu konfirmasi `resetdata ya`) |

Perintah boleh diawali `.` / `#` (contoh `.menu`) atau tanpa awalan.

## Mode Uji Coba

Set `mode: 'development'` di `config.js` untuk mencoba alurnya tanpa risiko:
semua pengiriman massal **tidak dikirim**, hanya muncul di terminal sebagai
`[DEV] TIDAK DIKIRIM`. Bot tetap membalas perintah Anda seperti biasa.

## Struktur Folder

```
config.js         pengaturan bot (ini saja yang perlu diubah)
local.config.js   pengaturan pribadi, tidak ikut Git (opsional)
index.js          titik awal program
lib/              mesin bot: koneksi, handler, broadcast
plugins/          satu file = satu perintah
data/             whitelist, link grup, status autojpm
sessions/         sesi login WhatsApp
tmp/              file sementara
```

## Menambah Perintah

Satu file di `plugins/` = satu perintah. Contoh `plugins/halo.js`:

```js
export default async function halo({ reply, body }) {
  await reply(`Halo! Kamu mengirim: ${body}`);
}
```

Restart bot, lalu ketik `halo apa kabar`.

## Hosting 24 Jam (Panel Pterodactyl)

Script ini bisa dijalankan di **panel Pterodactyl**, jadi bot tetap online 24 jam
tanpa perlu menyalakan komputer sendiri. Sewa panelnya di:

- 🌐 [autoresbot.com](https://autoresbot.com/)
- 🌐 [panelbot.id](https://panelbot.id/)

## Info & Update

📢 Saluran WhatsApp: [Ikuti di sini](https://www.whatsapp.com/channel/0029VaDSRuf05MUekJbazP1D)

---

⚠️ Script ini **TIDAK BOLEH DIPERJUALBELIKAN** dalam bentuk apa pun.
© [autoresbot.com](https://autoresbot.com)
