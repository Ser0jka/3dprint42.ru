# 3DPRINT42 Design System

Global source of truth for the 3DPRINT42 web experience. Before building a page, check `design-system/3dprint42/pages/<page>.md`; page rules override this file only where explicitly stated.

## Direction

Client-first industrial service interface: bright warm paper is the dominant canvas, with deep studio black reserved for the video hero, form, navigation, and footer. Real process photography and plain-language choices must explain the service before technical specifications appear. The interface should feel precise and distinctive, but prioritize fast service selection, visual examples, clear routes, and project submission over promotional spectacle.

## Color tokens

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#f3f0ea` | Warm light canvas |
| `--ink` | `#11110f` | Primary text and deepest dark surface |
| `--charcoal` | `#1a1a18` | Secondary dark surface |
| `--ash` | `#9a9891` | Metadata and secondary text |
| `--vapor` | `#f8f7f3` | Text on dark surfaces |
| `--ember` | `#e66f27` | Single status/accent color |

Ember is limited to small status and focus moments. It is never a large fill, background, decorative gradient, or primary button surface.

## Typography

- Display: self-hosted Manrope Variable, weight 250–400, tight line-height and measured negative tracking.
- Labels: self-hosted Roboto Condensed Variable, uppercase, 12–18px, `0.07em–0.13em` tracking. Reserve the smallest size for secondary metadata, never primary navigation.
- Body: self-hosted Manrope Variable, 15–18px, readable 1.45–1.55 line-height.
- Hierarchy comes from size, spacing, and tracking, not bold weights.

## Shape and spacing

- Base spacing rhythm: 8px with intentional 4px half-steps for optical alignment.
- Page gutters: 28px desktop, 16px mobile.
- Section spacing: 44–80px; prefer showing several useful choices within one desktop viewport.
- Buttons: 1px outline, capsule geometry, minimum 44px touch target.
- Badges and small indexes use thin circular or pill outlines like instrument dials.
- Large process imagery may use 22–42px portal radii. Visual scenario and service cards may use 14–24px radii when they improve scanning; specification rows remain square.

## Layout

- Warm paper sections dominate the page. Full-bleed dark plates are reserved for the hero video, short conversion form, navigation, and footer.
- Use hairline rules instead of cards, shadows, or elevation effects.
- Prefer compact visual grids and asymmetrical two-column compositions. Display type should establish hierarchy without occupying most of a viewport.
- Home-page choices start with familiar customer situations (replace a part, test an idea, make tooling, produce a batch), not technology or material names. Technical depth belongs on linked landing pages and in progressive disclosure.
- Body copy stays narrow enough for comfortable reading.
- Mobile collapses to a single column with no horizontal scrolling.
- Primary navigation uses a clearly readable 16px desktop scale and a full-width portal mega menu for services, materials, tasks, and process. On narrower screens it becomes a labelled menu with 18px section links and accordion-style subnavigation; all targets stay at least 44px high.

## Imagery and motion

- Real machinery, materials, finished parts, and manufacturing workflow are the visual subject; no generic illustrations. Supporting pages use distinct, bright production photography instead of recycled frames from the hero video.
- Video is muted, user-controllable, and backed by a poster frame.
- Do not load motion media for initial reduced-motion sessions.
- Pause continuous video when it leaves the viewport.
- Interaction feedback uses 150–300ms transitions and must not shift layout.
- The site has no preloader. The home hero uses one short, non-blocking entrance sequence; all content remains available immediately.
- Looping hero footage follows a shared wall-clock phase, so reloads and tab visibility changes resume the project timeline instead of frame zero.
- GSAP reveals use small offsets and one-shot triggers; image parallax stays subtle and never applies to body text.
- Avoid scroll pinning, long entrance sequences, competing simultaneous motion, and motion that delays access to service information.

## Accessibility and performance

- Maintain at least 4.5:1 contrast for body text and visible keyboard focus.
- All interactive targets are at least 44×44px.
- Controls require accessible names; decorative imagery stays hidden from assistive technology.
- Use responsive media sources and reserve the hero's layout space to avoid CLS.
- Server Components are the default; isolate client code to genuine browser behavior.

## Avoid

- Decorative bento dashboards, filled accent CTAs, heavy drop shadows, decorative gradients, or glassmorphism. Rounded customer-choice cards are allowed when each card carries a real image, one clear route, and concise copy.
- Oversized promotional headings, bold display headings, emoji icons, inconsistent glyph-based iconography, or arbitrary radii.
- Infinite decorative animation, hidden focus rings, misleading actions, or hover-only meaning.
