# App A UI handoff — mockup fidelity

Use this folder as the visual source of truth. The reference image is in
`public/app-a/takt-mobile-hero-reference.png` and the existing watercolor asset
is `public/app-a/growth-path-watercolor.png`.

## Visual contract

- Mobile-first widths: 320, 375 and 430 px; no horizontal scrolling.
- Default light canvas: `#F7F4EE`; deep navy text: `#172941`; secondary text: `#647084`.
- Accents: dusty blue `#527FA4`, sage `#A9B9A1`, apricot `#F2C39A`, lavender `#C8C3D9`.
- Dark mode is opt-in only: `#101B2D` canvas and `#192C45` surfaces, never pure black.
- Use one-column flow, 18–24 px card radii, subtle shadows, 44 px minimum targets.
- The approved illustration language is a thin watercolor progress path that moves
  from scattered shapes toward a blue landscape, a growing plant, balanced stones,
  and an open horizon. The plant and stones are explicitly approved and must not be
  removed without a new user decision. Keep them editorial and abstract rather than
  turning the product into a meditation app. No pets, XP, streaks or gamification.

## Screen composition

Daily Reset: eyebrow “DNEVNI PLAN”, title “Izbaci sve iz glave.”, short helper,
large multiline brain-dump field with microphone inside bottom-right and counter
bottom-left, then Energy and Pleasantness 1–5 scales, then primary “Napravi
predlog plana”. Do not show available-time input.

Clarification: one real question at a time, real multiline answer, microphone
inside field, “Ne znam”, “Nastavi” and “Vrati se na unos”.

Plan review: “Predlog plana”, rationale wash, then visible First Focus, Later
Today and If Capacity Remains blocks, followed by “Vrati se na unos” and
“Potvrdi plan”. Keep existing callbacks and data semantics unchanged.

## Integration rule

Integrate only the visual components and CSS. Do not alter AI prompts, parsing,
Firestore/persistence, resetGuard, prioritisation, rollover, routines or tests.
Open the AI Studio preview with the Mobile device preset and check 390 px before
claiming completion.
