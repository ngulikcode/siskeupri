# SisKePri

SisKePri adalah aplikasi dashboard keuangan pribadi berbasis web yang membantu mencatat pemasukan, pengeluaran, pemindahan dana antar akun, mengatur anggaran, transaksi berulang, serta menyajikan grafik ringkas. Aplikasi menggunakan Supabase sebagai backend (auth dan database) dan dapat dijalankan sebagai situs statis.

## Fitur Utama
- Autentikasi pengguna (Sign In/Sign Up) dengan Supabase
- Manajemen akun (tambah, ubah, hapus, set default)
- Pencatatan transaksi harian dengan filter, pencarian, dan paginasi
- Transfer antar akun dengan pembuatan transaksi otomatis (keluar/masuk)
- Anggaran per kategori per bulan, lengkap dengan progress bar dan status
- Transaksi berulang (daily/weekly/monthly/yearly) dengan auto‑generate
- Grafik Income vs Expense dan breakdown kategori
- Ekspor laporan ke `CSV` dan `PDF`
- **Advanced Analytics & Insights** - Analisis mendalam pola pengeluaran, tren kategori, prediksi, dan perbandingan periode
- **Admin Analytics Dashboard** - Dashboard khusus admin untuk melihat statistik pengguna dan pertumbuhan
- **Sistem Notifikasi** untuk budget warning, low balance, savings goal, dan recurring reminders
- **PWA Support** - Install aplikasi sebagai Progressive Web App
- **Responsive Design** yang dioptimalkan untuk mobile dan desktop

## Teknologi
- Frontend: HTML, CSS, JavaScript
- Backend: Supabase (Auth + Database)
- Charts: Chart.js

## Struktur Direktori
- `index.html` — halaman utama aplikasi
- `assets/css/style.css` — gaya tampilan, termasuk style modal dan responsif
- `assets/js/` — logika aplikasi per modul
  - `config.js` — konfigurasi Supabase client
  - `auth.js` — autentikasi pengguna dan listener state auth
  - `app.js` — pemuatan data dan UI utama (filters, pagination, ekspor)
  - `accounts.js` — manajemen akun dan tampilan Account Overview
  - `advanced-listeners.js` — event listener modal, transfer, dan fitur lanjutan
  - `budgets.js` — fitur anggaran
  - `recurring.js` — fitur transaksi berulang
  - `charts.js` — grafik tren dan kategori
  - `analytics.js` — analisis mendalam (spending patterns, trends, predictions, comparisons)
  - `admin-dashboard.js` — dashboard admin untuk statistik pengguna
  - `notifications.js` — sistem notifikasi untuk budget, balance, savings, dan recurring
  - `tour.js` — fitur tour/guide untuk pengguna baru
  - `savings.js` — fitur savings goal
- `database/*.sql` — skema tabel yang dapat di‑import ke Supabase

## Persiapan Supabase
- Buat project Supabase baru.
- Import skema yang tersedia di folder `database/` ke SQL Editor Supabase.
- Buat tabel yang dibutuhkan: `transactions`, `accounts`, `categories`, `recurring_transactions` (sesuaikan jika belum ada di skema).
- Ambil `SUPABASE_URL` dan `anon key` dari Project Settings.
- Atur konfigurasi di `assets/js/config.js`:
  - `assets/js/config.js:1` — isi `SUPABASE_URL` dan `SUPABASE_KEY` dengan nilai dari Supabase.
  - Gunakan `anon key` (jangan gunakan service role di client).

## Menjalankan Aplikasi
- Jalankan sebagai situs statis dengan salah satu cara berikut:
  - VS Code: gunakan ekstensi Live Server pada `index.html`.
  - Node.js: `npx serve .`
  - Python: `python -m http.server 8080`
- Buka aplikasi di browser, login atau daftar akun baru.

## Panduan Penggunaan
- Login/Signup
  - Masuk atau buat akun baru untuk mulai menyimpan data ke Supabase.
  - Referensi: `assets/js/auth.js`.
- Menambah Kategori
  - Buka modal Manage Categories, tambah kategori Income atau Expense.
  - Referensi: `assets/js/app.js:177` (addCategory), `assets/js/app.js:584` (open modal).
- Menambah Akun
  - Buka modal Manage Accounts, tambah akun dan opening balance.
  - Set default account jika diperlukan.
  - Referensi: `assets/js/accounts.js:84` (update), `assets/js/accounts.js:206` (module API).
- Account Overview
  - Ringkasan Opening, Income, Expense, Balance per akun.
  - Referensi: `assets/js/accounts.js:125` (renderAccountOverview).
- Mencatat Transaksi
  - Isi form transaksi (Income/Expense), gunakan filter dan pencarian.
  - Referensi: `assets/js/app.js:353` (submit), `assets/js/app.js:533` (filters).
