# Part-3 bus lane prompts. Run: python stil/canli/prompts/make_p3_bus.py
import os
HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = "Use your built-in image_gen tool to generate exactly ONE image, 16:9 landscape. Do not copy or move any files and do not run shell commands; just generate it, then print DONE.\n\n"
BG = "\n\nBackground: ONE flat solid pure magenta (#FF00FF), completely uniform, no shadow, no floor line, no ground. ABSOLUTELY NO text, letters, numbers, logos, watermarks, no other characters. Palette only navy, cream, moon yellow (+ magenta background). No 3D render look, no photorealism, no soft shading.\n"
PLATE = HEAD + """Attached: image 1 is a style frame of this film (a man by a night-bus window). Match its style EXACTLY: flat silk-screen print, navy (#18203A) shapes with thin cream (#F3EFE4) rim lines, moon-yellow (#F0D35A) accents, fine grain, slight misregistration.

Draw the EMPTY INTERIOR of a night city bus, a MEDIUM SHOT of ONE window seat and its window, in the same three-quarter view as image 1: seen from the aisle looking toward the RIGHT side wall, which has ONE large window running diagonally into depth (its near edge large at the left, receding to the right). Rows of navy bench seats with cream rim lines, vertical chrome poles, ceiling light strips glowing moon yellow, a window ledge/sill below the window. The window seat in the foreground-left/centre beside that window is EMPTY; its seat backrest is about 45-55 percent of the image height, the seat cushion clearly visible. NO people at all, no text, no heart, no reflections.

IMPORTANT: the glass of the large window is ONE flat solid pure magenta (#FF00FF), completely uniform and EMPTY: nothing drawn through it, no city, no moon, no reflections, no fog; only its dark navy window frame around it. (Magenta is filled later by code.) The only magenta in the image is that window glass; the rest of the bus is navy/cream/yellow. Smaller side windows further back may also be pure magenta glass.
"""
MAN = HEAD + """Attached: (1) the APPROVED design of the man of this film; (2) the empty bus plate he will sit in (the set: its camera, perspective and scale); (3) a style frame showing him seated by the bus window. Match the style of image 1 EXACTLY: flat silk-screen print, navy (#18203A) silhouette with messy hair, yellow (#F0D35A) sticky notes all over his back and arms, thin cream (#F3EFE4) rim line, NO face detail.

Draw ONLY the man, ONE figure, nothing cropped, centred, NO seat, NO window, NO floor, NO shadow, at the scale he would have sitting in the seat of image 2 (backrest about half the image height, so he is large). Camera: the SAME three-quarter view as image 3: seen from BEHIND-LEFT, seated, facing the window on the RIGHT, hips at seat height, legs forward toward the right. Rules: head turned at most 30 degrees relative to the torso; two arms, two legs, five fingers max per hand; hands touch what they hold.

"""
P = {'p3-bus-int': PLATE + BG.replace("pure magenta (#FF00FF), completely uniform, no shadow, no floor line, no ground. ", "pure magenta (#FF00FF) only on the window glass. ").replace("Background: ONE flat solid", "Note: the only magenta is the flat solid") if False else PLATE + "\nNo text, no logos. Palette only navy, cream, moon yellow (+ the magenta glass). No 3D render look, no photorealism, no soft shading.\n"}
P['p3-bus-hb-lean'] = MAN + "Pose: his near elbow rests on the window sill in front of him, his hand supports his chin/cheek, and his TEMPLE leans against the window glass. Tired, still, shoulders slumped." + BG
P['p3-bus-hb-read'] = MAN + "Pose: sitting upright, holding ONE small yellow square sticky note with BOTH hands at its EDGES (thumb and finger on the paper edge) at chest height in front of him, head bowed reading it." + BG
P['p3-bus-hb-lookup'] = MAN + "Pose: his WHOLE upper body straightened (torso upright, not only the head), his head raised looking forward and up out of the window, the yellow note still held at its edge between thumb and finger in his near hand lowered to his lap." + BG
P['p3-bus-hb-refl'] = HEAD + """Attached: (1) the APPROVED design of the man of this film (silk-screen style). Draw the SAME man, ONE figure, FULL BODY, nothing cropped, centred, in a flat SIDE VIEW (profile, camera at his eye level): seated ON THE FLOOR facing RIGHT, knees drawn up, arms wrapped around his knees, back straight and upright (as if his back leans against a wall to his left), head slightly bowed. Dark navy silhouette, messy hair, yellow sticky notes on his back and arms, thin cream rim line, no face detail. No wall, no floor drawn. Two arms, two legs.""" + BG
for k, v in P.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(v)
print(len(P), 'prompts')

# retry r1: the first attempts were pure profiles; the set (plate + style frame) is a three-quarter BACK view
FIX = "RETRY, the previous drawing was WRONG: it was a pure side profile. It must be a THREE-QUARTER BACK VIEW exactly like the man in image 3: the camera is behind and to the left of him; we see mostly his BACK (the sticky-note back wide and large), his left shoulder, the BACK and side of his head (hair from behind), only a hint of his right cheek/jaw edge; his torso is turned about 45 degrees away from us toward the right, his legs go forward to the right-front, foreshortened (thighs shorter than in profile, near knee large). "
R = {}
R['p3-bus-hb-lean-r1'] = MAN + FIX + "Pose: his near (left) elbow rests on a horizontal ledge in front of him at the height of his chest (the ledge itself is NOT drawn), forearm upright, his hand supporting his chin/cheek, and his head tilted so the TEMPLE leans against a vertical window glass at his right (glass NOT drawn). Tired, still." + BG
R['p3-bus-hb-read-r1'] = MAN + FIX + "Pose: sitting upright, holding ONE small yellow square sticky note with BOTH hands at its EDGES (thumb and finger on the paper edge) at chest height in front of him, head bowed reading it." + BG
R['p3-bus-hb-lookup-r1'] = MAN + FIX + "Pose: his WHOLE upper body straightened (torso upright, not only the head), his head raised looking forward-right and up, the yellow note still held at its edge between thumb and finger in his near hand lowered to his lap." + BG
for k, v in R.items():
    open(os.path.join(HERE, k + '.txt'), 'w', encoding='utf8').write(v)
