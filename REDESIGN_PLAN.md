# Plan de Redesign Entreprise - AI Code Review Platform

## 🎯 Objectif
Transformer la plateforme en un SaaS de niveau entreprise avec un design professionnel, des animations riches et une identité visuelle cohérente représentative de l'AI code review, pour attirer visuellement les clients.

## ✅ Décisions Validées
- **Palette de couleurs**: Bleu professionnel classique (#2563eb, #1e40af, #3b82f6)
- **Composants UI**: Code copié et adapté directement depuis uiverse.io
- **Animations**: Riches et dynamiques pour impressionner visuellement
- **Scope**: Toutes les pages dashboard en même temps (sauf landing page)
- **Préservé**: Landing page (app/page.tsx) + pages marketing dynamiques

---

## 🎨 Nouveau Système de Design

### Palette de Couleurs Professionnelle

#### Light Mode
```css
--primary: #2563eb          /* Bleu primaire - confiance, stabilité */
--primary-dark: #1e40af     /* Bleu foncé - profondeur */
--primary-light: #3b82f6    /* Bleu clair - accessibilité */
--accent: #0ea5e9           /* Cyan - innovation */
--success: #10b981          /* Vert - validation */
--warning: #f59e0b          /* Ambre - attention */
--error: #ef4444            /* Rouge - erreurs */
--background: #fafbfc       /* Fond principal */
--surface: #ffffff          /* Cartes et surfaces */
--text: #0f172a             /* Texte principal */
--text-secondary: #64748b   /* Texte secondaire */
--border: rgba(37, 99, 235, 0.1)  /* Bordures subtiles */
```

#### Dark Mode
```css
--primary: #3b82f6          /* Bleu plus clair pour contraste */
--primary-dark: #1d4ed8     /* Bleu moyen */
--primary-light: #60a5fa    /* Bleu très clair */
--accent: #06b6d4           /* Cyan lumineux */
--background: #0f1117       /* Fond très sombre */
--surface: #1a1d29          /* Surfaces élevées */
--text: #f8fafc             /* Texte principal */
--text-secondary: #94a3b8   /* Texte secondaire */
--border: rgba(59, 130, 246, 0.15)
```

### Gradients Professionnels
```css
--gradient-primary: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
--gradient-accent: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
--gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
--gradient-hero: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0ea5e9 100%);
--gradient-surface: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%);
```

### Système d'Ombres Avancé
```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 2px 8px -2px rgba(37, 99, 235, 0.1), 0 4px 16px -4px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 16px -4px rgba(37, 99, 235, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 8px 32px -8px rgba(37, 99, 235, 0.2), 0 16px 48px -12px rgba(0, 0, 0, 0.15);
--shadow-xl: 0 20px 48px -12px rgba(37, 99, 235, 0.25), 0 24px 64px -16px rgba(0, 0, 0, 0.2);
--shadow-glow: 0 0 32px rgba(37, 99, 235, 0.4);
--shadow-glow-strong: 0 0 48px rgba(37, 99, 235, 0.6);
```

### Typographie
- **Font principale**: Inter (déjà installé)
- **Font mono**: JetBrains Mono (pour le code)
- **Échelle**: 12px / 14px / 16px / 18px / 24px / 32px / 48px / 64px
- **Poids**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

---

## 🎭 Composants uiverse.io à Intégrer

### 1. Buttons (Haute Priorité)
- **Source**: https://uiverse.io/AmitPA517/stupid-ray-30
  - Type: Bouton primaire avec effet shiny hover
  - Utilisation: Actions principales (Launch Analysis, Submit, Save)

- **Source**: https://uiverse.io/Nawsome/wet-fly-30
  - Type: Bouton avec loader intégré
  - Utilisation: Actions asynchrones (Launching, Processing)

- **Source**: https://uiverse.io/vinodjangid07/spicy-bat-100
  - Type: Bouton outline avec animation hover
  - Utilisation: Actions secondaires (Cancel, Back)

### 2. Cards (Haute Priorité)
- **Source**: https://uiverse.io/coheydev/tender-cobra-4
  - Type: Card avec glassmorphism et hover lift
  - Utilisation: Stat cards, Analysis cards

- **Source**: https://uiverse.io/vinodjangid07/curvy-elephant-7
  - Type: Stats card avec animated counter
  - Utilisation: Dashboard KPIs

- **Source**: https://uiverse.io/Andrew-Tsegaye/large-goose-90
  - Type: Glass card avec gradient border
  - Utilisation: Feature highlights, Important cards

### 3. Inputs (Haute Priorité)
- **Source**: https://uiverse.io/abrahamcalsin/afraid-starfish-83
  - Type: Input avec floating label
  - Utilisation: Tous les formulaires

- **Source**: https://uiverse.io/Custyyyy/chatty-wolverine-36
  - Type: Search bar avec icon et effet focus
  - Utilisation: Search partout (analyses, files, docs)

- **Source**: https://uiverse.io/adamgiebl/proud-owl-68
  - Type: Textarea avec character counter
  - Utilisation: Comments, descriptions, rules

### 4. Loaders (Haute Priorité)
- **Source**: https://uiverse.io/G4b413l/afraid-walrus-92
  - Type: Dot pulse loader bleu
  - Utilisation: Loading inline

- **Source**: https://uiverse.io/cssbuttons-io/unlucky-dog-59
  - Type: Circular spinner avec gradient
  - Utilisation: Page loading, async operations

- **Source**: https://uiverse.io/barisdogansutcu/brave-cobra-22
  - Type: Card skeleton shimmer
  - Utilisation: Content loading placeholders

### 5. Badges (Moyenne Priorité)
- **Source**: https://uiverse.io/Chriskoziol/brave-goat-25
  - Type: Pill badge avec gradient
  - Utilisation: Status (Approved, Pending, Failed)

- **Source**: https://uiverse.io/vinodjangid07/weak-fox-91
  - Type: Animated badge avec pulse
  - Utilisation: Notifications, urgent status

### 6. Toggles & Switches (Moyenne Priorité)
- **Source**: https://uiverse.io/ClawHunter/tricky-dog-70
  - Type: Animated checkbox avec checkmark
  - Utilisation: Settings, selections

- **Source**: https://uiverse.io/Galahhad/breezy-turkey-30
  - Type: Toggle switch moderne
  - Utilisation: Feature toggles, dark mode

### 7. Progress Bars (Moyenne Priorité)
- **Source**: https://uiverse.io/njesusj/colorful-walrus-16
  - Type: Circular progress avec percentage
  - Utilisation: Analysis progress

- **Source**: https://uiverse.io/Javierrocadev/tiny-dolphin-77
  - Type: Linear progress avec gradient
  - Utilisation: Loading progress, SLA indicators

### 8. Tooltips (Basse Priorité)
- **Source**: https://uiverse.io/Praashoo7/afraid-lobster-72
  - Type: Tooltip avec animation slide
  - Utilisation: Help text, icon explanations

---

## 🎬 Stratégie d'Animation

### Animations d'Entrée de Page
```typescript
// Fade in avec stagger pour les sections
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] // Ease out expo
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const cardVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}
```

### Micro-interactions Riches
```css
/* Button Hover - Scale + Shadow + Shine */
.btn-primary:hover {
  transform: scale(1.03) translateY(-2px);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.btn-primary:active {
  transform: scale(0.98);
  transition: all 0.1s ease;
}

/* Card Hover - Lift + Glow */
.card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
  border-color: rgba(37, 99, 235, 0.3);
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Icon Animations */
.icon-spin-hover:hover {
  animation: spin 0.6s ease-in-out;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Badge Pulse pour urgence */
.badge-urgent {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
    transform: scale(1.05);
  }
}

/* Shimmer effect pour loading */
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.05) 0%,
    rgba(37, 99, 235, 0.15) 50%,
    rgba(37, 99, 235, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Animations de Données
```typescript
// Animated counter pour stats
const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setCount(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{count}</span>;
}

// Chart animations avec spring
const chartAnimation = {
  initial: { scaleY: 0, opacity: 0 },
  animate: {
    scaleY: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}
```

### Transitions de Navigation
```typescript
// Page transitions fluides
const routeVariants = {
  initial: {
    opacity: 0,
    x: -20,
    filter: "blur(4px)"
  },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    filter: "blur(4px)",
    transition: {
      duration: 0.3
    }
  }
}
```

---

## 📋 Plan d'Implémentation Détaillé

### Phase 1: Fondation du Système de Design (Jour 1-2)

#### Fichier 1: `apps/dashboard/app/globals.css`
**Objectif**: Établir les tokens de design et animations CSS

**Ajouts**:
```css
/* === EXTENDED COLOR SYSTEM === */
:root {
  /* Professional Blue Palette */
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;  /* Primary */
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;  /* Primary Dark */
  --blue-900: #1e3a8a;

  /* Cyan Accent */
  --cyan-400: #22d3ee;
  --cyan-500: #06b6d4;
  --cyan-600: #0ea5e9;  /* Accent */

  /* Semantic Colors */
  --success: #10b981;
  --success-light: #34d399;
  --warning: #f59e0b;
  --warning-light: #fbbf24;
  --error: #ef4444;
  --error-light: #f87171;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  --gradient-accent: linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%);
  --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --gradient-hero: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0ea5e9 100%);
  --gradient-surface-light: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 100%);

  /* Shadows with blue tint */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 2px 8px -2px rgba(37, 99, 235, 0.1), 0 4px 16px -4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 16px -4px rgba(37, 99, 235, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px -8px rgba(37, 99, 235, 0.2), 0 16px 48px -12px rgba(0, 0, 0, 0.15);
  --shadow-xl: 0 20px 48px -12px rgba(37, 99, 235, 0.25), 0 24px 64px -16px rgba(0, 0, 0, 0.2);
  --shadow-glow: 0 0 32px rgba(37, 99, 235, 0.4);
  --shadow-glow-strong: 0 0 48px rgba(37, 99, 235, 0.6);

  /* Update existing tokens */
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --accent: #0ea5e9;
  --background: #fafbfc;
  --surface: #ffffff;
  --border: rgba(37, 99, 235, 0.1);
}