- Transfer Dana
  - Klik tombol `Transfer Funds`, isi form untuk membuat transfer keluar/masuk otomatis.
  - Referensi: `assets/js/advanced-listeners.js:136` (modal transfer), `assets/js/advanced-listeners.js:168` (insert transaksi).
- Anggaran (Budgets)
  - Set limit per kategori per bulan, lihat progress dan status.
  - Referensi: `assets/js/budgets.js:122` (overview), `assets/js/budgets.js:146` (item).
- Transaksi Berulang
  - Tambah recurring dengan frekuensi yang diinginkan, sistem akan meng‑generate transaksi yang due.
  - Referensi: `assets/js/recurring.js:127` (generate), `assets/js/recurring.js:292` (dropdown kategori).
- Grafik
  - Lihat tren Income vs Expense dan breakdown kategori.
  - Referensi: `assets/js/charts.js:1` (konfigurasi), `assets/js/charts.js:132` (trend chart).
- Ekspor
  - Pilih `CSV` atau `PDF` pada menu ekspor.
  - Referensi: `assets/js/app.js:654` (CSV) dan `assets/js/app.js:722` (PDF).
- Advanced Analytics & Insights
  - Akses analisis mendalam tentang pola keuangan Anda.
  - Lihat prediksi pengeluaran bulan depan dan perbandingan periode.
  - Referensi: `assets/js/analytics.js` (analytics module).
- Admin Analytics Dashboard
  - Dashboard khusus untuk admin melihat statistik pengguna.
  - Lihat pertumbuhan pengguna dan aktivitas.
  - Referensi: `assets/js/admin-dashboard.js` (admin module).

## Fitur Baru & Perbaikan

### 1. Advanced Analytics & Insights 📊
Fitur analisis keuangan yang komprehensif untuk memberikan wawasan mendalam tentang pola pengeluaran dan tren keuangan Anda.

#### a. Spending Patterns Analysis (Analisis Pola Pengeluaran)
- **Analisis berdasarkan hari**: Lihat pola pengeluaran berdasarkan hari dalam seminggu
  - Identifikasi hari dengan pengeluaran tertinggi dan terendah
  - Rata-rata pengeluaran per hari
  - Total transaksi per hari
- **Analisis berdasarkan minggu**: Analisis pengeluaran per minggu dalam sebulan
  - Tren pengeluaran mingguan
  - Perbandingan antar minggu
- **Spending Heatmap**: Visualisasi kalender pengeluaran
  - Lihat pola pengeluaran dalam bentuk heatmap 3 bulan terakhir
  - Identifikasi tanggal dengan pengeluaran tinggi
- **Peak Spending Times**: Ringkasan waktu puncak pengeluaran
  - Hari dengan pengeluaran tertinggi
  - Minggu dengan pengeluaran tertinggi
- **Referensi**: `assets/js/analytics.js:38` (analyzeSpendingByDay), `assets/js/analytics.js:78` (analyzeSpendingByWeek)

#### b. Category Trends Analysis (Analisis Tren Kategori)
- **Tren kategori bulanan**: Analisis tren pengeluaran per kategori selama 6 bulan terakhir
  - Grafik tren untuk setiap kategori
  - Identifikasi kategori yang naik atau turun
- **Kategori yang berkembang**: Identifikasi kategori dengan pertumbuhan pengeluaran
  - Threshold default: 10% pertumbuhan
  - Persentase perubahan MoM (Month over Month)
- **Kategori yang menurun**: Identifikasi kategori dengan penurunan pengeluaran
  - Threshold default: -10% penurunan
  - Analisis efektivitas penghematan
- **Arah tren**: Deteksi otomatis arah tren (naik/turun/stabil)
- **Referensi**: `assets/js/analytics.js:141` (analyzeCategoryTrends), `assets/js/analytics.js:193` (identifyGrowingCategories)

#### c. Predictive Analytics (Analisis Prediktif)
- **Prediksi pengeluaran bulan depan**: 
  - Menggunakan moving average 3 bulan
  - Prediksi total dan per kategori
  - Tingkat kepercayaan prediksi
- **Trend-based prediction**: Prediksi berdasarkan tren historis
  - Analisis tren jangka panjang
  - Proyeksi pengeluaran masa depan
  - Rekomendasi berdasarkan tren
- **Moving Average**: Perhitungan rata-rata bergerak untuk smoothing data
- **Referensi**: `assets/js/analytics.js:241` (predictNextMonthSpending), `assets/js/analytics.js:289` (getTrendBasedPrediction)

#### d. Period Comparison (Perbandingan Periode)
- **Month over Month (MoM)**: Bandingkan bulan ini dengan bulan lalu
  - Perubahan income, expense, dan net
  - Persentase perubahan
  - Perbandingan per kategori
