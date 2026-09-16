export interface ThemeStyles {
  bg: string;
  hoverBg: string;
  ring: string;
  borderLight: string;
  gradientBg: string;
  accentBg: string;
  lightBg: string;
  lightText: string;
}

export function getTheme(color?: string): ThemeStyles {
  switch (color) {
    case 'purple':
      return {
        bg: 'bg-purple-600',
        hoverBg: 'hover:bg-purple-700',
        ring: 'focus:ring-purple-500',
        borderLight: 'border-purple-200',
        gradientBg: 'from-purple-50 to-indigo-50',
        accentBg: 'bg-purple-50',
        lightBg: 'bg-purple-100',
        lightText: 'text-purple-700',
      };
    case 'green':
      return {
        bg: 'bg-emerald-600',
        hoverBg: 'hover:bg-emerald-700',
        ring: 'focus:ring-emerald-500',
        borderLight: 'border-emerald-200',
        gradientBg: 'from-emerald-50 to-teal-50',
        accentBg: 'bg-emerald-50',
        lightBg: 'bg-emerald-100',
        lightText: 'text-emerald-700',
      };
    case 'red':
      return {
        bg: 'bg-rose-600',
        hoverBg: 'hover:bg-rose-700',
        ring: 'focus:ring-rose-500',
        borderLight: 'border-rose-200',
        gradientBg: 'from-rose-50 to-orange-50',
        accentBg: 'bg-rose-50',
        lightBg: 'bg-rose-100',
        lightText: 'text-rose-700',
      };
    case 'amber':
      return {
        bg: 'bg-amber-600',
        hoverBg: 'hover:bg-amber-700',
        ring: 'focus:ring-amber-500',
        borderLight: 'border-amber-200',
        gradientBg: 'from-amber-50 to-yellow-50',
        accentBg: 'bg-amber-50',
        lightBg: 'bg-amber-100',
        lightText: 'text-amber-700',
      };
    case 'teal':
      return {
        bg: 'bg-teal-600',
        hoverBg: 'hover:bg-teal-700',
        ring: 'focus:ring-teal-500',
        borderLight: 'border-teal-200',
        gradientBg: 'from-teal-50 to-cyan-50',
        accentBg: 'bg-teal-50',
        lightBg: 'bg-teal-100',
        lightText: 'text-teal-700',
      };
    case 'indigo':
      return {
        bg: 'bg-indigo-600',
        hoverBg: 'hover:bg-indigo-700',
        ring: 'focus:ring-indigo-500',
        borderLight: 'border-indigo-200',
        gradientBg: 'from-indigo-50 to-blue-50',
        accentBg: 'bg-indigo-50',
        lightBg: 'bg-indigo-100',
        lightText: 'text-indigo-700',
      };
    case 'blue':
    default:
      return {
        bg: 'bg-blue-600',
        hoverBg: 'hover:bg-blue-700',
        ring: 'focus:ring-blue-500',
        borderLight: 'border-blue-200',
        gradientBg: 'from-blue-50 to-indigo-50',
        accentBg: 'bg-blue-50',
        lightBg: 'bg-blue-100',
        lightText: 'text-blue-700',
      };
  }
}
