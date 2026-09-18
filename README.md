# Buku Tamu Digital — Balai Labkesmas Magelang

Aplikasi buku tamu yang membangun formulir secara dinamis dari baris header Google Sheets,
lalu menyimpan setiap kunjungan sebagai baris baru dengan urutan kolom yang identik.

Alur: `Header Google Sheets → Form dinamis → Validasi → Submit (server) → Append row → Halaman terima kasih → Reset`

## 1. Siapkan Google Sheet

1. Buat spreadsheet baru, isi baris pertama dengan header kolom, contoh:
   `Nama | NIK | Instansi | No HP | Keperluan | Bertemu Dengan | Tanggal | Jam`
2. Salin `GOOGLE_SHEETS_ID` dari URL: `https://docs.google.com/spreadsheets/d/<ID>/edit`
3. Catat nama tab-nya (mis. `Sheet1`) untuk `GOOGLE_SHEET_NAME`.

Kolom bernama **Tanggal**, **Jam**, atau **Timestamp** diisi otomatis oleh server
sesuai zona waktu `APP_TIMEZONE`. Header lain otomatis menjadi input dengan tipe yang
sesuai (email, telepon, NIK/angka, textarea untuk keperluan/alamat, dst.).
Menambah, mengubah, atau menghapus header akan langsung mengubah formulir.

## 2. Buat Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat/pilih project.
2. **APIs & Services → Library** → aktifkan **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
4. Pada service account tersebut: **Keys → Add key → Create new key → JSON**.
5. Dari file JSON, ambil `client_email` dan `private_key`.
6. Buka Google Sheet → **Share** → bagikan ke `client_email` dengan akses **Editor**.

## 3. Konfigurasi

Semua konfigurasi berada di environment variables (lihat `.env.example`):

| Variabel | Keterangan |
| --- | --- |
| `APP_NAME` | Nama aplikasi/instansi |
| `APP_URL` | URL publik aplikasi |
| `APP_TIMEZONE` | Zona waktu pengisian otomatis (default `Asia/Jakarta`) |
| `GOOGLE_SHEETS_ID` | ID spreadsheet |
| `GOOGLE_SHEET_NAME` | Nama tab sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` service account |
| `GOOGLE_PRIVATE_KEY` | `private_key` service account (boleh memakai `\n`) |

Pada deployment Lovable, nilai-nilai ini disimpan sebagai secret server dan hanya
dibaca di dalam server function — tidak pernah dikirim ke browser.

## 4. Keamanan

- Seluruh akses Google Sheets berjalan di server (`src/lib/*.server.ts`).
- Input divalidasi dan disanitasi (kontrol karakter dibuang, pencegahan formula injection).
- Rate limit 8 pengiriman / 10 menit per alamat IP.
- Pesan error ke pengguna bersifat umum; detail teknis hanya ke log server.

## 5. Mode kiosk

Halaman formulir mereset diri otomatis setelah 3 menit tanpa aktivitas, dan halaman
terima kasih kembali ke awal setelah beberapa detik — aman diletakkan di meja resepsionis.

## Pengembangan

```bash
bun install
bun run dev
```
