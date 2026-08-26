---
name: Heritage Harvest
colors:
  surface: '#f7faf5'
  surface-dim: '#d8dbd6'
  surface-bright: '#f7faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f0'
  surface-container: '#ecefea'
  surface-container-high: '#e6e9e4'
  surface-container-highest: '#e0e3df'
  on-surface: '#191c1a'
  on-surface-variant: '#414844'
  inverse-surface: '#2d312e'
  inverse-on-surface: '#eff2ed'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#645e49'
  on-secondary: '#ffffff'
  secondary-container: '#e8dfc5'
  on-secondary-container: '#68634d'
  tertiary: '#3b1f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#56340e'
  on-tertiary-container: '#cd9d6d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#ebe2c8'
  secondary-fixed-dim: '#cec6ad'
  on-secondary-fixed: '#1f1c0b'
  on-secondary-fixed-variant: '#4c4733'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#f0bd8b'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#623f18'
  background: '#f7faf5'
  on-background: '#191c1a'
  surface-variant: '#e0e3df'
typography:
  headline-xl:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-sm:
    fontFamily: Source Serif 4
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
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
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style

The design system is built for an agricultural non-profit, emphasizing trust, growth, and community. The aesthetic leans into **Modern Classicism**, blending the authoritative presence of editorial design with the warmth of organic, natural elements. 

The brand personality is grounded and reliable, yet forward-thinking. It avoids the clinical feel of high-tech SaaS, opting instead for a tactile, editorial atmosphere that feels as established as the soil itself. By utilizing high-quality serif typography and generous whitespace, the UI evokes a sense of prestige and institutional stability, ensuring farmers and donors alike feel a deep sense of security and purpose.

## Colors

The color palette is derived directly from the earth and the foundation's legacy. 

- **Primary (Forest Green):** A deep, saturated green that represents growth, stability, and the agricultural heart of the organization. It is used for primary actions, headers, and brand-heavy backgrounds.
- **Secondary (Cream):** A warm, off-white alternative to pure white. It softens the interface, reducing eye strain and providing a "paper-like" editorial feel.
- **Tertiary (Ochre/Earthy Brown):** Used sparingly for accents, highlights, or secondary calls to action to ground the palette.
- **Neutral (Charcoal Green):** Used for body text and iconography to maintain legibility while staying within the organic color family.

Always prioritize high contrast between the Forest Green and Cream to ensure accessibility for all users.

## Typography

This design system uses a sophisticated typographic pairing to balance tradition and utility. 

**Source Serif 4** is utilized for headlines to convey authority, wisdom, and a literary quality. Its sturdy serifs remain legible even on lower-resolution screens common in rural areas. 

**Plus Jakarta Sans** provides a friendly, modern counterpoint for body copy and UI labels. Its soft curves echo the "organic" brand pillars while ensuring high legibility for technical information and data. 

Scale headlines down aggressively on mobile to ensure content remains the focus and vertical scrolling is manageable. Use the uppercase label style for section headers to provide clear visual signposts.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. Content is centered within a maximum container width of 1200px to maintain readability. 

- **Grid:** Use a 12-column grid for desktop and a 4-column grid for mobile. 
- **Rhythm:** An 8px base unit drives all spacing. 
- **Whitespace:** This design system mandates "Generous Whitespace." Do not crowd elements. Use `section-gap` to clearly demarcate different content areas, allowing the UI to "breathe" like an open field.
- **Safe Areas:** On mobile, maintain a minimum 16px margin to prevent content from hitting the screen edges.

## Elevation & Depth

To maintain a grounded and tactile feel, the design system avoids heavy shadows or artificial depth. Instead, it uses **Tonal Layering** and **Soft Containment**.

- **Surface Tiers:** Use the Secondary (Cream) color as the base. Use subtle variations or very thin (1px) borders in a slightly darker cream or muted green to define containers.
- **Low-Contrast Outlines:** Instead of shadows, use 1px solid strokes in `#D4A373` (Ochre) or a 10% opacity version of the Primary Green to define cards and input fields.
- **Depth through Overlap:** Create a sense of physical layering by allowing images or organic shapes to slightly overlap container boundaries, mimicking a collage or editorial layout.

## Shapes

The shape language is "Organic Geometric." While the structural grid is rigid, the elements themselves use soft, approachable corners to reflect natural forms.

- **Base Radius:** Standard UI components (buttons, inputs) use a 0.5rem (8px) radius.
- **Large Elements:** Cards and image containers should use the `rounded-xl` (1.5rem) setting to feel more friendly and modern.
- **Organic Accents:** Use "blob" or "leaf" shapes as background decorative elements behind text or images to reinforce the agricultural theme. These should be subtle, using low-opacity secondary colors.

## Components

### Buttons
- **Primary:** Solid Forest Green background with Cream text. High contrast, rectangular with slightly rounded corners (8px).
- **Secondary:** Outlined Forest Green (1px) with Forest Green text.
- **Tertiary:** Cream background with Forest Green text for use on dark imagery.

### Input Fields
- Use a "Soft Trough" look: Cream background with a thin Charcoal Green bottom border or a full subtle outline. Focus states should transition the border to the Primary Forest Green.

### Cards
- Cards should have no shadow. Use a 1px border in a muted earth tone. Ensure internal padding is generous (at least 24px) to maintain the "open" feel of the brand.

### Chips & Badges
- Use pill-shaped (rounded-full) containers. For status indicators, use muted earthy tones rather than harsh system reds or blues to keep the palette harmonious.

### Lists
- Use custom iconography for list bullets, such as a stylized grain stalk or leaf icon, rather than standard dots, to reinforce brand identity.

### Image Treatment
- Use slightly desaturated photography with warm highlights. Apply the `rounded-xl` corner radius to all hero and featured images.