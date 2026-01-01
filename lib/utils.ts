import { type ClassValue, clsx } from 'clsx'

// Utility function for merging Tailwind CSS classes
// Tradeoff: Using clsx for conditional class merging. Alternative: classnames library.
// clsx is smaller and faster, making it a better choice for modern apps.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

