"""Build the w-layers round: for each held painting a clean plate (no girls), the girls alone on flat green, and two
in-betweens of the girls (drawn from the green base) for a stepped loop."""
import json, os, sys
root = sys.argv[1]; rd = os.path.join(root, 'stil/prompts/w-layers'); os.makedirs(rd + '/out', exist_ok=True)
HEAD = "Use your built-in image_gen tool to generate ONE image, then copy it from $CODEX_HOME/generated_images/... into the current directory as ./{OUT}\n\n"
TAIL = "\n\nOutput: 16:9 landscape at the same size and framing as the attached image (for example 1672x941).\n- ABSOLUTELY NO text, letters, numbers, logos or watermarks. No border.\n\nAfter copying, print the output path and pixel size."
BG = ("The attached image is a finished painting from a music video (two girls, one with ORANGE hair, one with BLUE hair).\n\n"
      "Task: paint the SAME image with BOTH girls completely removed, as an empty set: repaint everything that was behind them "
      "(floor, stage, sky, lights, buildings, crowd) as a natural continuation, in exactly the same painterly style, light and colours. "
      "Everything else stays EXACTLY where it is: same camera, same framing, same composition, same objects. "
      "Leave no ghost, outline, shadow, held object or empty silhouette of the girls; their instruments, microphone and anything they hold go with them.")
FG = ("The attached image is a finished painting from a music video (two girls, one with ORANGE hair, one with BLUE hair).\n\n"
      "Task: keep ONLY the two girls (with their hair, outfits, boots and anything they hold or wear) EXACTLY as they are: "
      "same pose, same position in the frame, same size, same lighting and colours, same rim light. "
      "Replace EVERYTHING else (background, floor, effects, confetti, sparks, any object they do not hold) with a perfectly flat, uniform pure green #00FF00. "
      "No shadow, glow, reflection or gradient on the green; crisp edges between the girls and the green, every hair strand kept.")
LOOP = ("The attached image shows two girls (ORANGE hair and BLUE hair) on a flat pure green #00FF00 background: drawing A of a short stepped animation loop.\n\n"
        "Task: draw drawing {K} of the loop: the SAME two girls, same outfits, same style, same lighting, same size and the same place in the frame, "
        "on the same flat pure green #00FF00 (no shadow, glow or gradient on it). Change ONLY this: {MOVE} "
        "Keep the change small and natural, like the next drawing of a hand-drawn animation; do not flip, rotate or move the bodies elsewhere.")
MOVES = {
 'RK1': ['a slow breath in: the shoulders of both girls rise a little, the heads tilt a touch toward each other, the hair sways slightly.',
         'the breath out: shoulders sink, small relaxed smiles, the hair settling the other way.'],
 'RK2': ['the hair of both girls flows further out, as if a wind rises between them; eyes a little more closed.',
         'the hair flows back the other way; both chins lift slightly, the hands pressed together a little harder.'],
 'RK11': ['the next step of their walk: the legs that were forward are now passing under the hips, the hair and coat swinging with the step.',
          'the opposite stride: the other legs forward, the hair and coat swinging the other way.'],
 'RK12': ['a little higher in the jump: the hair flying further up, the kicked legs spread a little wider, mouths open wider shouting.',
          'the top of the jump: the raised arms stretched higher, the hair whipping out, the boots kicked a little further.'],
}
items = []
for pid in MOVES:
    wide = f'stil/prompts/w-wide/out/{pid}-wide.png'
    def add(kind, body, refs):
        pp = f'stil/prompts/w-layers/{pid}-{kind}.prompt.txt'
        open(os.path.join(root, pp), 'w', encoding='utf-8').write(HEAD.replace('{OUT}', f'{pid}-{kind}.png') + body + TAIL)
        items.append({'id': f'{pid}-{kind}', 'prompt': pp, 'refs': refs, 'out': f'stil/prompts/w-layers/out/{pid}-{kind}.png'})
    add('bg', BG, [wide]); add('fg', FG, [wide])
    fg = f'stil/prompts/w-layers/out/{pid}-fg.png'
    add('fgb', LOOP.replace('{K}', 'B').replace('{MOVE}', MOVES[pid][0]), [fg])
    add('fgc', LOOP.replace('{K}', 'C').replace('{MOVE}', MOVES[pid][1]), [fg])
json.dump(items, open(rd + '/round.json', 'w'), indent=1); print(len(items), 'items')
