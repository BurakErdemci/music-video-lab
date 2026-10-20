# Part-4 human pose prompts (lane h). Run: python stil/canli/prompts/make_p4_h.py
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = "Use your built-in image_gen tool to generate exactly ONE image, 16:9 landscape. Do not copy or move any files and do not run shell commands; just generate it, then print DONE.\n\n"
BG = "\n\nBackground: ONE flat solid pure magenta (#FF00FF), completely uniform, no shadow, no floor line, no ground. ABSOLUTELY NO text, letters, numbers, logos, watermarks, no other characters. Palette only navy, cream, moon yellow (+ magenta background). No 3D render look, no photorealism, no soft shading.\n"
ANCH = """Model anchors for the HUMAN (copy them exactly):
- Proportions: slim adult, small head; head height about 1/7.5 of the standing height (NOT a big chibi head).
- Hair: the same short messy hair silhouette as the reference, the same tufts at the back and top. Not bigger.
- Outfit: short-sleeved plain top and slim plain trousers drawn as one solid midnight navy (#18203A) silhouette, BAREFOOT (bare feet with toes, as in the approved drawing).
- Notes: moon-yellow (#F0D35A) square sticky notes stuck on the body and arms in the SAME pattern as the reference: one large note on top of the shoulder, a vertical column down the back from the shoulder blade to the hip, two on the chest/ribs, one on the upper arm sleeve.
- Line: thin cream (#F3EFE4) rim outline around the whole figure, FACELESS (no eyes, no mouth), flat silk-screen style, slight misregistration, fine grain.
"""
RULES = "\nRules: ONE perspective only, exactly the camera named in the pose (no other view); the head is NOT turned more than 30 degrees away from the torso direction; two arms and two legs only, natural joints, no doubled or bent-wrong limbs; five fingers at most per hand; every hand touches what it holds or rests on (a note is held at its edge inside the fist); nothing else is drawn (no bus, no street, no table, no glass, no wall, no furniture, no shadow) unless stated."


def full(second):
    return (HEAD + "The FIRST attached image is the CANONICAL on-model frame of the HUMAN character (silk-screen style); " + second
            + " Draw the SAME person, ONE single figure, FULL BODY head to toe (bare feet included), nothing cropped, centred, at the same scale as the approved drawings.\n"
            + ANCH + "\nPose: ")


