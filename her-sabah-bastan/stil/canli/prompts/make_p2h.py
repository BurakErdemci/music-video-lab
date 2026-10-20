# Part-2 human pose prompts. Run: python stil/canli/prompts/make_p2h.py  (writes p2-h-*.txt + p2-h-refs.txt next to this file)
# Prompt file p2-h-<x>.txt -> run name p2-h-<x> (the empty chair: prompt p2-h-chair2.txt -> run name p2-chair2).
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = "Use your built-in image_gen tool to generate exactly ONE image, 16:9 landscape. Do not copy or move any files and do not run shell commands; just generate it, then print DONE.\n\n"
BG = "\n\nBackground: ONE flat solid pure magenta (#FF00FF), completely uniform, no shadow, no floor line, no ground. ABSOLUTELY NO text, letters, numbers, logos, watermarks, no other characters, no steam, no light beams. Palette only navy, cream, moon yellow (+ magenta background). No 3D render look, no photorealism, no soft shading.\n"

ANCHORS = """Model anchors for the HUMAN (copy them exactly): same man as image 1: same hair (short messy hair, same tufts), same slim build, same clothes (short-sleeved plain top and slim plain trousers as one solid midnight navy #18203A silhouette, BAREFOOT), same moon-yellow (#F0D35A) square sticky notes on his shirt (one large on the shoulder, a column down the back, two on the ribs, one on the upper arm sleeve). Head height about 1/7.5 of standing height (NOT chibi). Thin cream (#F3EFE4) rim outline around the whole figure, FACELESS (no mouth, no nose; at most a simple closed-eye line or open-eye dot where the pose says so), flat silk-screen style, slight misregistration, fine grain.
"""
RULES = """RULES: (1) ONE perspective: {CAM}; no three-quarter view. (2) The head never turns more than 30 degrees away from the torso direction. (3) Physical grips: a mug is held by its handle with the fingers THROUGH the handle loop, a flashlight is held around its body with the lens pointing out; hands really touch what they hold. (4) No extra, missing or doubled limbs; natural joints; two legs, two arms. ONE figure only, full body head to toe, nothing cropped, centred, no text.
"""
SIDE = "a FLAT SIDE VIEW with the camera at eye level, exactly like the attached seated man (image 2)"
LEFT = "a FLAT SIDE VIEW with the camera at eye level, whole body facing LEFT"
INTRO2 = "The FIRST attached image is the CANONICAL on-model frame of the HUMAN character; the SECOND is the APPROVED drawing of him seated on his navy chair in a flat side view (copy the chair design, the seat height, the scale, his legs and the drawing style from it exactly). "


def seated(pose, cam=SIDE, intro=INTRO2):
    return HEAD + intro + "Draw the SAME person.\n" + ANCHORS + RULES.replace('{CAM}', cam) + "\nPose: " + pose + BG


