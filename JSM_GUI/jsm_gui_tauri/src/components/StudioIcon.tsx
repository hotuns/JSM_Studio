export type StudioIconName = 'overview' | 'games' | 'controllerStatus' | 'gyro' | 'keybinds' | 'touchpad' | 'profiles' | 'communityProfiles' | 'settings' | 'help' | 'search' | 'code' | 'folder' | 'refresh' | 'arrow' | 'more' | 'check' | 'close'

const paths: Record<StudioIconName, string> = {
  communityProfiles: 'M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a6 6 0 0 1 12 0v3 M17 3a4 4 0 0 1 0 8 M18 15a5 5 0 0 1 4 5v1',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 2h6l1 3 3 1 3 4v4l-3 4-3 1-1 3H9l-1-3-3-1-3-4v-4l3-4 3-1z',
  games: 'M7 7h10c3 0 4 3 5 10 .3 3-2 4-4 1l-2-2H8l-2 2c-2 3-4 2-4-1 1-7 2-10 5-10z M7 10v5 M4.5 12.5h5 M16 11h.01 M19 14h.01',
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  controllerStatus: 'M7 7h10c3 0 4 3 5 10 .3 3-2 4-4 1l-2-2H8l-2 2c-2 3-4 2-4-1 1-7 2-10 5-10z M7 10v5 M4.5 12.5h5 M16 11h.01 M19 14h.01',
  gyro: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M15 9a4.3 4.3 0 1 0 1 5 M15 5v4h4',
  keybinds: 'M4 5h16v14H4z M7 9h2 M11 9h2 M15 9h2 M7 13h2 M11 13h2 M15 13h2 M8 16h8',
  touchpad: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M4 16h16 M12 16v5 M8 8h8 M12 5v6',
  profiles: 'M3 7V5a1 1 0 0 1 1-1h6l2 3h8a1 1 0 0 1 1 1v11H3z M3 11h18',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  code: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',
  folder: 'M3 7V4h7l2 3h9v13H3z',
  refresh: 'M20 11a8 8 0 0 0-14-5L3 9 M3 3v6h6 M4 13a8 8 0 0 0 14 5l3-3 M21 21v-6h-6',
  arrow: 'M5 12h14 M14 7l5 5-5 5', more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  check: 'M5 12l4 4L19 6', close: 'M6 6l12 12 M18 6L6 18',
}

export function StudioIcon({ name, size = 20 }: { name: StudioIconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