SEC_WALK = "the SECOND is an approved drawing of him in this same film (hair, sticky-note pattern, drawing style)."
NOTE = "yellow (#F0D35A) square sticky note held at its edge: the note's edge is gripped inside the clenched fist and the rest of the note sticks out of the fist, clearly visible"
P = {}
P['p4-h-leap'] = full(SEC_WALK) + "Camera: seen from INSIDE a night bus, from BEHIND him: a back three-quarter view, we see his BACK and the back of his head (NO face side, NO profile). He leaps OUT through an open side doorway, away from the viewer, into the night: the push-off leg is bent with its bare toes still on the step edge at the bottom of the figure, the other knee is driven forward and up, the torso leans far forward, BOTH arms are thrown forward and up for balance, the NEAR fist clenched around a " + NOTE + ". The sticky-note column is visible on his back. The doorway, the bus and the step are NOT drawn." + RULES + BG
RUNSET = "Camera: night street, PURE SIDE VIEW facing RIGHT, camera at hip height, a flat profile of the whole running body (no three-quarter view). Sprinting: torso leans forward about 10 degrees, head in line with the torso looking ahead, arms opposite to legs and bent about 90 degrees, the NEAR fist clenched around a " + NOTE + ". "
P['p4-h-run1'] = full(SEC_WALK) + RUNSET + "Phase CONTACT: the FRONT foot is landing on the ground right under the front knee, heel first, the BACK leg is pushing off behind him with its toes still touching the ground. The ground is NOT drawn." + RULES + BG
P['p4-h-run2'] = full(SEC_WALK) + RUNSET + "Phase DRIVE: the BACK leg is fully extended straight behind him pushing off with the toes (the toes of the back foot are the only contact), the FRONT knee is driven high forward (thigh almost horizontal) with the shin hanging down. The ground is NOT drawn." + RULES + BG
P['p4-h-run3'] = full(SEC_WALK) + RUNSET + "Phase FLIGHT: BOTH feet are OFF the ground, the legs scissored wide: one leg stretched far forward with the knee almost straight, the other leg stretched far back with the shin kicked up behind. The whole body is in the air. The ground is NOT drawn." + RULES + BG
SEC_HAND = "the SECOND is the approved drawing of him standing in profile at the glass (camera, scale, style); the THIRD is an approved drawing of him bent forward in profile."
P['p4-h-pant'] = full(SEC_HAND) + "Camera: the home glass split, PURE SIDE VIEW facing RIGHT (same camera as the second image). Panting after a sprint: bent forward from the hips about 30 degrees, the NEAR arm reaching forward and up with the PALM pressed FLAT on an invisible vertical glass plane in front of him at about head height (palm faces right, fingers together pointing up, the hand's flat side a straight vertical edge), the FAR hand rests on his far knee, the head hangs low between raised shoulders, chest heaving. Both feet flat on the ground. The glass is NOT drawn." + RULES + BG
SEC_FLOOR = "the SECOND is the approved drawing of him sitting on the floor in profile facing LEFT (copy the seat, hips, the legs drawn up with knees bent, the feet and the scale EXACTLY from it), the THIRD is another approved drawing of him at the same place."
SEAT = "Camera: the home glass split, PURE SIDE VIEW facing LEFT, sitting ON THE FLOOR exactly as in the second image: the same hips position, the same bare feet place, the knees bent up in front of him, his back upright and straight (an invisible vertical wall behind him, NOT drawn; no chair). "
P['p4-h-floor-up'] = full(SEC_FLOOR) + SEAT + "Pose: both forearms rest on his knees, the head is LIFTED and level, looking straight ahead (to the left) at a pane of glass that is NOT drawn: a tired morning, shoulders slightly slumped." + RULES + BG
SEC_BOOK = "the SECOND is the approved drawing of him sitting on the floor in profile facing LEFT (copy the seat, hips, legs and feet and the scale EXACTLY from it), the THIRD is the navy NOTEBOOK with a yellow elastic band, closed."
P['p4-h-floor-book'] = full(SEC_BOOK) + SEAT + "Pose: he holds the navy notebook (navy cover, yellow elastic band hanging loose, as in the third image) OPEN in BOTH hands above his knees, the cream inner pages facing him with faint thin ruled lines (no writing), his hands gripping the book's outer edges, his head bowed looking DOWN at it: page one. The open book is held at chest height above his knees." + RULES + BG
P['p4-h-cross'] = full(SEC_WALK) + "Camera: the coda, PURE SIDE VIEW facing RIGHT. A long decisive step forward: the FRONT foot is landing flat, heel first, far ahead, the BACK foot is on its toes behind him, a wide stride, torso upright with a slight forward lean, the NEAR arm reaches forward at chest height with an OPEN hand (fingers together, palm facing down-right, as if stepping through a pane of glass), the far arm swings back, the head is level looking ahead. The ground and the glass are NOT drawn." + RULES + BG
SEC_DESK = "the SECOND is the approved drawing of him seated on his navy chair in a flat side view at the desk (copy the chair design, the seat height, the scale, his legs, his seat position and reach EXACTLY from it); the THIRD is the navy NOTEBOOK with a yellow elastic band, closed; the FOURTH is the empty side-view desk room (use it only for the camera and perspective; do NOT draw the room)."
P['p4-h-desk-book'] = full(SEC_DESK) + "Camera: the side-view desk room, PURE FLAT SIDE VIEW with the camera at eye level, the man faces RIGHT toward an undrawn desk. Draw the same navy chair exactly as in the second image. Seated on that chair at the same place and the same reach as the second image, BOTH hands on the (undrawn) desk top at elbow height in front of him, opening the navy notebook that lies on the undrawn desk: ONE hand lifts the cover of the notebook open (the cover tilted up, the cream pages visible inside), the other hand holds the book flat. Draw the notebook itself (navy cover, yellow elastic band hanging loose, cream pages) so the hands really touch it; draw NO desk, NO screen, NO keyboard. Head bowed a little looking down at it." + RULES + BG
for k, v in P.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(v)
print(len(P), 'prompts')