P = {}
KB = "his near forearm and hand reach forward horizontally at elbow height, fingertips resting on an UNDRAWN keyboard in front of him at the height of his elbows (draw no keyboard, no desk, no screen), typing; he looks forward-right at an undrawn screen at eye level. "
P['p2-h-type1'] = seated("seated on the same navy chair, facing RIGHT, upright back, both forearms forward roughly horizontal, " + KB)
P['p2-h-type2'] = seated("seated on the same navy chair, facing RIGHT, a little SLUMPED: shoulders rounded, head lower and further forward, hands still at the same keyboard height. " + KB)
P['p2-h-type3'] = seated("seated on the same navy chair, facing RIGHT, VERY slumped and tired: back curved, head low and forward close to the undrawn screen, hands still on the undrawn keyboard at the same height. " + KB)
P['p2-h-stretch'] = seated("seated on the same navy chair, facing RIGHT, both arms straight up over his head, fingers interlaced, back arched backward, chest out, eyes closed (a simple curved closed-eye line), a big stretch; head tilted back only slightly.")
P['p2-h-coffeecab'] = HEAD + "The attached image is a drawing of a small waist-high cabinet with a drip coffee machine on top (and a man, who is NOT wanted). Draw ONLY THE PROP: that same small waist-high CABINET (navy with thin cream rim lines, same style, same proportions, legs/feet on one level) with the small DRIP COFFEE MACHINE on top of it, in a FLAT SIDE VIEW at eye level, the machine's spout/nozzle clearly visible and facing RIGHT. NO person, NO mug, NO steam, nothing else; centred, nothing cropped; the bottom of the cabinet on one straight level." + BG
CAB = "the attached image 3, a small waist-high cabinet with a drip coffee machine whose spout faces RIGHT. "
P['p2-h-coffee'] = HEAD + "The FIRST attached image is the CANONICAL on-model frame of the HUMAN character; the SECOND is an approved drawing of him standing in this film; the THIRD is the small waist-high cabinet with a drip coffee machine on top (spout facing RIGHT), already drawn separately. Draw the SAME person, standing, whole body in profile facing LEFT, standing at the RIGHT side of THIS cabinet, facing it; draw ONLY HIM (NO cabinet, NO coffee machine, nothing else; magenta everywhere else).\n" + ANCHORS + RULES.replace('{CAM}', LEFT) + "\nPose: standing upright in profile facing LEFT, bare feet on one level, his near arm bent and extended forward-left holding a plain cream mug BY ITS HANDLE (fingers through the handle loop, handle clearly visible) forward at about waist-to-chest height, the mug upright with its open top toward the ceiling, as if held under a machine's spout in front of him (the spout is not drawn). Head level, looking at the mug." + BG
P['p2-h-chair2'] = HEAD + "The attached image is the APPROVED drawing of a seated man on his navy chair in a flat side view. Draw ONLY THE EMPTY CHAIR from it: copy the chair EXACTLY (same design, same proportions, same thin cream rim lines, same drawing style), flat side view at eye level, the backrest on the LEFT, same scale. NO person, NO sticky notes, nothing on the chair, nothing else in the image; the chair centred, nothing cropped, all legs ending on one level. PROPORTIONS (measure them on the attached chair and keep them): the seat is a SHORT slab, its depth (front to back) is only about 0.9 times the height from the floor to the seat top; the backrest top is about 1.8 times the seat height above the floor; the legs are thin and almost vertical, only slightly splayed." + BG
P['p2-h-sleep'] = seated("sitting ON THE FLOOR, whole body in profile facing LEFT, his back flat against an INVISIBLE vertical wall on the RIGHT side of the image (his back, shoulders and the back of his head form one vertical straight line on the right, as if leaning against a wall; do NOT draw the wall, no chair), legs drawn up with the knees bent up in front of him, forearms resting on his knees, his head dropped forward onto his chest, asleep, eyes closed. His seat rests on the floor level.", cam=LEFT)
P['p2-h-wake'] = seated("sitting ON THE FLOOR with his back flat against an INVISIBLE vertical wall on the RIGHT side of the image (his back, shoulders and back of the head form one vertical straight line on the right; do NOT draw the wall, no chair), whole body in profile facing LEFT, knees drawn up, but STARTLED AWAKE: head jerked up and looking forward-left, eyes wide open (a round open-eye dot), shoulders lifted, hands lifted off the knees with fingers spread. His seat rests on the floor level.", cam=LEFT)
P['p2-h-ots'] = HEAD + "The FIRST attached image is the CANONICAL on-model frame of the HUMAN character; the SECOND is a style frame whose LEFT half shows the over-the-shoulder view of him from behind (copy that left-half drawing style, the hair and the sticky notes exactly).\n" + ANCHORS + "\nDraw ONLY this plate: an OVER-THE-SHOULDER BACK VIEW (camera behind him and slightly to his left, looking past his right shoulder): the BACK of his head with his messy hair and his shoulders and upper back covered in moon-yellow square sticky notes, seen from behind, LARGE, filling the lower-left of the frame, cropped by the BOTTOM edge of the image only (chest-up); the top of his hair and both sides of his shoulders are fully inside the frame. The face is NOT visible (at most the edge of one cheek). NO anger icon, no background, no window, no other objects. One figure, no text." + BG
P['p2-h-calm'] = seated("seated on the same navy chair, facing RIGHT, calm and upright: shoulders dropped, both hands resting on his thighs, eyes closed (a simple curved closed-eye line), a long exhale with lips slightly open, head level.")
P['p2-h-torch'] = seated("seated on the same navy chair, facing RIGHT, his near arm extended forward at chest height holding a small black-navy FLASHLIGHT by its body (fingers wrapped around the barrel), the lens at the front pointing right and a little down. NO light beam, no glow, no rays drawn. A calm attentive face, head level looking where the flashlight points.")
P['p2-h-torch-back'] = seated("seated on the same navy chair with his WHOLE BODY and the chair turned to face LEFT (the exact mirror image of a seated man facing right: backrest on the RIGHT side), his near arm raised forward-up holding a small black-navy FLASHLIGHT by its body (fingers wrapped around the barrel), the lens pointing up-left at about 30 degrees above horizontal. NO light beam, no glow, no rays drawn. Calm attentive face looking along the flashlight.", cam=LEFT)

