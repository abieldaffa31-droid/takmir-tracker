# Deploy ke Railway + domain sendiri

Repo ini punya dua service terpisah dari satu monorepo: `backend/` (API + Postgres)
dan `frontend/` (React SPA). Di Railway, keduanya jadi dua service berbeda yang
menunjuk ke root directory masing-masing dalam repo yang sama.

## 1. Buat project di Railway

1. Buka [railway.app](https://railway.app), buat project baru.
2. **New → Database → PostgreSQL** — Railway otomatis kasih `DATABASE_URL`.
3. **New → GitHub Repo** → pilih `abieldaffa31-droid/takmir-tracker`.
   - Ini jadi service backend. Di **Settings → Root Directory**, isi `backend`.
   - **Settings → Deploy → Start Command**, isi `npm run start:prod` (build
     command default `npm run build` sudah cukup — Railway/Nixpacks otomatis
     jalankan `npm install` lalu `npm run build`).
4. **New → GitHub Repo** lagi, repo yang sama → jadi service kedua (frontend).
   - **Root Directory**: `frontend`
   - **Start Command**: `npm start` (sudah menjalankan `serve -s dist` di build hasil `npm run build`)

## 2. Environment variables

**Service backend:**

| Key | Nilai |
|---|---|
| `DATABASE_URL` | Klik "Add Reference" → pilih variabel Postgres Railway (`DATABASE_URL`) |
| `BETTER_AUTH_SECRET` | String acak panjang (≥32 karakter). Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL publik backend, mis. `https://api.newregiemmpr.my.id` |
| `FRONTEND_URL` | URL publik frontend, mis. `https://newregiemmpr.my.id` |
| `PORT` | Biarkan kosong — Railway isi otomatis |
| `NODE_ENV` | `production` |

**Service frontend:**

| Key | Nilai |
|---|---|
| `VITE_API_URL` | Sama seperti `BETTER_AUTH_URL` di atas, mis. `https://api.newregiemmpr.my.id` |

> Catatan: `VITE_API_URL` di-*bake* ke dalam build saat `npm run build` jalan
> (variabel Vite bersifat build-time, bukan runtime). Kalau nanti diubah, perlu
> trigger redeploy ulang service frontend, bukan cuma restart.

## 3. Sambungkan domain

Di Railway, tiap service punya tab **Settings → Networking → Custom Domain**:

- Service **frontend** → custom domain `newregiemmpr.my.id` (atau `www.newregiemmpr.my.id`)
- Service **backend** → custom domain `api.newregiemmpr.my.id`

Railway kasih target CNAME. Di panel DNS domain kamu (tempat beli
`newregiemmpr.my.id`), tambahkan:

```
CNAME   @ (atau www)     -> target dari Railway (frontend)
CNAME   api              -> target dari Railway (backend)
```

Beberapa registrar tidak izinkan CNAME di root (`@`) — kalau begitu, pakai
`www.newregiemmpr.my.id` untuk frontend dan redirect root ke `www` lewat fitur
forwarding di registrar-mu.

## 4. Migrasi & data awal

Migrasi database jalan otomatis tiap deploy (`start:prod` = `npm run db:migrate && node dist/index.js`).

Untuk isi data contoh (opsional, sekali saja setelah deploy pertama) — buka tab
**Shell** di service backend Railway, jalankan:

```bash
npm run db:seed
```

⚠️ **Jangan jalankan `db:seed` lagi setelah ada data anggota/jadwal asli** —
script ini menghapus seluruh `members`, `periods`, dan akun login sebelum
mengisi ulang dengan data contoh.

## 5. Email login (magic link) — WAJIB diganti sebelum dipakai orang lain

Saat ini pengiriman magic link cuma dicetak ke log server (`src/config/auth.ts`,
fungsi `sendLoginEmail`) — sesuai pilihan awal untuk pengembangan. Untuk
produksi, anggota lain harus benar-benar menerima emailnya. Ganti isi fungsi
itu dengan provider nyata, misalnya [Resend](https://resend.com) (gratis untuk
volume kecil):

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendLoginEmail(email: string, url: string) {
  const member = await memberRepo.byEmail(email);
  if (!member) return;
  await resend.emails.send({
    from: "Takmir Tracker <login@newregiemmpr.my.id>",
    to: email,
    subject: "Tautan masuk Takmir Tracker",
    html: `<p>Klik untuk masuk: <a href="${url}">${url}</a></p>`,
  });
}
```

Tambahkan `RESEND_API_KEY` ke environment variables service backend, dan
`npm install resend` di `backend/`.

## 6. Cek setelah deploy

- `https://api.newregiemmpr.my.id/api/health` harus balas `{"data":{"status":"ok"}}`
- `https://newregiemmpr.my.id/masuk` harus muncul halaman login biru-kuning
