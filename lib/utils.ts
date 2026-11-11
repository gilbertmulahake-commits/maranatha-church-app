import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Full spacing scale used across the app (matches globals.css @theme tokens).
const SPACING_SCALE = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Custom typography (Heading 1-4, Paragraph variants)
      'font-size': [
        'text-heading-1',
        'text-heading-2',
        'text-heading-3',
        'text-heading-4',
        'text-paragraph-large',
        'text-paragraph',
        'text-paragraph-small',
        'text-paragraph-mini',
      ],

      // Padding (all directions)
      p: [{ padding: [...SPACING_SCALE] }],
      px: [{ padding: [...SPACING_SCALE] }],
      py: [{ padding: [...SPACING_SCALE] }],
      pt: [{ padding: [...SPACING_SCALE] }],
      pb: [{ padding: [...SPACING_SCALE] }],
      pl: [{ padding: [...SPACING_SCALE] }],
      pr: [{ padding: [...SPACING_SCALE] }],

      // Margin (all directions)
      m: [{ margin: [...SPACING_SCALE] }],
      mx: [{ margin: [...SPACING_SCALE] }],
      my: [{ margin: [...SPACING_SCALE] }],
      mt: [{ margin: [...SPACING_SCALE] }],
      mb: [{ margin: [...SPACING_SCALE] }],
      ml: [{ margin: [...SPACING_SCALE] }],
      mr: [{ margin: [...SPACING_SCALE] }],

      // Gap (all directions)
      gap: [{ gap: [...SPACING_SCALE] }],
      'gap-x': [{ gap: [...SPACING_SCALE] }],
      'gap-y': [{ gap: [...SPACING_SCALE] }],

      // Space between children (Stack / Flex / Grid patterns)
      'space-x': [{ space: [...SPACING_SCALE] }],
      'space-y': [{ space: [...SPACING_SCALE] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}