- **Year over Year (YoY)**: Bandingkan tahun ini dengan tahun lalu
  - Pertumbuhan tahunan
  - Tren jangka panjang
  - Analisis seasonal patterns
- **Custom Period Comparison**: Bandingkan dua periode custom
  - Pilih tanggal mulai dan akhir untuk kedua periode
  - Analisis detail perubahan
  - Insights otomatis
- **Comparison Insights**: Wawasan otomatis dari perbandingan
  - Kategori dengan perubahan terbesar
  - Rekomendasi berdasarkan perubahan
  - Alert untuk perubahan signifikan
- **Referensi**: `assets/js/analytics.js:333` (compareMonthOverMonth), `assets/js/analytics.js:376` (compareYearOverYear)

#### e. Auto-Generated Insights (Wawasan Otomatis)
- **Insights cerdas** yang dihasilkan otomatis berdasarkan data transaksi:
  - Top spending categories
  - Unusual spending patterns
  - Budget recommendations
  - Savings opportunities
  - Spending trends
- **Personalized recommendations** untuk meningkatkan kesehatan keuangan
- **Referensi**: `assets/js/analytics.js:478` (generateInsights)

#### Cara Menggunakan Analytics
1. Login ke aplikasi
2. Klik menu "Analytics" di sidebar
3. Pilih tab analisis yang diinginkan:
   - **Spending Patterns**: Lihat pola pengeluaran harian/mingguan
   - **Category Trends**: Analisis tren kategori
   - **Predictions**: Lihat prediksi pengeluaran
   - **Comparisons**: Bandingkan periode (MoM/YoY/Custom)
   - **Insights**: Baca wawasan dan rekomendasi otomatis
4. Gunakan filter tanggal untuk menyesuaikan periode analisis
5. Export hasil analisis ke PDF atau CSV jika diperlukan

### 2. Admin Analytics Dashboard 👨‍💼
Dashboard khusus untuk administrator untuk memantau statistik pengguna dan pertumbuhan aplikasi.

#### Fitur Admin Dashboard
- **User Statistics**:
  - Total pengguna terdaftar
  - Pengguna aktif (login dalam 30 hari terakhir)
  - Jumlah instalasi PWA
  - Tingkat aktivitas pengguna
- **User Growth Chart**:
  - Grafik pertumbuhan pengguna 30 hari terakhir
  - Visualisasi tren pendaftaran
  - Analisis pertumbuhan harian
- **Users List**:
  - Daftar lengkap semua pengguna
  - Informasi email dan last login
  - Status PWA installation
  - Filter dan pencarian pengguna
- **Export Users**:
  - Export data pengguna ke CSV
  - Termasuk email, last login, dan status PWA
  - Untuk analisis lebih lanjut

#### Cara Menggunakan Admin Dashboard
1. Login sebagai admin (pastikan role admin sudah diset di database)
2. Klik menu "Admin Analytic" di sidebar
3. Lihat statistik pengguna di bagian atas
4. Scroll untuk melihat grafik pertumbuhan pengguna
5. Lihat daftar pengguna di bagian bawah
6. Klik "Export to CSV" untuk download data pengguna
7. Klik "Refresh" untuk update data terbaru

#### Setup Admin Access
- Untuk memberikan akses admin, update tabel `profiles` di Supabase:
  ```sql
  UPDATE profiles 
  SET role = 'admin' 
  WHERE user_id = 'USER_ID_HERE';
  ```
- Atau tambahkan kolom `is_admin` boolean di tabel `profiles`
- **Referensi**: `assets/js/admin-dashboard.js:10` (fetchAdminStats), `assets/js/admin-dashboard.js:133` (renderAdminDashboard)

### 3. Filter Tanggal yang Lebih Fleksibel
- **Filter berdasarkan tanggal spesifik**: Filter transaksi sekarang mendukung pemilihan tanggal spesifik (bukan hanya bulan/tahun).
- **Cara menggunakan**:
  - Di halaman Recent Transactions, gunakan filter date picker
  - Pilih tanggal spesifik untuk melihat transaksi pada tanggal tersebut
  - Kosongkan filter untuk melihat semua transaksi
  - Filter otomatis mendeteksi format tanggal (YYYY-MM-DD) atau bulan (YYYY-MM)
- **Referensi**: `assets/js/app.js:493` (updateUI), `assets/js/app.js:697` (getFilteredData)

### 4. Sistem Notifikasi yang Ditingkatkan
- **Notifikasi otomatis** untuk:
  - **Budget Warning**: Peringatan saat budget mencapai 80% atau lebih
  - **Budget Exceeded**: Notifikasi saat budget melebihi limit
  - **Low Balance**: Peringatan saat saldo akun di bawah Rp 100.000
  - **Savings Goal**: Notifikasi progress dan achievement savings goal
  - **Recurring Reminders**: Pengingat transaksi berulang yang jatuh tempo
