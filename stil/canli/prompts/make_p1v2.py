# Part-1 fix round (v2) prompts: the desk in the man's flat eye-level view, and the AI's whole-body turns.
# Run: python stil/canli/prompts/make_p1v2.py
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = "Use your built-in image_gen tool to generate exactly ONE image, 16:9 landscape. Do not copy or move any files and do not run shell commands; just generate it, then print DONE.\n\n"
BG = "\n\nBackground: ONE flat solid pure magenta (#FF00FF), completely uniform, no shadow, no floor line, no ground. ABSOLUTELY NO text, letters, numbers, logos, watermarks, no other characters. Palette only navy, cream, moon yellow (+ magenta background). No 3D render look, no photorealism, no soft shading.\n"
DESK = HEAD + """Attached: (1) the APPROVED seated man of this film, drawn in a FLAT SIDE VIEW with the camera at his eye level; (2) the old desk prop, whose top-down three-quarter perspective is WRONG for this scene. Match the style of image 1 EXACTLY: flat silk-screen print, navy (#18203A) shapes with thin cream (#F3EFE4) rim lines, moon-yellow (#F0D35A) accents, fine grain, slight misregistration.

Draw ONE isolated PROP, centred, nothing cropped: a plain DESK seen from a LOW, EYE-LEVEL viewpoint (the camera at the height of the desktop), the SAME perspective as the man and his chair in image 1: the desktop is seen almost edge-on (a thin horizontal slab, its top surface barely visible as a narrow sliver, NOT seen from above), {ANGLE}. The desk legs are straight and vertical and ALL legs end on ONE straight horizontal ground line at the bottom (the bottoms of all legs at exactly the same height), the space under the desktop empty so the background shows through. On the desk: a large desktop COMPUTER MONITOR on a short stand, its screen turned toward the LEFT-FRONT so the screen face is clearly visible (about three-quarter): the screen is ONE plain flat cream-white (#F3EFE4) area, completely empty and evenly lit (no cursor, no letters, no reflections), framed by a navy bezel. A low keyboard seen almost edge-on in front of the monitor, a navy pencil cup with two pencils at the right end, one small yellow sticky note at the front edge. No mug, no chair, no person, no lamp, no floor shadow.""" + BG
P = {
    'p1v2-desk-a': DESK.replace('{ANGLE}', 'the desk turned only slightly (about 20 degrees) so its front long side faces the viewer'),
    'p1v2-desk-b': DESK.replace('{ANGLE}', 'the desk seen straight from its long front side (pure front elevation, legs at the two ends)'),
}
AI = HEAD + """The FIRST attached image is the APPROVED design of the AI character (silk-screen style); the SECOND is an approved pose drawing of her in this same film. Draw the SAME character, ONE single figure, full body, nothing cropped, centred, at the same scale as the figures in the second image: smooth genderless slender body, cream-white (#F3EFE4) fill with fine navy stipple speckle, a thin navy outline, bald round head, NO face at all except ONE short vertical navy cursor line on the face (exactly like the reference). No clothes, no hair, no ears, no nose, no mouth. Same proportions as the reference.

"""
P['p1v2-a-turn'] = AI + "Pose: her WHOLE BODY has turned around: she now stands in profile facing RIGHT (the mirror of the reference), feet, hips, torso and head all pointing to the right, the cursor line on the RIGHT side of her head, arms relaxed, looking at the empty space in front of her with a slightly puzzled stillness: shoulders a little raised, head tilted a few degrees. The head is NOT twisted relative to the body." + BG
P['p1v2-a-watch'] = AI + "Pose: standing in profile facing RIGHT, her WHOLE BODY (feet, hips, torso, head) turned to the right, her head tilted UP by about 25 degrees following something flying high above and ahead of her, her near arm lifted a little forward at waist height, the other relaxed; the cursor line on the right side of her head. The head is NOT twisted relative to the body." + BG
P['p1v2-a-back34'] = AI + "Pose: standing, seen in a THREE-QUARTER BACK view: her whole body turned away from us toward the right (we see her back and the back of her head, a little of her right side), feet and hips turned with the torso, arms relaxed at her sides, looking at an empty wall in front of her; the cursor line is barely visible at the right edge of her head or hidden. The head is NOT twisted relative to the body." + BG
for k, v in P.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(v)
print(len(P), 'prompts')
