# Roadmap

## Aplikasi inti (selesai sebelumnya)
- [x] Landing page + halaman form dinamis
- [x] Integrasi Google Sheets (service account, server-side)
- [x] Validasi, sanitasi, rate limit, auto-reset kiosk
- [x] .env.example + README setup

## Batch 2 (permintaan baru)
- [x] UI/UX: landing, form, loading/success/error states, validasi, responsive layout, logo placeholder (public/logo.svg)
- [x] Panel admin /admin: login via env, session cookie HMAC, dashboard statistik, tabel data, filter tanggal & field, export CSV, logout
- [x] Konfigurasi field via sheet "Konfigurasi Formulir" dengan fallback inferensi header (backward-compatible)
- [x] Tipe input: select, radio, checkbox, date, datetime, number, phone, email, textarea, NIK
- [ ] Deployment: isi ADMIN_SESSION_SECRET, ganti password default, dan rotasi private key Google Service Account yang terekspos
