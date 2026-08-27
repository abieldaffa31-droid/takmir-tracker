export type NavItem = { label: string; to: string }

export const memberTabs: NavItem[] = [
  { label: 'Jadwal Saya', to: '/jadwal' },
  { label: 'Tim', to: '/grid' },
  { label: 'Saya', to: '/pengaturan/profil' },
]

export const coordinatorTabs: NavItem[] = [
  { label: 'Grid', to: '/grid' },
  { label: 'Cari', to: '/cari' },
  { label: 'Anggota', to: '/anggota' },
  { label: 'Lainnya', to: '#lainnya' },
]

export const coordinatorMore: NavItem[] = [
  { label: 'Jadwal Saya', to: '/jadwal' },
  { label: 'Pengaturan Periode', to: '/pengaturan/periode' },
  { label: 'Profil Saya', to: '/pengaturan/profil' },
]

export const coordinatorSidebar: NavItem[] = [
  { label: 'Grid', to: '/grid' },
  { label: 'Cari', to: '/cari' },
  { label: 'Anggota', to: '/anggota' },
  { label: 'Periode', to: '/pengaturan/periode' },
  { label: 'Jadwal Saya', to: '/jadwal' },
]
