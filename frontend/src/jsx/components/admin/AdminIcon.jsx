const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  timetable: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  lessons: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <path d="M17 4l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" />
    </>
  ),
  students: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <path d="M16 4.1a4 4 0 0 1 0 7.8M22 21c0-3-1.8-5.6-4.5-6.6" />
    </>
  ),
  applications: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  dojos: (
    <>
      <path d="M3 10.5L12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  signOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

export default function AdminIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
