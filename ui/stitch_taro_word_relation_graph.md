---
name: Word Graph
colors:
  surface: '#faf9fe'
  surface-dim: '#dad9df'
  surface-bright: '#faf9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf3'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#414755'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#4c4aca'
  on-secondary: '#ffffff'
  secondary-container: '#6664e4'
  on-secondary-container: '#fffbff'
  tertiary: '#9e3d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c64f00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c2c1ff'
  on-secondary-fixed: '#0c006a'
  on-secondary-fixed-variant: '#3631b4'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb595'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#faf9fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  nav-title:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.41px
  large-title:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: 0.37px
  headline:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.41px
  body:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.41px
  callout:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: -0.32px
  subheadline:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.24px
  footnote:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.08px
  caption-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 13px
    letterSpacing: 0.06px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-main: 16px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  safe-area-inset: constant(safe-area-inset-bottom)
---

## Brand & Style
The design system is rooted in the **Corporate / Modern** aesthetic, specifically adhering to the Human Interface Guidelines (HIG). It prioritizes clarity, deference to content, and a sense of "native" belonging within the iOS ecosystem. The brand personality is intellectual yet accessible—acting as a high-performance utility for linguists and casual learners alike. 

The interface leverages high-contrast elements and generous whitespace to reduce cognitive load when navigating complex linguistic networks. The user experience should feel lightweight and instantaneous, evoking an emotional response of organized discovery.

## Colors
This design system utilizes a high-contrast palette centered on Apple’s system colors. The primary 'Apple Blue' is reserved strictly for interactive elements like buttons, active states, and links. 

Semantic colors are mapped to linguistic relationships to provide immediate visual categorization:
- **Synonyms:** Apple Green (#34C759) for similarity and growth.
- **Antonyms:** Apple Red (#FF3B30) for contrast and opposition.
- **Etymology:** Apple Purple (#AF52DE) for history and depth.
- **Usage/Context:** Apple Orange (#FF9500) for attention and clarity.

Backgrounds remain a pristine white (#FFFFFF), while secondary grouped lists and background fills use a subtle off-white (#F2F2F7) to create structural depth without the use of heavy shadows.

## Typography
The typography scale is built using **Inter**, selected for its systematic, utilitarian nature that closely mirrors SF Pro’s readability and neutral tone. 

The scale follows a strict hierarchy:
- **Large Titles** are used for top-level views (e.g., the root word being explored).
- **Body** text is the standard for definitions and primary descriptions.
- **Subheadlines and Footnotes** are utilized for secondary data, such as phonetic transcriptions or grammatical tags.
- **Letter spacing** is tightened for larger headers and slightly opened for small captions to maintain legibility on mobile displays.

## Layout & Spacing
The layout follows a **Fluid Grid** model designed for mobile-first responsiveness within the Taro framework. 

Key spacing principles:
- **Margins:** A standard 16px margin is maintained on the left and right of the viewport.
- **Rhythm:** An 8pt grid system guides all vertical and horizontal spacing to ensure alignment with iOS system standards.
- **Grouping:** Related word nodes should be spaced using 8px (stack-sm), while distinct sections (e.g., Synonyms vs Antonyms) should be separated by 24px (stack-lg).
- **Safe Areas:** All layouts must respect the notch and home indicator areas, especially for bottom-fixed toolbars or floating action buttons.

## Elevation & Depth
This design system employs **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to signify depth. 

- **Level 0 (Base):** The primary background (#FFFFFF).
- **Level 1 (Cards/Inputs):** Elements are defined by a 0.5pt or 1px border in #E5E5EA.
- **Level 2 (Overlays):** Modals and Action Sheets utilize a backdrop blur (system-ultra-thin-material) to maintain context of the underlying word graph.
- **Interactions:** A subtle 10% opacity black "Press State" overlay is used when a user taps a list item or button, providing immediate tactile feedback without changing the elevation.

## Shapes
The shape language is strictly **Rounded**, following the "squircle" logic of iOS. 

- **Primary Buttons & Cards:** 10px to 12px (0.75rem) corner radius.
- **Search Inputs:** Fully rounded (pill-shaped) or 10px radius to match the system search bar style.
- **Word Nodes:** Word relationship bubbles use a 1rem (rounded-lg) radius to feel approachable and soft within the graph.
- **Selection Indicators:** Small indicators (like checkboxes) use a 4px (soft) radius.

## Components
Consistent styling across the application is achieved through these component standards:

- **Buttons:** Large, full-width "Primary" buttons use the Apple Blue background with white text. "Secondary" buttons use a light gray background with blue text.
- **Relationship Chips:** Small, pill-shaped tags used in the graph. Backgrounds are at 10% opacity of the semantic color (e.g., light green) with the label text at 100% opacity (dark green).
- **Lists:** Inset Grouped lists with 16px horizontal padding, separated by the #E5E5EA border. Each row includes a chevron-right accessory for drill-down navigation.
- **Graph Nodes:** Centered text within a rounded card. Active nodes feature an Apple Blue border; relationship lines are 1px thick in #E5E5EA.
- **Input Fields:** Clean, borderless inputs sitting atop a light gray background (#F2F2F7) with a clear 'X' button for resetting the search query.
- **Bottom Sheets:** Used for detailed word definitions, featuring a "grabber" handle at the top and a backdrop blur that reveals the graph behind it.