.dark {
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --accent: #06b6d4;
  --background: #0f1117;
  --surface: #1a1d29;
  --border: rgba(59, 130, 246, 0.15);

  --gradient-surface-dark: linear-gradient(180deg, rgba(26,29,41,0.9) 0%, rgba(26,29,41,0.5) 100%);
}

/* === PROFESSIONAL ANIMATIONS === */

/* Shimmer effect for loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.05) 0%,
    rgba(37, 99, 235, 0.15) 50%,
    rgba(37, 99, 235, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}

/* Pulse glow for urgent items */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
    transform: scale(1.05);
  }
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Gradient text */
.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-text-accent {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Float animation */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.float {
  animation: float 3s ease-in-out infinite;
}

/* Slide in animations */
@keyframes slide-in-bottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Scale in */
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Fade in */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Spin */
@keyframes spin-smooth {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* === UTILITY CLASSES === */

/* Glass effect enhanced */
.glass-pro {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dark .glass-pro {
  background: rgba(26, 29, 41, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Hover lift effect */
.hover-lift {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.hover-lift:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
}

/* Gradient background utilities */
.bg-gradient-primary {
  background: var(--gradient-primary);
}

.bg-gradient-accent {
  background: var(--gradient-accent);
}

.bg-gradient-hero {
  background: var(--gradient-hero);
}

/* Shadow utilities */
.shadow-glow {
  box-shadow: var(--shadow-glow);
}

.shadow-glow-strong {
  box-shadow: var(--shadow-glow-strong);
}

/* Interactive elements improvements */
button, a, [role="button"] {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Focus states */
*:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
  transition: outline 0.2s ease;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: var(--background);
}

::-webkit-scrollbar-thumb {
  background: rgba(37, 99, 235, 0.3);
  border-radius: 6px;
  border: 2px solid var(--background);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(37, 99, 235, 0.5);
}

/* Selection */
::selection {
  background: rgba(37, 99, 235, 0.2);
  color: var(--primary);
}
```

#### Fichier 2: `apps/dashboard/tailwind.config.ts`
**Objectif**: Étendre Tailwind avec les nouveaux tokens

**Modifications**:
```typescript
// Ajouter dans theme.extend:
{
  colors: {
    'blue-pro': {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  boxShadow: {
    'glow': '0 0 32px rgba(37, 99, 235, 0.4)',
    'glow-strong': '0 0 48px rgba(37, 99, 235, 0.6)',
    'pro-sm': '0 2px 8px -2px rgba(37, 99, 235, 0.1), 0 4px 16px -4px rgba(0, 0, 0, 0.05)',
    'pro-md': '0 4px 16px -4px rgba(37, 99, 235, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.1)',
    'pro-lg': '0 8px 32px -8px rgba(37, 99, 235, 0.2), 0 16px 48px -12px rgba(0, 0, 0, 0.15)',
    'pro-xl': '0 20px 48px -12px rgba(37, 99, 235, 0.25), 0 24px 64px -16px rgba(0, 0, 0, 0.2)',
  },
  animation: {
    'shimmer': 'shimmer 2s ease-in-out infinite',
    'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
    'float': 'float 3s ease-in-out infinite',
    'slide-in-bottom': 'slide-in-bottom 0.4s ease-out',
    'slide-in-left': 'slide-in-left 0.4s ease-out',
    'slide-in-right': 'slide-in-right 0.4s ease-out',
    'scale-in': 'scale-in 0.4s ease-out',
    'fade-in': 'fade-in 0.4s ease-out',
    'spin-smooth': 'spin-smooth 0.6s ease-in-out',
  },
  keyframes: {
    shimmer: {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
    'pulse-glow': {
      '0%, 100%': {
        boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.7)',
        transform: 'scale(1)',
      },
      '50%': {
        boxShadow: '0 0 0 8px rgba(37, 99, 235, 0)',
        transform: 'scale(1.05)',
      },
    },
    // ... autres keyframes
  },
}
```

### Phase 2: Composants UI Fondamentaux (Jour 3-4)

#### Fichier 3: `apps/dashboard/components/ui/button.tsx`
**Objectif**: Créer des boutons premium avec animations riches

**Nouveaux variants à ajouter**:
```typescript
gradient: "bg-gradient-to-br from-blue-600 to-blue-800 text-white hover:shadow-glow hover:scale-105 hover:-translate-y-0.5 active:scale-100 active:translate-y-0 transition-all duration-300",
gradientAccent: "bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:shadow-glow hover:scale-105 hover:-translate-y-0.5 active:scale-100 active:translate-y-0 transition-all duration-300",
glass: "glass-pro text-primary hover:bg-white/10 dark:hover:bg-white/5 border border-primary/20 hover:border-primary/40 transition-all duration-300",
shine: "relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
```

**Ajouter état loading**:
```typescript
{loading && (
  <svg className="animate-spin-smooth h-4 w-4" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)}
```

#### Fichier 4: `apps/dashboard/components/ui/card.tsx`
**Objectif**: Cards premium avec hover effects

**Nouveaux variants**:
```typescript
glass: "glass-pro hover-lift cursor-pointer",
gradient: "bg-gradient-to-br from-blue-600 to-blue-800 text-white hover-lift",
elevated: "bg-surface shadow-pro-md hover:shadow-pro-lg hover:-translate-y-2 transition-all duration-400 cursor-pointer",
glow: "bg-surface border-2 border-blue-500/20 hover:border-blue-500/40 hover:shadow-glow transition-all duration-400",
```

#### Fichier 5: `apps/dashboard/components/ui/spinner.tsx` (NOUVEAU)
**Objectif**: Loader branded pour états de chargement

```typescript
import React from 'react';
import { cn } from './utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'accent' | 'white';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const variantClasses = {
  primary: 'text-blue-600',
  accent: 'text-cyan-500',
  white: 'text-white',
};

export function Spinner({ size = 'md', variant = 'primary', className }: SpinnerProps) {
  return (
    <div className={cn('inline-block', sizeClasses[size], variantClasses[variant], className)}>
      {/* Gradient spinner from uiverse.io */}
      <svg className="animate-spin-smooth" viewBox="0 0 50 50">
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle
          className="opacity-25"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="url(#spinner-gradient)"
          strokeWidth="4"
          strokeDasharray="80 60"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
```

#### Fichier 6: `apps/dashboard/components/ui/input.tsx`
**Objectif**: Inputs professionnels avec floating labels

**Refactor complet** basé sur uiverse.io:
```typescript
// Wrapper avec floating label
<div className="relative group">
  <input
    className={cn(
      "peer h-12 w-full rounded-xl border-2 border-gray-200",
      "bg-transparent px-4 pt-4 pb-1 text-base",
      "outline-none transition-all duration-300",
      "focus:border-blue-600 focus:shadow-pro-md",
      "dark:border-gray-700 dark:focus:border-blue-500",
      "placeholder-transparent",
      className
    )}
    placeholder=" "
    {...props}
  />
  <label
    className={cn(
      "absolute left-4 top-1/2 -translate-y-1/2",
      "text-gray-500 text-base pointer-events-none",
      "transition-all duration-300",
      "peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600",
      "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs",
      "dark:text-gray-400 dark:peer-focus:text-blue-400"
    )}
  >
    {label}
  </label>
  {/* Icon support */}
  {icon && (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </div>
  )}
</div>
```

### Phase 3: Layout & Navigation (Jour 5-6)

#### Fichier 7: `apps/dashboard/components/dashboard/DashboardLayout.tsx`
**Objectif**: Layout enterprise-grade avec sidebar amélioré

**Améliorations**:
1. Sidebar width: 280px (expanded), 80px (collapsed)
2. Active state avec gradient + glow
3. Hover effects sur menu items
4. Badge notifications
5. Search bar en haut avec glassmorphism
6. User profile dropdown en bas

**Code clé**:
```typescript
// Active nav item avec gradient
<button
  className={cn(
    "relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl",
    "transition-all duration-300 group",
    isActive
      ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-glow"
      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
  )}
>
  {/* Glow effect pour active */}
  {isActive && (
    <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
  )}

  <Icon className={cn(
    "h-5 w-5 transition-transform duration-300",
    isActive && "scale-110"
  )} />

  {!collapsed && (
    <>
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse-glow">
          {badge}
        </span>
      )}
    </>
  )}
</button>
```

### Phase 4: Dashboard Pages (Jour 7-12)

#### Fichier 8: `apps/dashboard/components/dashboard/DeveloperDashboard.tsx`
**Objectif**: Dashboard developer avec hero section et stats animées

**Structure**:
```tsx
<motion.div
  variants={pageVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  className="space-y-8 p-8"
>
  {/* Hero Section avec gradient */}
  <motion.div
    variants={cardVariants}
    className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 text-white shadow-pro-xl"
  >
    <div className="relative z-10">
      <h1 className="text-4xl font-bold mb-2">
        Welcome back, {user.name}
      </h1>
      <p className="text-blue-100 text-lg">
        Your code quality dashboard
      </p>
    </div>

    {/* Animated background pattern */}
    <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" />
  </motion.div>

  {/* KPI Grid avec animated counters */}
  <motion.div
    variants={staggerContainer}
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
  >
    {stats.map((stat) => (
      <motion.div
        key={stat.label}
        variants={cardVariants}
        className="bg-surface rounded-2xl p-6 shadow-pro-md hover:shadow-pro-lg hover:-translate-y-2 transition-all duration-400 cursor-pointer border border-gray-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-br",
            stat.color === 'blue' && "from-blue-500 to-blue-700",
            stat.color === 'green' && "from-green-500 to-green-700",
            stat.color === 'amber' && "from-amber-500 to-amber-700"
          )}>
            <stat.icon className="h-6 w-6 text-white" />
          </div>

          {/* Trend indicator */}
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-green-500 font-medium">+12%</span>
          </div>
        </div>

        <AnimatedCounter
          value={stat.value}
          className="text-3xl font-bold mb-1"
        />

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {stat.label}
        </p>
      </motion.div>
    ))}
  </motion.div>

  {/* Recent Analyses avec enhanced cards */}
  <motion.div variants={cardVariants}>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-semibold">Recent Analyses</h2>
      <Button variant="outline" size="sm">
        View All
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>

    <div className="space-y-4">
      {analyses.map((analysis, index) => (
        <motion.div
          key={analysis.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group bg-surface rounded-2xl p-6 shadow-pro-sm hover:shadow-pro-lg hover:-translate-y-1 transition-all duration-400 cursor-pointer border border-gray-200 dark:border-gray-800"
        >
          {/* Analysis card content */}
        </motion.div>
      ))}
    </div>
  </motion.div>
</motion.div>
```

#### Fichier 9: `apps/dashboard/components/dashboard/AnalysisList.tsx`
**Objectif**: Liste/grille d'analyses avec filtres avancés

**Améliorations**:
- Search bar avec glassmorphism
- Filter pills animés
- Grid/List view toggle
- Hover effects sur cards
- Bulk selection UI
- Export button

#### Fichier 10: `apps/dashboard/components/dashboard/AnnotatedDiff.tsx`
**Objectif**: Viewer de diff premium 3-colonnes

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  File Tree (280px)  │  Diff Viewer (flex)  │  AI Panel (400px) │
│  - Search           │  - Syntax highlight │  - Findings      │
│  - Filter           │  - Line numbers     │  - Severity      │
│  - Tree view        │  - Side-by-side     │  - Actions       │
│                     │  - Minimap          │  - Comments      │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Resizable panels avec react-resizable-panels
- Minimap navigation (inspired by VS Code)
- Collapsible unchanged sections
- Copy snippet buttons
- Finding markers in gutter
- Jump to finding

#### Fichier 11: `apps/dashboard/components/dashboard/GlobalReport.tsx`
**Objectif**: Rapport global avec charts animés

**Sections**:
1. Executive Summary (gradient hero)
2. Key Metrics (stat cards avec counters)
3. Charts (Recharts avec gradients)
4. Findings Breakdown (tables + charts)
5. Recommendations (cards avec icons)

#### Fichiers 12-17: Admin Pages
- `KnowledgeBase.tsx` - Card grid pour repos, drag-drop upload
- `Observability.tsx` - Real-time metrics, job queue viz
- `Integrations.tsx` - Integration cards avec status
- `PoliciesRules.tsx` - Policy editor avec syntax highlighting
- `UserManagement.tsx` - User table avec avatars
- `AIModelSettings.tsx` - Model selector avec pricing

#### Fichiers 18-20: Reviewer Pages
- `ReviewerDashboard.tsx` - KPIs, SLA tracking, queue widgets
- `ReviewQueue.tsx` - Kanban board avec drag-drop
- `MetricsCharts.tsx` - Performance charts avec trends

### Phase 5: Composants Partagés Avancés (Jour 13-14)

#### Fichier 21: `apps/dashboard/components/ui/animated-counter.tsx` (NOUVEAU)
```typescript
export function AnimatedCounter({ value, duration = 2000 }: Props) {
  // Counter avec ease-out cubic
}
```

#### Fichier 22: `apps/dashboard/components/ui/stat-card.tsx` (NOUVEAU)
```typescript
export function StatCard({ icon, label, value, trend, color }: Props) {
  // Card de stat réutilisable avec icon gradient, counter animé, trend
}
```

#### Fichier 23: `apps/dashboard/components/ui/badge.tsx`
**Ajouter variants**:
```typescript
gradient: "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow",
pulse: "bg-red-500 text-white animate-pulse-glow",
outline: "border-2 border-current bg-transparent",
```

#### Fichier 24: `apps/dashboard/components/ui/progress.tsx`
**Enhanced progress bar**:
```typescript
<div className="relative h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
  <motion.div
    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-glow"
    initial={{ width: 0 }}
    animate={{ width: `${value}%` }}
    transition={{ duration: 1, ease: "easeOut" }}
  />
  {showLabel && (
    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
      {value}%
    </span>
  )}
</div>
```

#### Fichier 25: `apps/dashboard/components/ui/tooltip.tsx`
**Enhanced avec animation**

#### Fichier 26: `apps/dashboard/components/ui/select.tsx`
**Enhanced dropdown avec search**

#### Fichier 27: `apps/dashboard/components/ui/dialog.tsx`
**Enhanced modal avec backdrop blur**

### Phase 6: Polish & Performance (Jour 15-16)

1. **Dark mode refinement**
   - Ajuster contrasts
   - Vérifier shadows
   - Tester toutes les pages

2. **Animations polish**
   - Stagger timings
   - Reduce motion support
   - Performance profiling

3. **Accessibility**
   - Focus indicators
   - ARIA labels
   - Keyboard navigation
   - Screen reader tests

4. **Performance**
   - Lazy load components
   - Memoize expensive renders
   - Code splitting
   - Image optimization

5. **Responsive testing**
   - Mobile layouts
   - Tablet layouts
   - Wide screens
   - Touch interactions

---

## 📦 Composants uiverse.io - Guides d'Intégration

### Button avec Shiny Effect
**Source**: https://uiverse.io/AmitPA517/stupid-ray-30

```tsx
// Ajouter variant "shine" au Button component
shine: "relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 hover:shadow-glow hover:scale-105 transition-all duration-300",
```

### Card avec Glassmorphism
**Source**: https://uiverse.io/coheydev/tender-cobra-4

```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(37, 99, 235, 0.15);
}
```

### Input avec Floating Label
**Source**: https://uiverse.io/abrahamcalsin/afraid-starfish-83

```tsx
<div className="relative group">
  <input
    className="peer h-12 w-full rounded-xl border-2 border-gray-200 bg-transparent px-4 pt-4 pb-1 outline-none transition-all focus:border-blue-600 focus:shadow-pro-md placeholder-transparent"
    placeholder=" "
  />
  <label className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-all peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs">
    Label
  </label>
</div>
```

### Loader Gradient Spinner
**Source**: https://uiverse.io/cssbuttons-io/unlucky-dog-59

```tsx
<svg className="animate-spin-smooth h-8 w-8" viewBox="0 0 50 50">
  <defs>
    <linearGradient id="spinner-grad">
      <stop offset="0%" stopColor="#2563eb" />
      <stop offset="100%" stopColor="#0ea5e9" />
    </linearGradient>
  </defs>
  <circle cx="25" cy="25" r="20" fill="none" stroke="url(#spinner-grad)" strokeWidth="4" strokeDasharray="80 60" strokeLinecap="round" />
</svg>
```

### Badge avec Pulse
**Source**: https://uiverse.io/vinodjangid07/weak-fox-91

```css
.badge-pulse {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
    transform: scale(1.05);
  }
}
```

---

## ✅ Checklist d'Implémentation

### Phase 1: Foundation ✓
- [ ] `globals.css` - Tokens CSS (couleurs, gradients, shadows, animations)
- [ ] `tailwind.config.ts` - Extension Tailwind
- [ ] `button.tsx` - Nouveaux variants (gradient, glass, shine)
- [ ] `card.tsx` - Nouveaux variants (glass, elevated, glow)
- [ ] `spinner.tsx` - Nouveau composant loader
- [ ] `input.tsx` - Refactor avec floating label

### Phase 2: Layout ✓
- [ ] `DashboardLayout.tsx` - Sidebar enhanced (280px, gradient active, badges)
- [ ] Search bar glassmorphism
- [ ] User profile dropdown
- [ ] Navigation animations

### Phase 3: Dashboard Developer ✓
- [ ] `DeveloperDashboard.tsx` - Hero section gradient
- [ ] Stat cards avec animated counters
- [ ] Recent analyses cards enhanced
- [ ] Quick actions panel
- [ ] `stat-card.tsx` composant réutilisable
- [ ] `animated-counter.tsx` composant

### Phase 4: Analyses ✓
- [ ] `AnalysisList.tsx` - Grid/List view
- [ ] Search bar enhanced
- [ ] Filter pills animés
- [ ] Card hover effects
- [ ] Bulk selection UI
- [ ] Export functionality

### Phase 5: Diff Viewer ✓
- [ ] `AnnotatedDiff.tsx` - Layout 3 colonnes
- [ ] File tree avec search
- [ ] Syntax highlighting amélioré
- [ ] Minimap navigation
- [ ] AI findings panel collapsible
- [ ] Finding cards avec actions
- [ ] Copy snippet buttons

### Phase 6: Reports ✓
- [ ] `GlobalReport.tsx` - Executive summary
- [ ] Animated charts avec Recharts
- [ ] Gradient fills
- [ ] Export/print functionality
- [ ] Findings breakdown tables

### Phase 7: Admin Pages ✓
- [ ] `KnowledgeBase.tsx` - Card grid, drag-drop upload
- [ ] `Observability.tsx` - Real-time metrics dashboard
- [ ] `Integrations.tsx` - Integration cards
- [ ] `PoliciesRules.tsx` - Policy editor
- [ ] `UserManagement.tsx` - User table enhanced
- [ ] `AIModelSettings.tsx` - Model selector

### Phase 8: Reviewer Pages ✓
- [ ] `ReviewerDashboard.tsx` - KPIs + SLA widgets
- [ ] `ReviewQueue.tsx` - Kanban board
- [ ] `MetricsCharts.tsx` - Performance charts

### Phase 9: Shared Components ✓
- [ ] `badge.tsx` - Nouveaux variants (gradient, pulse)
- [ ] `progress.tsx` - Gradient fill, circular variant
- [ ] `tooltip.tsx` - Animations enhanced
- [ ] `select.tsx` - Multi-select, search
- [ ] `dialog.tsx` - Backdrop blur, scale animation
- [ ] `table.tsx` - Zebra, hover lift, sticky header

### Phase 10: Polish ✓
- [ ] Dark mode refinement (tous les composants)
- [ ] Animation timings optimization
- [ ] Accessibility audit (focus, ARIA, keyboard)
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] Performance optimization (lazy load, code split)
- [ ] Reduce motion support
- [ ] Cross-browser testing

---

## 🎯 Résumé Exécutif

### Ce qui sera fait
1. **Redesign complet** de toutes les pages dashboard (sauf landing page)
2. **Palette bleue professionnelle** (#2563eb, #1e40af, #3b82f6) pour inspirer confiance
3. **Composants uiverse.io** directement intégrés (buttons, cards, inputs, loaders, badges)
4. **Animations riches** partout (hover effects, transitions, counters, micro-interactions)
5. **Design enterprise-grade** avec glassmorphism, gradients, shadows avancées
6. **Icônes contextuelles** pour AI/code review (Lucide + Iconsax)
7. **Dark mode raffiné** avec contrasts améliorés
8. **Layout cohérent** avec sidebar 280px, navigation gradient, badges notifications
9. **Composants réutilisables** (stat-card, animated-counter, spinner, etc.)
10. **Performance optimisée** avec lazy loading et code splitting

### Ce qui sera préservé
- Landing page (app/page.tsx)
- Pages marketing dynamiques (app/[slug]/page.tsx)
- Shell d'authentification
- Architecture Next.js + Tailwind + shadcn existante
- Framer Motion pour animations
- Toutes les fonctionnalités existantes

### Durée estimée
**16 jours** de travail concentré pour un redesign complet, professionnel et cohérent.

### Impact attendu
- ✨ Expérience visuelle premium niveau entreprise
- 🎨 Identité de marque forte et cohérente
- 🚀 Attraction client maximisée visuellement
- 💼 Crédibilité professionnelle renforcée
- ⚡ Animations engageantes sans compromettre la performance
- 🎯 Différenciation claire sur le marché SaaS B2B

---

**Plan validé et prêt pour implémentation.**
