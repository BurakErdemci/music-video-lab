# Writes the part-1 Codex image_gen prompts (stil/canli/prompts/p1-*.txt). Run: python stil/canli/prompts/make_p1.py
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = "Use your built-in image_gen tool to generate exactly ONE image, 16:9 landscape. Do not copy or move any files and do not run shell commands; just generate it, then print DONE.\n\n"
HUM = """The FIRST attached image is the CANONICAL on-model frame of the HUMAN character (silk-screen style); the SECOND is an approved drawing of him in this same film. Draw the SAME person, ONE single figure, full body head to toe, nothing cropped, centred, at the same scale as the second image.
Model anchors for the HUMAN (copy them exactly):
- Proportions: slim adult, small head; head height about 1/7.5 of the standing height (NOT a big chibi head).
- Hair: the same short messy hair silhouette as the reference, the same tufts at the back and top. Not bigger.
- Outfit: short-sleeved plain top and slim plain trousers drawn as one solid midnight navy (#18203A) silhouette, BAREFOOT.
- Notes: moon-yellow (#F0D35A) square sticky notes stuck on the body in the SAME pattern as the reference: one large note on top of the shoulder, a vertical column down the back from the shoulder blade to the hip, two on the chest/ribs, one on the upper arm sleeve.
- Line: thin cream (#F3EFE4) rim outline around the whole figure, FACELESS (no eyes, no mouth), flat silk-screen style, slight misregistration, fine grain.

"""
AI = """The FIRST attached image is the APPROVED design of the AI character (silk-screen style); the SECOND is an approved pose drawing of her in this same film. Draw the SAME character, ONE single figure, full body, nothing cropped, centred, at the same scale as the figures in the second image: smooth genderless slender body, cream-white (#F3EFE4) fill with fine navy stipple speckle, a thin navy outline, bald round head, NO face at all except ONE short vertical navy cursor line on the face (exactly like the reference). No clothes, no hair, no ears, no nose, no mouth. Same proportions as the reference (small round head, long slim body).

"""
TAIL = "\n\nBackground: ONE flat solid pure magenta (#FF00FF), completely uniform, no shadow, no floor line, no ground. ABSOLUTELY NO text, letters, numbers, logos, watermarks, no other characters. Palette only navy, cream, moon yellow (+ magenta background). No 3D render look, no photorealism, no soft shading.\n"
FIG = {
    'p1-h-rise': HUM + "Pose: in profile facing RIGHT, caught in the middle of getting up from a simple navy chair (the same thin-legged chair as in his seated drawings, drawn behind him): hips just lifted off the seat, knees still bent, torso leaning forward over his feet, the far hand pushing on his knee, the near hand holding ONE moon-yellow square paper note with a few short navy scribble lines (abstract lines, no letters) at chest height. Head up, looking forward to the right. The chair is part of the drawing.",
    'p1-h-peel': HUM + "Pose: standing in profile facing RIGHT, his head and shoulders turned back over his shoulder to look behind him; his near arm reaches back behind his body at shoulder height and his fingers peel ONE moon-yellow square sticky note off an invisible wall behind him (the note is half lifted, curling a little). Far arm relaxed. Weight on both feet.",
    'p1-h-slide': HUM + "Pose: standing in profile facing RIGHT, leaning slightly forward, his near arm extended straight forward at chest height, his fingertips pushing ONE moon-yellow square sticky note flat forward as if sliding it through a slot in an invisible glass pane just in front of him (the glass is NOT drawn). Far arm relaxed at his side. Feet flat, weight on the front foot.",
    'p1-h-hand': HUM + "Pose: standing in profile facing RIGHT, close to an invisible glass pane (NOT drawn), offering a HANDSHAKE: his near arm extended forward at waist height, elbow slightly bent, the hand open and vertical with the thumb up, ready to shake; a small hopeful lean forward. Far arm relaxed. Feet flat.",
    'p1-a-raise': AI + "Pose: in profile facing LEFT, standing upright exactly like the reference, starting a friendly wave: her near upper arm lifted forward to shoulder height, the forearm angled UP at about 45 degrees, open palm facing forward, fingers together; the other arm relaxed at her side. This is the in-between drawing on the way from arms-down to a full wave (forearm vertical).",
    'p1-a-lookback': AI + "Pose: standing in profile facing LEFT, feet and body exactly like the reference, but her head turned back over her shoulder to look at the empty space BEHIND her (to the right), the cursor line now on the right side of her head; arms relaxed at her sides, a little puzzled.",
    'p1-a-pin': AI + "Pose: standing, body turned three-quarter away (her back a little toward us, facing RIGHT), her near arm raised to head height pressing ONE moon-yellow square sticky note flat onto an invisible wall in front of her with her open palm; the other arm relaxed. The note is the only coloured object.",
    'p1-a-catch': AI + "Pose: standing in profile facing LEFT, her near arm forward at waist height, palm up and open, catching ONE moon-yellow square sticky note that has just landed on her palm; she looks down at it; the other arm relaxed.",
    'p1-a-hand': AI + "Pose: standing in profile facing LEFT, offering a HANDSHAKE: her near arm extended forward at waist height, elbow slightly bent, the hand open and vertical with the thumb up; a small eager lean forward. Other arm relaxed.",
    'p1-a-lookdown': AI + "Pose: standing in profile facing LEFT, body exactly like the reference, her head bowed down to look at the floor right in front of her toes; arms relaxed at her sides.",
    'p1-a-kneel': AI + "Pose: in profile facing LEFT, kneeling on one knee (the far knee on the floor, the near foot flat in front), leaning forward, her near hand reaching down to touch the floor in front of her knee; head bowed, looking at the spot. No objects.",
    'p1-a-read': AI + "Pose: sitting cross-legged on the floor, seen from the side and slightly in front (three-quarter, facing LEFT), holding an OPEN notebook with both hands in her lap: the notebook has a solid navy (#18203A) cover and cream pages with a few short navy scribble lines (no letters). Her head is bowed, reading. The notebook is the only navy object.",
    'p1-a-lookup': AI + "Pose: sitting cross-legged on the floor exactly as if reading (three-quarter, facing LEFT), the OPEN notebook (solid navy cover, cream pages with a few short navy scribble lines, no letters) now resting in her lap under both hands, her head RAISED, looking up and slightly forward at an empty sky; still and a little lost.",
}
PROP = {
    'p1-notebook': "The attached image is the approved style of this film (flat silk-screen print, navy + cream + moon yellow, fine grain). Draw ONE small CLOSED notebook lying flat, seen from slightly above at a three-quarter angle: a solid midnight navy (#18203A) cover with a thin cream rim line, a cream page edge visible on two sides, a moon-yellow elastic band across the cover. Centred, small (about a fifth of the image width), nothing else.\n\nBackground: ONE flat solid pure magenta (#FF00FF), completely uniform, no shadow. ABSOLUTELY NO text, letters, numbers, logos. No 3D render look.\n",
}
PAGE = "The attached image is the approved style of this film (flat silk-screen print, navy + cream + moon yellow, fine paper grain, slight misregistration). Draw a FULL-FRAME close-up, seen from straight above, of an OPEN notebook filling the whole 16:9 frame edge to edge: two cream (#F3EFE4) pages with faint navy ruled lines, a dark navy (#18203A) cover rim along the frame edges and a navy spine down the middle. "
NOTE = "\n\nABSOLUTELY NO real text, letters, numbers, logos, watermarks. Palette only navy, cream, moon yellow. No 3D render look, no photorealism, no soft shading, no hands, no people.\n"
PAGES = {
    'p1-page-tag': PAGE + "On the RIGHT page, drawn in navy pen: a simple luggage-tag / name-tag shape with a hole and string, its name written as an abstract wavy scribble (NOT letters); a small moon-yellow (#F0D35A) sticky note in a corner. The left page has a few lines of abstract handwriting scribbles.",
    'p1-page-road': PAGE + "On the RIGHT page, drawn in navy pen: a simple hand-sketched winding ROAD seen from above (two parallel lines curving from the bottom of the page to a tiny house at the top), a few dashes in the middle of the road, a small moon-yellow dot of a sun. The left page has a few lines of abstract handwriting scribbles.",
    'p1-page-cross': PAGE + "Both pages are covered with lines of abstract navy handwriting SCRIBBLES (wavy pen lines that look like handwriting but contain NO real letters); on the RIGHT page ONE of those lines is firmly crossed out with a thick navy zig-zag strike, and a small moon-yellow (#F0D35A) highlight marks the crossed line.",
}
for k, v in FIG.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(HEAD + v + TAIL)
for k, v in PROP.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(HEAD + v)
for k, v in PAGES.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(HEAD + v + NOTE)
print(len(FIG) + len(PROP) + len(PAGES), 'prompts')
