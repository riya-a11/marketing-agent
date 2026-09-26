---
name: Obsidian Command
colors:
  surface: '#13131b'
  surface-dim: '#13131b'
  surface-bright: '#393841'
  surface-container-lowest: '#0d0d15'
  surface-container-low: '#1b1b23'
  surface-container: '#1f1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#34343d'
  on-surface: '#e4e1ed'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e4e1ed'
  inverse-on-surface: '#303038'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb783'
  on-tertiary: '#4f2500'
  tertiary-container: '#d97721'
  on-tertiary-container: '#452000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#13131b'
  on-background: '#e4e1ed'
  surface-variant: '#34343d'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is an "Executive Cyberpunk" framework built for enterprise-grade AI marketing operations. It merges the high-performance utility of developer tools with a premium, high-stakes aesthetic suitable for the C-suite.

The brand personality is authoritative, precise, and visionary. It avoids the neon clutter of traditional cyberpunk, opting instead for a "Dark Mode First" philosophy that emphasizes data clarity through deep obsidian surfaces and surgical strikes of vibrant color.

**Design Style: Linear-Minimalist / Cyberpunk Hybrid**
- **Surfaces:** Layered obsidian and deep slate with high-performance matte finishes.
- **Atmosphere:** Deep depth created through subtle backdrop blurs and semi-transparent glass layers.
- **Accents:** Neon indigo and violet used sparingly to denote intelligence, "active" AI states, and primary actions.
- **Precision:** 1px borders and monospaced data readouts reinforce a sense of technical mastery and absolute accuracy.

## Colors

The palette is anchored in a specialized "Obsidian" scale. The background uses a near-black slate to provide maximum contrast for neon accents without the harshness of pure hex-black.

- **Primary Glow:** Indigo (#6366f1) and Violet (#8b5cf6) are the signature colors. They should be used for interactive states, progress indicators, and AI-driven insights. 
- **Functional Alerts:** Emerald, Amber, and Crimson follow standard semantic patterns but are slightly desaturated to maintain the professional atmosphere, only becoming "vibrant" when glowing in an active state.
- **Typography Tiers:** Slate-50 provides crisp readability for headers. Slate-400 is the workhorse for body copy, ensuring reduced eye strain during long analytical sessions. Slate-500 is reserved for labels, metadata, and disabled states.

## Typography

This design system utilizes a tri-font strategy to differentiate between narrative, interface, and raw data.

- **Geist (Headlines):** Used for impactful titles and section headers. Its geometric precision fits the "Cyberpunk" aesthetic perfectly.
- **Inter (UI/Body):** The standard for all functional UI elements, forms, and descriptive text. It provides the necessary neutrality for a complex enterprise dashboard.
- **JetBrains Mono (Data/Logs):** Critical for this "Marketing OS." All scores, percentages, AI logs, and technical metrics must use JetBrains Mono to signify accuracy and "the engine" behind the UI.

On mobile devices, `display-lg` scales down to 32px and `headline-lg` scales to 24px to maintain layout integrity.

## Layout & Spacing

The design system employs a **12-column fluid grid** with a maximum content width of 1440px. The layout is designed to feel spacious yet densely packed with information where necessary.

- **Rhythm:** A strictly enforced 4px baseline grid ensures vertical harmony across data-heavy tables and dashboards.
- **Gaps:** Use `md` (24px) for most component spacing and `lg` (32px) for section separation.
- **Breakpoints:**
  - **Mobile (<768px):** 4-column grid, 16px margins, stack all sidebars.
  - **Tablet (768px - 1024px):** 8-column grid, 24px margins, collapsible navigation.
  - **Desktop (>1024px):** 12-column grid, 40px margins, fixed sidebars for primary navigation and AI controls.

## Elevation & Depth

Depth is not communicated through traditional drop shadows, but through **Tonal Stacking** and **Translucency**.

- **Level 0 (Base):** Obsidian (#0a0b10). Background of the entire application.
- **Level 1 (Card/Section):** Deep Slate (#131622). Used for primary content containers.
- **Level 2 (Floating/Overlay):** Deep Slate with 80% opacity and a `backdrop-blur(12px)`.
- **Borders:** Every elevated surface must have a `1px` solid border using `rgba(255, 255, 255, 0.1)`. This creates a sharp "cyber" outline that defines the silhouette against the dark background.
- **Interactive Glow:** Hovering over primary elements should trigger a subtle `box-shadow` using the primary indigo color with a large blur (20px+) and low opacity (0.2), simulating a neon light reflecting off a dark surface.

## Shapes

The shape language is "Soft" yet disciplined. While the overall aesthetic is technical and sharp, subtle rounding on components prevents the UI from feeling hostile or overly "retro."

- **Standard Elements:** 0.25rem (4px) corner radius for buttons, inputs, and small widgets.
- **Containers:** 0.5rem (8px) for cards and main dashboard panels.
- **Specialty:** Use 0px (sharp) corners specifically for "Status Tags" or "AI Logs" to emphasize a more technical, terminal-like feel.

## Components

### Buttons
- **Primary:** Gradient background (Indigo to Violet), white text, subtle glow on hover.
- **Secondary:** Ghost style. `1px` border (White/10), transparent background, turns to `White/5` on hover.
- **AI Action:** Special button with a moving mesh gradient border and `JetBrains Mono` text.

### Inputs
- **Field:** Deep Slate background, 1px border. On focus, the border glows Indigo and a subtle 2px blur shadow appears behind the input.
- **Labels:** Always use `data-sm` (JetBrains Mono) in `Slate-500` for input labels to maintain the "OS" feel.

### Cards
- **Structure:** Level 1 Surface, 1px border. 
- **Header:** Cards should feature a 1px bottom divider and a "Terminal Dot" (three small circles in the corner) as a stylistic nod to executive cyberpunk.

### Data Chips
- **Style:** Sharp corners (0px), mono font, background color at 10% opacity with a 100% opacity 1px left-side border accent.

### AI Progress/Scores
- **Visuals:** Use radial progress bars with neon gradients. Incorporate "Scanning" animations—horizontal lines that move vertically across cards when AI is processing data.