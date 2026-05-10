---
name: Premium Culinary System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bbcbb8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#869583'
  outline-variant: '#3c4a3c'
  surface-tint: '#3ce36a'
  primary: '#3fe56c'
  on-primary: '#003912'
  primary-container: '#00c853'
  on-primary-container: '#004c1b'
  inverse-primary: '#006e2a'
  secondary: '#c8c6c6'
  on-secondary: '#303030'
  secondary-container: '#474747'
  on-secondary-container: '#b6b5b4'
  tertiary: '#fdbf02'
  on-tertiary: '#3f2e00'
  tertiary-container: '#dba500'
  on-tertiary-container: '#543e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#69ff87'
  primary-fixed-dim: '#3ce36a'
  on-primary-fixed: '#002108'
  on-primary-fixed-variant: '#00531e'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#ffdf9e'
  tertiary-fixed-dim: '#fabd00'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5b4300'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Work Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -1px
  headline-md:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-edge: 20px
---

## Brand & Style

The design system is anchored in a **Modern / Corporate** aesthetic with a strong emphasis on high-contrast visuals to evoke a sense of premium quality and culinary appeal. The target audience is discerning users who value efficiency and sophistication.

The emotional response is intended to be "sleek and appetizing." By pairing deep, dark canvases with high-saturation emerald accents, the interface draws immediate attention to key actions and high-quality food photography. The style utilizes clean lines and generous white space (or "dark space") to maintain a clutter-free environment that feels both professional and inviting.

## Colors

The palette is designed for a high-contrast dark mode experience.
- **Primary:** An energetic Emerald Green (#00C853) used exclusively for primary calls-to-action, success states, and brand-critical highlights.
- **Neutral/Background:** A deep charcoal (#121212) serves as the foundation, providing a "true dark" canvas that makes imagery pop.
- **Surface/Secondary:** A lighter charcoal (#1E1E1E to #2D2D2D) is used for cards and elevated containers to create depth.
- **Tertiary:** A warm amber is utilized sparingly for ratings and utilitarian highlights.
- **Typography:** Pure white (#FFFFFF) for primary headers and a muted grey (#A0A0A0) for secondary metadata to maintain hierarchy.

## Typography

The design system utilizes **Work Sans** across all levels to maintain a professional, grounded, and highly legible tone. 

- **Headlines:** Use heavy weights (600-700) with slightly tightened letter spacing for a punchy, editorial feel. 
- **Body Text:** Standard weight (400) with generous line heights to ensure readability against dark backgrounds.
- **Labels:** Medium weights (500) are used for buttons, navigation, and tags, often in uppercase or with increased tracking for functional clarity.

## Layout & Spacing

This design system follows a **fluid grid** model optimized for mobile-first environments. 

- **Grid:** A 4-column or 12-column responsive grid with 16px gutters.
- **Rhythm:** An 8px base unit drives all spatial relationships. 
- **Margins:** Screen edges maintain a consistent 20px padding to ensure content does not feel cramped.
- **Vertical Spacing:** Use larger increments (24px or 32px) between distinct content sections to reinforce grouping, while using smaller increments (8px or 12px) for elements within a single card.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** supplemented by subtle ambient shadows.

- **Level 0 (Background):** Pure charcoal (#121212).
- **Level 1 (Cards/Surface):** Dark grey (#1E1E1E). These elements use a subtle 1px border (#2D2D2D) instead of heavy shadows to maintain a sleek look.
- **Level 2 (Modals/Popups):** Slightly lighter (#2D2D2D) with a diffused shadow (0px 8px 24px rgba(0,0,0,0.5)) to create a physical sense of "floating" over the interface.
- **Depth through Imagery:** Use soft black-to-transparent gradients over product photography to ensure white text remains legible when overlaid on images.

## Shapes

The shape language is consistently **Rounded**, providing a soft, approachable feel to the premium aesthetic.

- **Base Radius:** 16px (1rem) for primary cards and large containers.
- **Small Radius:** 8px (0.5rem) for smaller elements like input fields and secondary buttons.
- **Pill Radius:** 100px for selection chips, tags, and "Add" buttons to provide a distinct interactive affordance.

## Components

- **Buttons:** Primary buttons are solid Emerald Green (#00C853) with white or near-black bold text. Secondary buttons use a dark outline or a subtle grey fill.
- **Cards:** Content-rich cards must feature the 16px corner radius. Food imagery should occupy the top half of the card, using a subtle inner shadow or gradient for text overlay protection.
- **Selection Controls:** Toggle segments use a high-contrast treatment (Primary color for active state, Dark Charcoal for inactive).
- **Inputs:** Dark grey backgrounds (#1E1E1E) with subtle 1px borders. Focus states should trigger a primary emerald border glow.
- **Chips/Tags:** Small, pill-shaped elements used for categories (e.g., "Delivery", "Spicy"). Use low-opacity tints of the primary color for background fills.
- **Quantity Pickers:** Compact horizontal controls with distinct "+" and "-" icons, utilizing the primary emerald color for active increments.