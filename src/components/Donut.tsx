/**
 * Donut chart, matching the product's exactly.
 *
 * Measured spec: viewBox "0 0 100 100" painted into a 104px box, r=40,
 * stroke-width=16, track #F1F5F9, and NO rotation — the arcs start at 3
 * o'clock, which is what puts the remainder segment at the top-left. Getting
 * any of those four wrong is immediately visible in a pixel diff.
 */
export interface Segment { name: string; value: number; colour: string }

const R = 40;
const C = 2 * Math.PI * R;

export default function Donut({ total, segments }: { total: number; segments: Segment[] }) {
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100">
        <circle className="track" cx="50" cy="50" r={R} fill="none" strokeWidth="16" />
        {segments.map((s) => {
          const len = total ? C * (s.value / total) : 0;
          const dash = `${len} ${C - len}`;
          const off = -offset;
          offset += len;
          return (
            <circle key={s.name} cx="50" cy="50" r={R} fill="none" stroke={s.colour}
              strokeWidth="16" strokeDasharray={dash} strokeDashoffset={off} />
          );
        })}
      </svg>
      <div className="mid">
        <span className="num">{total}</span>
        <span className="lbl">Total</span>
      </div>
    </div>
  );
}

export function Legend({ segments }: { segments: Segment[] }) {
  return (
    <div className="legend">
      {segments.map((s) => (
        <div className="row" key={s.name}>
          <span className="d" style={{ background: s.colour }} />
          <span className="n">{s.name}</span>
          <span className="v">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
