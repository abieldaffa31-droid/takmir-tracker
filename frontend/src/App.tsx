import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth-context'
import { RequireAuth, RequireCoordinator } from './components/RequireAuth'

import Login from './features/auth/Login'
import RoleRedirect from './features/home/RoleRedirect'
import Onboarding from './features/onboarding/Onboarding'
import Grid from './features/grid/Grid'
import JadwalSaya from './features/jadwal/JadwalSaya'
import FormAktivitas from './features/jadwal/FormAktivitas'
import Pengecualian from './features/jadwal/Pengecualian'
import Cari from './features/cari/Cari'
import AnggotaList from './features/anggota/AnggotaList'
import AnggotaProfil from './features/anggota/AnggotaProfil'
import Periode from './features/pengaturan/Periode'
import ProfilSaya from './features/pengaturan/ProfilSaya'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/masuk" element={<Login />} />

            <Route path="/" element={<RequireAuth><RoleRedirect /></RequireAuth>} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

            <Route path="/grid" element={<RequireAuth><Grid /></RequireAuth>} />

            <Route path="/jadwal" element={<RequireAuth><JadwalSaya /></RequireAuth>} />
            <Route path="/jadwal/tambah" element={<RequireAuth><FormAktivitas /></RequireAuth>} />
            <Route path="/jadwal/:id/ubah" element={<RequireAuth><FormAktivitas /></RequireAuth>} />
            <Route path="/jadwal/pengecualian" element={<RequireAuth><Pengecualian /></RequireAuth>} />

            <Route
              path="/cari"
              element={
                <RequireAuth>
                  <RequireCoordinator>
                    <Cari />
                  </RequireCoordinator>
                </RequireAuth>
              }
            />
            <Route
              path="/anggota"
              element={
                <RequireAuth>
                  <RequireCoordinator>
                    <AnggotaList />
                  </RequireCoordinator>
                </RequireAuth>
              }
            />
            <Route
              path="/anggota/:id"
              element={
                <RequireAuth>
                  <RequireCoordinator>
                    <AnggotaProfil />
                  </RequireCoordinator>
                </RequireAuth>
              }
            />
            <Route
              path="/pengaturan/periode"
              element={
                <RequireAuth>
                  <RequireCoordinator>
                    <Periode />
                  </RequireCoordinator>
                </RequireAuth>
              }
            />
            <Route path="/pengaturan/profil" element={<RequireAuth><ProfilSaya /></RequireAuth>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
