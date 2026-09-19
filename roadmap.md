# Roadmap

## Aplikasi inti (selesai sebelumnya)
- [x] Landing page + halaman form dinamis
- [x] Integrasi Google Sheets (service account, server-side)
- [x] Validasi, sanitasi, rate limit, auto-reset kiosk
- [x] .env.example + README setup

## Batch 2 (permintaan baru)
- [ ] UI/UX: poles landing & form, loading/success/error states jelas, logo placeholder (public/logo.svg)
- [ ] Panel admin /admin: login via env (ADMIN_USERNAME/ADMIN_PASSWORD), session cookie HMAC, dashboard statistik, tabel data, filter tanggal & field, export CSV, logout
- [ ] Konfigurasi field via sheet "Konfigurasi Formulir" (kolom, label, tipe, wajib, opsi, placeholder) — fallback otomatis ke inferensi header (backward-compatible)
- [ ] Tipe input baru: select, radio, checkbox, date, datetime, number, phone, email, textarea
- [ ] Minta secret: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET + kredensial Google (GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)
