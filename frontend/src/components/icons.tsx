import React from 'react'

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number }

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export const MicIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
)

export const WaveIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <line x1="3" y1="12" x2="3" y2="12" />
    <line x1="7" y1="8" x2="7" y2="16" />
    <line x1="11" y1="4" x2="11" y2="20" />
    <line x1="15" y1="7" x2="15" y2="17" />
    <line x1="19" y1="10" x2="19" y2="14" />
  </svg>
)

export const ArchiveIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)

export const UploadIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

export const PlayIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <path d="M8 5v14l11-7z" />
  </svg>
)

export const PauseIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
)

export const StopIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)

export const TrashIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

export const EditIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)

export const DownloadIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

export const RefreshIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

export const CheckIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const SaveIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

export const XIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export const SparkleIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} fill="currentColor" stroke="none" {...p}>
    <path d="M12 2l1.8 5.6L19.4 9l-5.6 1.8L12 16l-1.8-5.2L4.6 9l5.6-1.4z" />
    <circle cx="18.5" cy="17.5" r="1.5" />
    <circle cx="5.5" cy="16.5" r="1" />
  </svg>
)

export const ChevronIcon: React.FC<IconProps> = ({ size = 20, ...p }) => (
  <svg {...base(size)} {...p}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
