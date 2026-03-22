# Icônes Iconsax - Guide d'utilisation

Ce guide explique comment utiliser les icônes Iconsax dans le projet AI Code Review Platform.

## 🎯 Vue d'ensemble

Le projet utilise maintenant la bibliothèque **Iconsax React** en complément des icônes Lucide existantes. Iconsax offre plus de 1000 icônes avec 6 variantes différentes pour chaque icône.

## 📦 Installation

La bibliothèque `iconsax-react` a été installée et configurée :

```bash
npm install iconsax-react
```

## 🏗️ Architecture

### 1. Composant wrapper (`components/ui/iconsax-icon.tsx`)

Composant de base qui gère la taille, les variantes et les couleurs des icônes Iconsax.

```tsx
import { IconsaxIcon } from "@/components/ui/iconsax-icon";
import { SecuritySafe } from "iconsax-react";

<IconsaxIcon 
  Icon={SecuritySafe}
  variant="Bold"
  size="lg"
  color="rgb(59, 130, 246)"
/>
```

### 2. Registre d'icônes (`lib/iconsax-registry.ts`)

Centralise toutes les icônes utilisées dans le projet pour une meilleure organisation.

### 3. Composant facile (`components/ui/icon.tsx`)

Composant simplifié utilisant le registre :

```tsx
import { Icon } from "@/components/ui/icon";

<Icon name="security" variant="Bold" size="lg" />
```

## 🎨 Variantes disponibles

Chaque icône Iconsax propose 6 variantes :

- **Linear** : Style trait fin (par défaut)
- **Outline** : Contour épais
- **Bold** : Style gras
- **Bulk** : Rempli avec transparence
- **TwoTone** : Deux tons de couleur
- **Broken** : Style discontinu

## 📏 Tailles disponibles

- `sm` : 12x12px (`h-3 w-3`)
- `default` : 16x16px (`h-4 w-4`)
- `lg` : 20x20px (`h-5 w-5`)
- `xl` : 24x24px (`h-6 w-6`)
- `icon` : 16x16px (`h-4 w-4`)

## 🔧 Utilisation pratique

### Icônes de base

```tsx
// Icône simple
<Icon name="home" />

// Avec variante et taille
<Icon name="security" variant="Bold" size="lg" />

// Avec couleur personnalisée
<Icon name="success" variant="Bold" color="rgb(34, 197, 94)" />
```

### Dans les boutons

```tsx
<Button className="gap-2">
  <Icon name="add" variant="Bold" />
  Ajouter
</Button>

<Button variant="destructive" className="gap-2">
  <Icon name="delete" variant="Bold" />
  Supprimer
</Button>
```

### Dans la navigation

```tsx
<div className="flex items-center gap-3">
  <Icon name="dashboard" variant="Bold" color="rgb(147, 51, 234)" />
  <span>Dashboard</span>
</div>
```

## 📚 Icônes disponibles dans le registre

### Sécurité & Analyses
- `security`, `shield`, `bug`, `danger`, `info`, `success`, `error`, `warning`
- `chart`, `graph`, `activity`, `flash`

### Navigation  
- `home`, `dashboard`, `building`, `database`, `profile`, `users`, `settings`

### Actions
- `add`, `edit`, `delete`, `refresh`, `import`, `export`, `search`, `download`

### Fichiers & Code
- `code`, `documentCode`, `folder`, `globe`, `gitBranch`, `quote`, `codeCircle`

### Interface utilisateur
- `arrowRight`, `arrowLeft`, `arrowUp`, `arrowDown`, `more`, `show`, `hide`

## 🎯 Exemples d'usage par contexte

### Statuts et alertes

```tsx
// Succès
<Icon name="success" variant="Bold" color="rgb(34, 197, 94)" />

// Erreur  
<Icon name="error" variant="Bold" color="rgb(239, 68, 68)" />

// Attention
<Icon name="warning" variant="Bold" color="rgb(245, 158, 11)" />

// Information
<Icon name="info" variant="Bold" color="rgb(59, 130, 246)" />
```

### Actions utilisateur

```tsx
// Boutons d'action
<Button size="sm" className="gap-2">
  <Icon name="add" variant="Bold" />
  Créer
</Button>

<Button variant="secondary" className="gap-2">
  <Icon name="edit" variant="Linear" />  
  Modifier
</Button>

<Button variant="outline" className="gap-2">
  <Icon name="refresh" variant="Linear" />
  Actualiser
</Button>
```

### Navigation et menus

```tsx
// Menu principal
<nav className="space-y-1">
  <MenuItem href="/dashboard" icon="dashboard" variant="Bold">
    Dashboard  
  </MenuItem>
  <MenuItem href="/users" icon="users" variant="Linear">
    Utilisateurs
  </MenuItem>
  <MenuItem href="/settings" icon="settings" variant="Outline">
    Paramètres
  </MenuItem>
</nav>
```

## 🧪 Page de test

Une page de démonstration est disponible à `/test-icons` pour visualiser toutes les icônes et leurs variantes.

## 🔄 Migration depuis Lucide

Pour migrer une icône Lucide vers Iconsax :

```tsx
// Avant (Lucide)
import { Shield } from "lucide-react";
<Shield className="h-4 w-4" />

// Après (Iconsax)
import { Icon } from "@/components/ui/icon";
<Icon name="shield" variant="Bold" />
```

## 🎨 Intégration avec Tailwind

Les icônes s'intègrent parfaitement avec les classes Tailwind :

```tsx
<Icon 
  name="security" 
  variant="Bold" 
  className="text-blue-600 hover:text-blue-700 transition-colors"
/>
```

## 📱 Responsive

```tsx
<Icon 
  name="dashboard" 
  size="default"
  className="md:h-5 md:w-5 lg:h-6 lg:w-6"
/>
```

## ✨ Conseils d'utilisation

1. **Cohérence** : Utilisez les mêmes variantes pour des contextes similaires
2. **Lisibilité** : `Bold` et `Outline` sont plus lisibles en petite taille
3. **Performance** : Le registre évite les imports multiples
4. **Couleurs** : Utilisez les couleurs Tailwind ou des valeurs RGB explicites
5. **Accessibilité** : Ajoutez toujours des labels appropriés

## 🔧 Ajout d'nouvelles icônes

Pour ajouter une nouvelle icône au registre :

1. Importez l'icône dans `lib/iconsax-registry.ts`
2. Ajoutez-la à l'objet `iconsaxRegistry`  
3. Mettez à jour le type `IconsaxName`

```tsx
// Dans iconsax-registry.ts
import { NewIcon } from "iconsax-react";

export const iconsaxRegistry = {
  // ... autres icônes
  newIcon: NewIcon,
} as const;
```

---

## 🚀 Prochaines étapes

1. Migrer progressivement certaines icônes Lucide vers Iconsax
2. Créer des composants spécialisés (StatusIcon, ActionIcon, etc.)
3. Ajouter des animations avec Framer Motion
4. Créer un système de thèmes pour les couleurs d'icônes