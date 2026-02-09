# Jawaban untuk pembaruan CLI di prompt.md

- **CLI yang dimaksud:** fokus pada perintah yang digunakan di langkah `prompt.md`: (a) Node.js/npm untuk build & publish package, (b) perintah n8n atau mekanisme install node di n8n, (c) Docker untuk menjalankan n8n lokal, dan (d) bila dipakai, perintah 7z CLI terkait ekstraksi/kompresi.
- **Jenis update yang dilacak:** opsi/flag baru, perubahan sintaks atau perilaku karena versi, penambahan perintah baru yang dibutuhkan alur (build, publish, install di n8n, docker run), serta versi tool yang perlu dicatat (mis. n8n 1.118.x vs stable).
- **Struktur saat update prompt:** tambahkan satu seksi “CLI Commands/Reference” di bawah daftar langkah berisi perintah + versi/tool; jika ada perubahan signifikan pada langkah bernomor, perbarui item terkait dan beri contoh perintah singkat di sub-bullet.
- **Sumber update:** dokumentasi resmi (n8n, Node/npm, Docker, 7z) sebagai acuan utama, lalu pengalaman pengembangan lokal atau catatan komunitas jika ada workaround atau kekhususan versi (mis. instalasi di n8n Docker).
