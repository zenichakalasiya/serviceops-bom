import type { ReactNode } from 'react';
import Svg from './Svg';

interface HeadProps {
  title: string;
  /** lucide icon name for the tinted chip */
  icon: string;
  tintBg: string;
  tintFg: string;
  moreLabel: string;
  onMore?: () => void;
}

export function CardHead({ title, icon, tintBg, tintFg, moreLabel, onMore }: HeadProps) {
  return (
    <div className="card-head">
      <span className="card-ico" style={{ background: tintBg, color: tintFg }}>
        <Svg name={icon} />
      </span>
      <span className="card-title">{title}</span>
      <button className="more" onClick={onMore}>
        {moreLabel}<Svg name="chevron-right" />
      </button>
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export interface ListRow { icon: string; title: string; sub: string }

export function CardRows({ rows, actions }: { rows: ListRow[]; actions?: (r: ListRow) => ReactNode }) {
  return (
    <div className="rows">
      {rows.map((r) => (
        <div className="row-item" key={r.title}>
          <span className="row-ico"><Svg name={r.icon} /></span>
          <div className="row-text">
            <div className="row-t">{r.title}</div>
            <div className="row-s">{r.sub}</div>
          </div>
          {actions?.(r)}
        </div>
      ))}
    </div>
  );
}
