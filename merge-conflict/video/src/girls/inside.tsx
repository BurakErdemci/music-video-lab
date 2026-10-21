// The girl becomes part of the type (scene-map.md "The girls are never wallpaper", 5).
//  KNOCKOUT: a flat colour field with huge letters cut out of it; the girl (in the canvas below) shows only
//    through the letters. The mask is on the SVG field, never on the WebGL canvas (the sibling measured
//    mosaic frames with CSS/SVG effects over the canvas).
//  FILL: the girl's rig-deformed silhouette, clipped, filled with rows of the line's text; the words light as
//    they are sung. The card itself is drawn dark behind (the caller sets flat/opacity).
import type { CameraPose } from '../camera/camera.ts';
import type { Placement } from '../cards/Card.tsx';
import { type Hex, mixHex, outQuad } from '../lib/ease.ts';
import type { Token } from '../lyrics/LyricLayer.tsx';
import { capOf, type Face, familyOf, widthOf } from '../type/fonts.tsx';
import { clean } from '../type/forms/common.tsx';
import { silhouetteD } from './silhouette.ts';

export interface KnockoutPlan { id: string; tokens: readonly Token[]; key: number; face: Face; field: Hex; edge: Hex }

/** The key word (or, before it is sung, the latest sung word) cut out of a full-frame field. */
export const Knockout = ({ plan, t }: { plan: KnockoutPlan; t: number }) => {
  const sung = plan.tokens.map((tk, i) => ({ tk, i })).filter((w) => t >= w.tk.start);
  if (!sung.length) return null;
  const cur = sung.some((w) => w.i === plan.key) ? plan.key : (sung.at(-1) as { i: number }).i;
  const tk = plan.tokens[cur] as Token;
  const text = clean(tk.text).toUpperCase();
  const size = Math.min(1700 / widthOf(text, 1, plan.face), 900 / capOf(plan.face));
  const x = 960 - widthOf(text, size, plan.face) / 2;
  const y = 540 + (size * capOf(plan.face)) / 2;
  const grow = 1 + 0.08 * (1 - outQuad((t - tk.start) / (10 / 60)));
  const id = `ko-${plan.id}`;
  const letters = (fill: string, stroke = 'none', sw = 0) => (
    <text x={x} y={y} fontFamily={familyOf(plan.face)} fontSize={size} fill={fill} stroke={stroke} strokeWidth={sw} transform={`translate(960 540) scale(${grow}) translate(-960 -540)`}>
      {text}
    </text>
  );
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080}>
          <rect width={1920} height={1080} fill="#fff" />
          {letters('#000')}
        </mask>
      </defs>
      <rect width={1920} height={1080} fill={plan.field} mask={`url(#${id})`} />
      {letters('none', plan.edge, 10)}
    </g>
  );
};

export interface FillPlan { id: string; tokens: readonly Token[]; key: number; card: string; at: Placement; pose: CameraPose; colors: readonly Hex[]; keyColor: Hex; size: number }

export const Fill = ({ plan, t }: { plan: FillPlan; t: number }) => {
  const d = silhouetteD(plan.card, plan.at, plan.pose, t);
  const words = plan.tokens.map((tk, i) => ({ text: clean(tk.text).toUpperCase(), i, tk }));
  const id = `fill-${plan.id}`;
  const rowH = plan.size * 1.05;
  const rows = Math.ceil(1080 / rowH) + 1;
  // the text runs on, row after row, offset per row so the words interlock; the rows drift down slowly
  const drift = (t * 40) % rowH;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: rows }, (_, r) => {
          let x = -((r * 173) % 600);
          const y = r * rowH + drift;
          const out = [];
          let k = r;
          while (x < 1920) {
            const w = words[k % words.length] as { text: string; i: number; tk: Token };
            const sung = t >= w.tk.start;
            const isKey = w.i === plan.key;
            const size = isKey ? plan.size * 1.25 : plan.size;
            const color = isKey ? plan.keyColor : (plan.colors[(r + k) % plan.colors.length] as Hex);
            out.push(
              <text key={k} x={x} y={y} fontFamily={familyOf(isKey ? 'display' : 'bebas')} fontSize={size} fill={sung ? color : mixHex(color, '#000000', 0.7)}>
                {w.text}
              </text>,
            );
            x += widthOf(`${w.text} `, size, isKey ? 'display' : 'bebas');
            k++;
          }
          return <g key={r}>{out}</g>;
        })}
      </g>
      <path d={d} fill="none" stroke={plan.keyColor} strokeWidth={5} strokeLinejoin="round" />
    </g>
  );
};