P['p2-h-chair2-r1'] = P['p2-h-chair2']  # retries use the same (proportion-fixed) prompt
P['p2-h-chair2-r2'] = P['p2-h-chair2']
P['p2-h-stretch-r1'] = P['p2-h-stretch'].replace('Pose: ', 'IMPORTANT: his head is the SAME SIZE as in image 2 (do not draw a smaller head); the arms go up beside his head and do not hide it; the head tilts back only about 15 degrees. Pose: ')
P['p2-h-stretch-r2'] = P['p2-h-stretch-r1']
EDIT = HEAD + "The FIRST attached image is the approved drawing of the man seated on his chair (flat side view, facing right); the SECOND is the canonical on-model frame of the same man. Redraw image 1 EXACTLY (same man, same chair, same size, same head size, same proportions, same position on the chair, same flat magenta background), changing ONLY his arms and back: both arms straight up over his head, fingers interlaced, back arched backward, chest out, eyes closed (a big seated stretch). Keep the head the same size as in image 1: the head height stays about 1/7.5 of his standing height, the arms go up beside the head and do not cover it. Same sticky notes, same clothes, flat silk-screen style, thin cream rim outline. ONE figure, full body, nothing cropped, no text." + BG
for _n in ('r3', 'r4', 'r5'):
    P['p2-h-stretch-' + _n] = EDIT
REFS = {k: ['stil/hareket/ref-insan-kanonik.png', 'video/public/living/p1/h-mug2.png'] for k in P}
REFS['p2-h-coffeecab'] = ['stil/canli/ham/p2-h-coffee-v0.png']
REFS['p2-h-coffee'] = ['stil/hareket/ref-insan-kanonik.png', 'video/public/living/h-glass-note.png', 'stil/canli/ham/p2-h-coffeecab.png']
REFS['p2-h-stretch-r1'] = REFS['p2-h-stretch-r2'] = REFS['p2-h-stretch']
for _n in ('r3', 'r4', 'r5'):
    REFS['p2-h-stretch-' + _n] = ['stil/canli/ham/p2-h-type1.png', 'stil/hareket/ref-insan-kanonik.png']
REFS['p2-h-chair2'] = ['video/public/living/p1/h-mug2.png']
REFS['p2-h-ots'] = ['stil/hareket/ref-insan-kanonik.png', 'stil/tur4/06-sinir-ikonu.png']

if __name__ == '__main__':
    for k, v in P.items():
        open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(v)
    with open(os.path.join(HERE, 'p2-h-refs.txt'), 'w') as f:
        for k, r in REFS.items():
            f.write(k + ' ' + ' '.join(r) + '\n')
    print(len(P), 'prompts')
