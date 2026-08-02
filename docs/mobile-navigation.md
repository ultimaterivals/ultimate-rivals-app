# Mobile navigation and PWA

The athlete shell is mobile-first. Its fixed bottom navigation contains exactly five destinations: InÃ­cio, UR Play, Ranking, Performance, and Perfil. Notifications remain in the consistent header. Career routes live in the desktop secondary navigation and the profile menu.

The shell accounts for device safe areas, reserves bottom content space, uses visible focus states, and keeps primary touch targets at least 44 pixels high. Desktop receives a dedicated sidebar instead of a stretched mobile layout.

The manifest starts at `/athlete`, uses standalone display and the official black/gold theme. A prepared UR lettermark placeholder is used until an approved official app icon is provided. The service worker caches only shell assets; domain data remains network-backed. The install prompt is optional and is suppressed after dismissal.
