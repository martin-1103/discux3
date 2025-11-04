# Design System

## 🎨 Design Philosophy

Modern, clean, dan user-friendly dengan shadcn/ui components. Focus pada intuitive navigation dan visual clarity yang memudahkan user interaction dengan AI agents.

### Design Principles
1. **Clarity First** - Informasi jelas dan mudah dipahami
2. **Intuitive Navigation** - User bisa navigate tanpa instructions
3. **Visual Hierarchy** - Important elements stand out
4. **Consistent Patterns** - Reusable components dan interactions
5. **Responsive Design** - Works well di desktop dan mobile
6. **Accessibility** - Inclusive design untuk semua users

## 🎯 Color Schemes & Theming

### Primary Color Palette
```typescript
const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Primary blue
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b', // Secondary gray
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef', // Accent purple
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  }
}
```

### Dark Theme Support
```typescript
const darkTheme = {
  background: '#0f172a',
  foreground: '#f8fafc',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  popover: '#1e293b',
  popoverForeground: '#f8fafc',
  primary: '#60a5fa',
  primaryForeground: '#0f172a',
  secondary: '#334155',
  secondaryForeground: '#f8fafc',
  muted: '#334155',
  mutedForeground: '#94a3b8',
  accent: '#e879f9',
  accentForeground: '#0f172a',
  destructive: '#f87171',
  destructiveForeground: '#0f172a',
  border: '#334155',
  input: '#1e293b',
  ring: '#60a5fa'
}
```

## 🎭 Typography

### Font System
```typescript
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  }
}
```

### Text Hierarchy
- **H1**: Page titles - `text-3xl font-bold`
- **H2**: Section headers - `text-2xl font-semibold`
- **H3**: Subsection headers - `text-xl font-medium`
- **Body**: Regular text - `text-base`
- **Caption**: Small text - `text-sm text-muted-foreground`
- **Code**: Inline code - `font-mono text-sm bg-muted px-1 py-0.5 rounded`

## 🎨 Component Design Tokens

### Spacing System
```typescript
const spacing = {
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
}
```

### Border Radius
```typescript
const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px'
}
```

### Shadows
```typescript
const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
}
```

## 🎬 Animation Guidelines

### Motion Principles
1. **Purposeful** - Animations should enhance usability
2. **Fast** - Keep animations short (200-300ms)
3. **Natural** - Use easing functions that feel natural
4. **Consistent** - Use similar animations throughout
5. **Accessible** - Respect prefers-reduced-motion

### Transition Tokens
```typescript
const transitions = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',    // Default fast
    300: '300ms',    // Default normal
    500: '500ms',    // Default slow
    700: '700ms',
    1000: '1000ms'
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',      // Most common
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'   // Default
  }
}
```

### Common Animations
```typescript
// Hover effects
const hoverScale = 'transform scale-105 transition-transform duration-200 ease-out'
const hoverLift = 'transform -translate-y-0.5 transition-transform duration-200 ease-out'

// Loading states
const pulse = 'animate-pulse'
const spin = 'animate-spin'

// Slide animations
const slideIn = 'transform translate-x-0 transition-transform duration-300 ease-out'
const fadeIn = 'opacity-100 transition-opacity duration-200 ease-in'
```

## 🖼️ Icon System

### Icon Library
- **Primary**: Lucide React (modern, consistent)
- **Custom**: Agent emoji system for AI avatars
- **Fallback**: System emoji for compatibility

### Icon Usage Guidelines
- **Size**: Use consistent sizes (16px, 20px, 24px)
- **Color**: Inherit text color or use primary/accent colors
- **Spacing**: Add margin/padding for proper spacing
- **Accessibility**: Add aria-label for icon-only buttons

### Agent Avatar System
```typescript
interface AgentAvatar {
  emoji: string        // 🤖 🚀 💡 🎯 📊
  color: string       // Brand color
  size: 'sm' | 'md' | 'lg'
  variant: 'default' | 'outlined' | 'filled'
}

// Avatar sizes
const avatarSizes = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg'
}
```

## 🎯 Layout Components

### Container System
```typescript
const container = {
  centered: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  fluid: 'w-full px-4 sm:px-6 lg:px-8',
  narrow: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'
}
```

### Grid System
```typescript
const grid = {
  cols: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    12: 'grid-cols-12'
  },
  gap: {
    sm: 'gap-2',
    md: 'gap-4',    // Default
    lg: 'gap-6',
    xl: 'gap-8'
  }
}
```

---

**Related Files:**
- [Chat Interface](./chat-interface.md) - Chat UI components and patterns
- [Agents Interface](./agents-interface.md) - Agent management UI design
- [Responsive Design](./responsive-design.md) - Mobile and responsive layouts