- **Fitur notifikasi**:
  - Panel notifikasi full-screen di mobile untuk pengalaman yang lebih baik
  - Mark all as read untuk menandai semua notifikasi sebagai sudah dibaca
  - Notifikasi yang sudah dibaca tidak akan muncul lagi setelah reload (fix loop issue)
  - Badge counter menampilkan jumlah notifikasi yang belum dibaca
- **Cara menggunakan**:
  - Klik icon bell di pojok kanan atas untuk membuka panel notifikasi
  - Klik notifikasi untuk menandainya sebagai sudah dibaca
  - Gunakan "Mark all as read" untuk menandai semua notifikasi sekaligus
  - Notifikasi akan otomatis muncul berdasarkan kondisi keuangan Anda
- **Referensi**: `assets/js/notifications.js`

### 5. PWA Install Button
- **Install sebagai aplikasi**: Aplikasi dapat diinstall sebagai Progressive Web App (PWA) di perangkat Anda.
- **Cara menggunakan**:
  - Di halaman login, lihat icon PWA di pojok kanan bawah dengan animasi float
  - Klik icon untuk memulai proses install
  - Ikuti instruksi browser untuk menyelesaikan installasi
  - Setelah terinstall, aplikasi dapat dibuka seperti aplikasi native
- **Keuntungan PWA**:
  - Dapat diakses offline (dengan service worker)
  - Icon di home screen perangkat
  - Pengalaman seperti aplikasi native
  - Update otomatis saat ada versi baru
- **Referensi**: `assets/js/auth.js:216` (beforeinstallprompt), `assets/js/auth.js:604` (PWA button handler)

### 6. Responsive Design Improvements
- **Mobile optimizations**:
  - Teks "Overview" disembunyikan di mobile untuk menghemat ruang
  - Hanya menampilkan Tour button, Notification, dan Avatar di mobile
  - Panel notifikasi full-screen di mobile dengan overlay backdrop
  - Alignment dan spacing yang lebih baik untuk avatar dan notification
- **Desktop optimizations**:
  - Layout yang lebih rapi dengan spacing yang konsisten
  - Ukuran elemen yang proporsional (40px untuk desktop, 36px untuk mobile)
- **Referensi**: `assets/css/style.css:1615` (mobile responsive), `assets/css/style.css:83` (PWA button)

### 7. UI/UX Improvements
- **Avatar dan Notification Alignment**:
  - Posisi dan alignment yang lebih rapi antara notification button dan avatar
  - Ukuran konsisten untuk semua elemen di top bar
  - Spacing yang optimal untuk tampilan yang lebih profesional
- **Animasi Float untuk PWA Button**:
  - Animasi halus naik-turun untuk menarik perhatian
  - Tooltip muncul saat hover untuk memberikan informasi
  - Responsif untuk berbagai ukuran layar

## Tips & Troubleshooting

### Modal dan UI
- Jika modal saling tumpang tindih, gunakan satu modal aktif:
  - Utility untuk menutup semua modal: `assets/js/advanced-listeners.js:100` (`closeAllModals`).
  - Event pembukaan modal akun/transfer sudah memanggil utility tersebut.

### Konfigurasi
- Pastikan `SUPABASE_URL` dan `anon key` valid dan menggunakan project yang benar.
- Jika data tidak muncul, periksa table dan kolom sesuai skema SQL.
- Pastikan semua tabel database sudah diimport dari folder `database/`, termasuk tabel `notifications` untuk fitur notifikasi.

### Notifikasi
- Jika notifikasi tidak muncul:
  - Pastikan tabel `notifications` sudah dibuat di Supabase
  - Periksa console browser untuk error
  - Pastikan user sudah login (notifikasi hanya untuk user yang terautentikasi)
- Jika notifikasi muncul berulang setelah dibaca:
  - Pastikan `is_read` field di database terupdate dengan benar
  - Clear browser cache dan reload halaman

### PWA Install
- Jika button PWA tidak muncul:
  - Pastikan aplikasi diakses melalui HTTPS atau localhost
  - Periksa apakah `manifest.webmanifest` dan `sw.js` tersedia
  - Pastikan browser mendukung PWA (Chrome, Edge, Safari iOS 11.3+)
  - Button hanya muncul di halaman login saat event `beforeinstallprompt` terjadi
- Jika install gagal:
  - Pastikan service worker terdaftar dengan benar
  - Periksa console browser untuk error
  - Pastikan manifest file valid dan lengkap

### Filter dan Pencarian
- Filter tanggal:
  - Kosongkan filter untuk melihat semua transaksi
  - Format tanggal: YYYY-MM-DD untuk tanggal spesifik
  - Browser akan otomatis memformat tanggal sesuai locale

## Catatan Keamanan
- Simpan hanya `anon key` di client.
- Jangan menaruh `service_role` key di repository atau frontend.
