import { useState } from 'react';
import Svg from './Svg';
import { leftRail } from '../icons/lucide';
import { modules } from '../data/content';
import { useToast } from '../lib/toast';

/** A hover flyout hanging off a rail item, matching the product's own treatment. */
export interface RailFlyout {
  /** panel heading, e.g. "BOM" */
  title: string;
  /** small badge beside the heading, e.g. "NEW" */
  badge?: string;
  items: { label: string; icon: string; onClick?: () => void; active?: boolean }[];
}

export interface RailEntry {
  /** raw SVG markup (product glyphs) … */
  markup?: string;
  /** … or a lucide name from the captured set */
  icon?: string;
  label: string;
  flyout?: RailFlyout;
  onClick?: () => void;
}

/**
 * The 54px module rail. `extra` entries are appended after the captured product
 * icons — that is how BOM is added without disturbing the measured 16.
 */
export default function IconRail({
  active, extra = [], activeExtra, onSelectModule,
}: {
  /** index into the captured product rail, or -1 when an `extra` entry is active */
  active: number;
  extra?: RailEntry[];
  /** label of the active extra entry, if any */
  activeExtra?: string;
  /** return true if the click was handled as navigation */
  onSelectModule?: (index: number) => boolean;
}) {
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="iconrail">
      {leftRail.map((svg, i) => (
        <button key={i} className={i === active ? 'active' : ''} title={modules[i]}
          onMouseEnter={() => setOpen(null)}
          onClick={() => {
            if (i === active) return;
            if (onSelectModule?.(i)) return;
            toast(`${modules[i]} — module not in scope`);
          }}>
          <Svg markup={svg} />
        </button>
      ))}

      {extra.map((e) => (
        <div key={e.label} className="railitem"
          onMouseEnter={() => setOpen(e.flyout ? e.label : null)}
          onMouseLeave={() => setOpen(null)}>
          <button className={e.label === activeExtra ? 'active' : ''} title={e.label}
            onClick={() => e.onClick?.()}>
            {e.markup ? <Svg markup={e.markup} /> : <Svg name={e.icon ?? ''} />}
          </button>

          {e.flyout && open === e.label && (
            <div className="railflyout" role="menu">
              <div className="railflyout-head">
                {e.flyout.title}
                {e.flyout.badge && <span className="railbadge">{e.flyout.badge}</span>}
              </div>
              {e.flyout.items.map((it) => (
                <button key={it.label} className={it.active ? 'active' : ''} role="menuitem"
                  onClick={() => { setOpen(null); it.onClick?.(); }}>
                  <Svg name={it.icon} />{it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
