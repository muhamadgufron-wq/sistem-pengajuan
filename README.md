# SIPAA (Sistem Informasi Pengajuan Barang, Uang, dan Administrasi)

**SIPAA** adalah aplikasi berbasis web yang dirancang untuk mempermudah dan memusatkan proses pengajuan barang, uang, dan reimbursement perusahaan. Sistem ini menawarkan transparansi, kecepatan, dan profesionalisme dalam setiap alur pengajuan.

![SIPAA Dashboard](/public/hero-image.png)

## 🚀 Fitur Utama

### 🔐 Autentikasi & Keamanan

- **Login & Register**: Sistem autentikasi aman menggunakan Supabase Auth.
- **Forgot Password**: Fitur pemulihan kata sandi yang mudah.
- **Role-Based Access**:
  - **Karyawan**: Dapat membuat pengajuan, melihat status, dan riwayat absensi.
  - **Admin/Superadmin**: Memiliki akses ke dashboard analitik, persetujuan pengajuan, manajemen user, dan laporan.

### 📋 Manajemen Pengajuan

- **Pengajuan Barang**: Form pengajuan pengadaan barang inventaris kantor.
- **Pengajuan Uang**: Form untuk kebutuhan operasional atau biaya di muka.
- **Reimbursement**: Klaim penggantian biaya dengan fitur upload bukti transfer/struk.
- **Flow Persetujuan**: Admin dapat menyetujui, menolak, atau membiarkan pending setiap pengajuan dengan catatan (Admin Note).

### 📅 Sistem Absensi

- **Check-In/Check-Out**: Pencatatan kehadiran harian dengan lokasi (opsional) dan waktu.
- **Riwayat Absensi**: Karyawan dapat melihat detail kehadiran mereka.
- **Laporan Bulanan**: Admin dapat merekap data absensi.

### 📊 Dashboard Analitik

- **Statistik Real-time**: Grafik pengeluaran mingguan, total pengajuan pending vs approved.
- **Laporan Keuangan**: Ringkasan pengeluaran berdasarkan kategori (Barang, Uang, Reimbursement).
- **Export Data**: Fitur unduh laporan dalam format Excel/PDF.

## 🛠️ Teknologi yang Digunakan

Project ini dibangun dengan **Next.js 16** (App Router) dan teknologi modern lainnya:

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Date Handling**: [Date-fns](https://date-fns.org/)
- **Export**: `jspdf` & `exceljs`
- **Build Tool**: Turbopack

## 📂 Struktur Folder

Struktur folder project telah mengikuti best practice App Router Next.js:

```
src/
├── app/
│   ├── (auth)/              # Halaman Autentikasi (Login, Register, dll)
│   ├── (dashboard)/         # Halaman Utama Aplikasi (Protected Routes)
│   │   ├── (admin_panel)/   # Halaman Khusus Admin
│   │   ├── layout.tsx       # Layout Dashboard dengan Sidebar
│   │   └── page.tsx         # Dashboard Karyawan
│   ├── api/                 # API Routes (Next.js Server Functions)
│   └── layout.tsx           # Root Layout
├── components/
│   ├── absensi/             # Komponen fitur Absensi
│   ├── admin/               # Komponen fitur Admin
│   ├── dashboard/           # Komponen widget Dashboard
│   ├── layout/              # Sidebar, Navbar, Shell
│   ├── ui/                  # Reusable UI (Button, Input, Card, dll)
│   └── ...
├── lib/                     # Utilitas & Konfigurasi Library
│   ├── supabase/            # Client & Server component Supabase
│   └── utils.ts             # Helper functions (cn, formatter)
└── ...
```

## 🚀 Cara Menjalankan Project

Ikuti langkah berikut untuk menjalankan project di local environment Anda:

### 1. Clone Repository

```bash
git clone https://github.com/muhamadgufron-wq/sistem-pengajuan.git
cd sistem-pengajuan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env.local` di root directory, lalu isi dengan kredensial Supabase Anda:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 📦 Build & Deploy

Untuk membuat versi produksi:

```bash
npm run build
```

Project ini sangat cocok di-deploy menggunakan **Vercel** karena dibangun dengan Next.js. Pastikan environment variables sudah diset di pengaturan Vercel Project Anda.

---

© 2026 SIPAA Team. All rights reserved.
