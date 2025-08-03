/**
 * Centralized color configuration for consistent theming
 */
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8', // sky-400 (current Back to Home color)
    500: '#0ea5e9',
    600: '#0284c7', // sky-600 (primary button color)
    700: '#0369a1', // sky-700 (primary button hover)
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  success: {
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
  },
  error: {
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
} as const

/**
 * Semantic color mappings for easier usage
 */
export const semanticColors = {
  // Button and interactive elements
  button: {
    primary: {
      bg: `bg-sky-600`, // colors.primary[600]
      hover: `hover:bg-sky-700`, // colors.primary[700]
      text: 'text-white',
    },
    secondary: {
      bg: 'bg-gray-600',
      hover: 'hover:bg-gray-500',
      text: 'text-white',
    },
  },
  // Links and navigation
  link: {
    primary: {
      color: 'text-sky-400', // colors.primary[400]
      hover: 'hover:text-sky-300', // colors.primary[300]
    },
  },
  // Traffic colors (for map visualization)
  traffic: {
    heavy: '#dc2626', // red-600
    medium: '#f59e0b', // amber-500
    light: '#facc15', // yellow-400
  },
  // Route colors (for map visualization)
  routes: {
    hblr: '#00AEEF', // HBLR blue
    newRoute: '#32CD32', // lime green
  },
} as const

export default colors
