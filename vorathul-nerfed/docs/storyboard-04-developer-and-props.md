# NERFED — storyboard 04: the patcher developer and the rock-star props

Two image rounds built by `tools/imagegen/build_prompts.py` from the tables and paragraphs below
(same format as storyboard 03). Nothing here is wired into the scenes.

## 1. f-developer — the patcher as real office drawings

Burak (20 Oct 2026): the code-drawn standing developer (`p2/art/dev.tsx`, used by `p2/DevActor.tsx`)
looks bad next to the Codex-drawn desk workers (G28). He becomes one flat drawing per pose in the
office style of G28 / G39 / `07-ofis-tablo.jpg` (palette **O**: #E9ECEF #CED4DA #ADB5BD, white, UI
blue #3B82F6, thin uniform lines; no comic gold).

**Design (kept from the existing office art, not the code figure):** short messy black hair, light grey
hoodie with the hood down and the sleeves pushed up, dark charcoal trousers, white sneakers, pale skin,
a bored half-lidded face. The eraser is the corrected one: flat white and grey with a UI-blue sleeve,
never pink. The coffee mug is plain white. The clicker is a small grey remote.

**Key colour:** office cut-outs are keyed on #00FF00 green, as G28 is (storyboard 01 §5.1: grey is
inside the office palette, so a #808080 key would eat the hoodie and trousers).

**Consistency:** G46-sheet is generated first and is attached to every pose, after the office frame
and the G39 sheet (his face). **Scale:** every pose is a full figure in a portrait 1024x1536 card, the
figure 85 percent of the card height, feet on the same line near the bottom edge, so the code can swap
poses without rescaling. **View:** each pose is drawn in the view the camera sees; the only side view
is the walk-in of S32.

Poses come from the code (`devAt`, DevActor.tsx) and the office shot rows. Hands-only shots stay on G31
(S36 pinch, S37 drag, S40 pad and pen); the running and cowering patcher of S93, S105, S111 is already
G39-1 / G39-7.

| Id | Size | Alpha | View / pose | Palette | Shots | Refs |
|---|---|---|---|---|---|---|
| G46-sheet | 1536×1024 | opaque | character sheet: back, front, left profile, three-quarter front | O | reference for every pose | office, g39 |
| G46-walk | 1024×1536 | cut-out | left profile, walking left, mug and eraser | O | S32 walk-in | office, g39, G46-sheet |
| G46-click | 1024×1536 | cut-out | back, clicker raised at the painting | O | S32 end, S33 freeze | office, g39, G46-sheet |
| G46-bored | 1024×1536 | cut-out | back, standing bored, eraser hanging | O | S34 | office, g39, G46-sheet |
| G46-tap | 1024×1536 | cut-out | back, eraser raised high against the painting | O | S35 (tap), any erasing beat | office, g39, G46-sheet |
| G46-pin | 1024×1536 | cut-out | back, right palm pressed up on the frame | O | S42 pin | office, g39, G46-sheet |
| G46-dust | 1024×1536 | cut-out | back, rubbing his hands together | O | S42 "felt" | office, g39, G46-sheet |
| G46-glance | 1024×1536 | cut-out | back, head turned over the right shoulder | O | S79 glance, any look-back | office, g39, G46-sheet |
| G46-sip | 1024×1536 | cut-out | three-quarter front, sipping coffee, not looking | O | S79 | office, g39, G46-sheet |
| G46-spit | 1024×1536 | cut-out | front, coffee spit-take, startled | O | S88 | office, g39, G46-sheet |

- **G46-sheet** — Subject: the official character model sheet of the bored office developer from the attached images: short messy black hair, light grey hoodie with the hood down and sleeves pushed up to the forearms, dark charcoal trousers, white sneakers, pale skin, a bored half-lidded face with a small flat mouth; the same man four times, standing relaxed with his arms hanging: seen from the BACK, from the FRONT, in LEFT PROFILE facing left, and in THREE-QUARTER FRONT view; identical height, proportions, hair and clothes in all four. Composition: four full figures in a row with even gaps on a plain flat light grey #E9ECEF background with no scenery and no shadow, each figure 85 percent of the frame height, landscape 1536x1024.
- **G46-walk** — Subject: the developer from the THIRD attached image, in LEFT PROFILE, walking toward the left at an easy bored pace, mid-stride, holding a plain white coffee mug in the near hand at chest height and a large flat white and grey eraser with a UI-blue #3B82F6 sleeve hanging in the far hand; a bored half-lidded face. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-click** — Subject: the developer from the THIRD attached image, seen from directly BEHIND (we see the back of his head and hoodie, not his face), standing facing away from us, his left arm raised forward and up holding a small grey remote clicker pointed at something in front of him, the large flat white and grey eraser with a UI-blue #3B82F6 sleeve hanging from his right hand. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-bored** — Subject: the developer from the THIRD attached image, seen from directly BEHIND (back of his head, no face), standing facing away from us with a bored slouch, weight on one leg, head tilted a little to one side, the large flat white and grey eraser with a UI-blue #3B82F6 sleeve hanging loosely from his right hand, left hand empty and relaxed. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-tap** — Subject: the developer from the THIRD attached image, seen from directly BEHIND (back of his head, no face), standing facing away from us and reaching his left arm high up and forward, pressing the large flat white and grey eraser with a UI-blue #3B82F6 sleeve against an unseen surface above his head as if erasing on a wall, a plain white coffee mug in his lowered right hand. Composition: one full figure drawn at EXACTLY the same body size as the figures of the THIRD image: the top of his head at about 12 percent of the image height and his feet on a line at 95 percent; only the raised arm and the eraser rise above his head, up to the top edge; portrait 1024x1536.
- **G46-pin** — Subject: the developer from the THIRD attached image, seen from directly BEHIND (back of his head, no face), standing facing away from us, his right arm raised forward with the flat palm pressed up against an unseen wall at head height as if pinning a card, his left hand empty and relaxed; no eraser, no mug. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-dust** — Subject: the developer from the THIRD attached image, seen from directly BEHIND (back of his head, no face), standing facing away from us, both forearms raised in front of his chest rubbing his palms together as if dusting off his hands after a job done, elbows out to the sides so both hands show past his body; no eraser, no mug. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-glance** — Subject: the developer from the THIRD attached image, seen from BEHIND standing facing away from us, his head turned over his right shoulder so we see his bored half-lidded face in profile looking back toward us, a plain white coffee mug in his right hand at chest height, left hand in the hoodie pocket. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-sip** — Subject: the developer from the THIRD attached image, in THREE-QUARTER FRONT view, standing relaxed and sipping from a plain white coffee mug held with both hands, eyes half-closed and looking down into the mug, completely uninterested. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.
- **G46-spit** — Subject: the developer from the THIRD attached image, in FRONT view, startled mid coffee spit-take: eyes wide, a spray of white coffee drops bursting from his mouth toward the viewer, the plain white mug jerked away in one hand, the other hand thrown up, leaning back a little, small sweat drops by his head; cartoon, no injury. Composition: one full figure, 85 percent of the image height, feet on a line near the bottom edge, portrait 1024x1536.

## 2. g-props — the rock-star props for chorus 2

Burak (20 Oct 2026): in the second chorus (S68–S73, the crumbling throne room) Vorathul grabs a
microphone and performs like a rock star. Painting-world comic style (palette **P** plus violet glow),
cut-outs on the #808080 key, references: the style frame and the throne room plate L3-wall. Light is
painted, never a flat beam.

| Id | Size | Alpha | Role | Palette | Shots | Refs |
|---|---|---|---|---|---|---|
| P1-mic | 1024×1536 | cut-out | hand-held microphone, vertical, rotated at the hand socket in code | P + violet | S68–S73 | style, e:L3-wall |
| P1-mic-stand | 1024×1536 | cut-out | gothic mic stand, full height, front view | P + violet | S68–S73 | style, e:L3-wall |
| P1-stage-lights | 1536×1024 | cut-out | P1/P2 rig of hanging gothic stage lanterns, front view | P + violet | S68–S73 | style, e:L3-wall |
| P1-stage-glow | 1536×1024 | opaque (screen blend on black) | painted halftone spotlight cones for the lantern rig | gold, ivory, violet on ink | S68–S73 | style |

- **P1-mic** — Subject: one ornate gothic hand-held microphone fit for a colossal black knight-king's gauntlet: a long black handle wrapped in gold bands with small spikes, a gold crown-shaped collar, and a round black grille head with gothic tracery, a ring of violet #9B5CE0 glow around the grille; drawn perfectly straight and VERTICAL, grille at the top, the end of the handle at the bottom, seen from the front; no hand, no cable. Composition: one object, centred, filling 85 percent of the image height, portrait 1024x1536.
- **P1-mic-stand** — Subject: one ornate gothic microphone stand seen straight from the front: a tall straight black pole with gold rings, a wide three-legged spiked black and gold base like a small throne foot, and at the top a gold clamp holding the same black and gold gothic microphone with a violet #9B5CE0 glow ring at the grille; perfectly vertical. Composition: one object, centred, full height from the bottom edge to just below the top edge, portrait 1024x1536.
- **P1-stage-lights** — Subject: a concert lighting rig made from the throne room: a long horizontal black iron beam with gold gothic ornaments hanging on chains, carrying a row of seven gothic lanterns turned into stage spotlights, each lantern a black and gold cage with a glowing ivory and gold core, two of them glowing violet #9B5CE0, all facing the viewer and slightly down; seen straight from the front; no light beams drawn. Composition: the beam spans the whole width near the top, the lanterns hang below it evenly spaced, landscape 1536x1024.
- **P1-stage-glow** — Subject: seven cones of stage spotlight light falling from the top edge of the image toward the bottom, evenly spaced, painted in the comic print style: each cone made of warm gold #E2B33C and ivory #F4ECD8 dry-brush hatching and a coarse halftone dot screen that fades from dense at the top to sparse at the bottom, two of the cones violet #9B5CE0 halftone instead of gold; ragged ink-brush edges; the background is solid flat black #0A0A0A everywhere else; no lanterns, no buildings, no figures. Composition: landscape 1536x1024, the cone tips at the top edge, the cones widening downward with dark gaps between them.
