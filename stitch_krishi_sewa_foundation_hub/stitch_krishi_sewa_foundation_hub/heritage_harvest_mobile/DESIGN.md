---
name: Heritage Harvest Mobile
colors:
  surface: '#f8faf6'
  surface-dim: '#d9dad7'
  surface-bright: '#f8faf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f0'
  surface-container: '#ecefea'
  surface-container-high: '#e7e9e5'
  surface-container-highest: '#e1e3df'
  on-surface: '#191c1a'
  on-surface-variant: '#414844'
  inverse-surface: '#2e312f'
  inverse-on-surface: '#f0f1ed'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#5b5f5c'
  on-secondary: '#ffffff'
  secondary-container: '#daded9'
  on-secondary-container: '#5e625e'
  tertiary: '#3c1f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#56340e'
  on-tertiary-container: '#ce9c6e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#e0e3df'
  secondary-fixed-dim: '#c4c7c3'
  on-secondary-fixed: '#181c1a'
  on-secondary-fixed-variant: '#444844'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#f1bc8b'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#633f18'
  background: '#f8faf6'
  on-background: '#191c1a'
  surface-variant: '#e1e3df'
  outline-muted: '#c1c8c2'
  accent-ochre: '#cd9d6d'
typography:
  headline-xl:
    fontFamily: Source Serif 4
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 16px
  gutter-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  section-gap-mobile: 48px
---

## Brand & Style
The design system for the mobile experience shifts toward **Modern Classicism** with an emphasis on tactile editorial quality. It targets a community-centric agricultural audience, evoking feelings of trust, organic growth, and institutional stability. 

The visual style is characterized by high-quality serif typography and a "paper-like" interface. On mobile devices, the design avoids heavy artificial shadows, opting for a clean, structured layout that feels grounded and reliable. The aesthetic is sophisticated yet accessible, bridging the gap between traditional farming values and modern digital efficiency.

## Colors
The palette is rooted in an earthy, forest-inspired spectrum. 

- **Primary (#1b4332):** The signature Forest Green. This is the cornerstone of the brand, used for critical actions, headers, and navigation elements.
- **Secondary (#f7faf5):** A warm, cream-based surface color that provides an editorial, less-strained reading experience than pure white.
- **Tertiary (#56340e):** An earthy brown used for grounding accents and secondary highlights.
- **Neutral (#191c1a):** A deep charcoal green used for text and iconography to maintain a soft but high-contrast legibility.

Maintain high contrast between Forest Green and the Cream surfaces to ensure accessibility in outdoor lighting conditions often encountered by the target audience.

## Typography
The typographic strategy balances the authoritative, literary weight of **Source Serif 4** for headlines with the modern, friendly clarity of **Plus Jakarta Sans** for body copy.

For the mobile adaptation, font sizes are scaled down and line heights are tightened to preserve vertical space without sacrificing readability. Use `headline-lg` as the primary page header. `label` styles should be used in uppercase for section headers and categorization to provide clear visual signposts in a condensed viewport.

## Layout & Spacing
This design system utilizes a **Fluid Grid** for mobile, optimized for a 4-column layout. 

The rhythm is dictated by an 8px base unit. On mobile devices, the side margins are reduced to 16px to maximize the available width for content. Use generous `section-gap-mobile` (48px) between major content blocks to maintain the brand's "open field" philosophy, ensuring the interface never feels cluttered or claustrophobic.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Soft Containment** rather than shadows. 

- **Surface Tiers:** Use subtle shifts from the base Cream color to slightly darker container tones (#ecefea) to define nested content.
- **Low-Contrast Outlines:** Apply 1px solid borders in muted tones (#c1c8c2) for cards and inputs. This keeps the UI flat and tactile, resembling paper.
- **Visual Overlap:** For hero sections or featured content, allow images with rounded corners to slightly overlap background color blocks to create a physical, layered effect.

## Shapes
The shape language is "Organic Geometric." Standard components like buttons and input fields utilize a 0.5rem (8px) radius to feel approachable. Larger containers, such as cards and featured images, should use `rounded-xl` (1.5rem) to reinforce the soft, natural brand pillars. Decorative background elements may use organic "leaf" or "blob" shapes with low opacity to add a layer of brand personality without distracting from the content.

## Components

### Buttons
- **Primary:** Solid Forest Green (#1b4332) with Cream text. Rectangular with 8px rounded corners.
- **Secondary:** 1px Forest Green outline with matching text for less urgent actions.
- **Tertiary:** Cream background with Forest Green text, ideal for placement over dark image overlays.

### Input Fields
- Styled with a "Soft Trough" appearance: a light cream background with a 1px muted outline. On focus, the border transitions to a solid Forest Green.

### Cards
- Cards must not have shadows. Define boundaries using 1px muted earth-tone borders. Internal padding on mobile should be a minimum of 16px to 24px to ensure the content feels airy.

### Chips & Badges
- Fully rounded (pill-shaped). Use muted tertiary colors (Ochre/Brown) for status indicators to keep the interface harmonious and avoid harsh "system" colors.

### Lists
- Replace standard bullets with branded iconography, such as small stylized leaf or grain icons, to reinforce the agricultural theme.

### Image Treatment
- All images should feature `rounded-xl` corners. Photography should lean towards warm, natural lighting with a slight desaturation to match the editorial aesthetic.