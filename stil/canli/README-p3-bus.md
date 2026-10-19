# Part 3, lane bus (night-bus plate + the man in the window seat)
Generations: 1 plate + 4 poses + 3 retries = 8 (Codex window did not fill).
- Plate: ham/p3-bus-int.png (raw) came with the window on the LEFT and the seat facing left; it was MIRRORED
  (ham/p3-bus-int-flip.png) to match style frame 01 (window right, man faces right). bus-int.png = mirrored, keyed, untrimmed 1672x941.
  Magenta glass: main window plus the small back windows (all keyed to alpha).
- Plate points (flipped px): window TL(635,158) TR(1604,0) BR(1596,708) BL(700,578) (top edge runs out of frame, TR clipped
  to y=0); sill (745,592)-(1604,712); seat (565,805); seatBack (540,425).
- Men: first attempts (hb-lean/read/lookup) were pure side profiles = rejected (set is three-quarter back). Retries r1 chosen.
  hb-refl first try accepted (flat side view, barefoot).
- Fit (hips=seat, scale 1.1 for all three): see sprites-p3-bus.json `fit` {scale,dx,dy} = sprite top-left in plate px.
- Weak spots: hb-lean's hand-on-chin is drawn with no sill under the elbow (sill/glass not drawn); temple point is at the
  forehead edge, the head overlaps the window region but the exact glass contact is by eye. The men have bare feet/shoes
  that reach the plate bottom edge (cropped by frame, fine). Cream rim on hair has a faint pink fringe from keying.
- hb-refl backX/floorY in sprite px: 20 / 692.
