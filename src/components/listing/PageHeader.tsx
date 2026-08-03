import { useState } from 'react';
import Svg from '../Svg';
import Popover from './Popover';

export interface ToolbarAction {
  /** lucide icon name from the captured set */
  icon: string;
  label: string;
  onClick?: () => void;
  /** render a popover instead of firing onClick */
  popover?: (close: () => void) => React.ReactNode;
  active?: boolean;
  /** render as a labelled primary button rather than an icon-only tool */
  primary?: boolean;
}

/**
 * Listing page header: title, view switcher, and a right-aligned toolbar.
 * Generic — the BOM module reuses this with its own views and actions.
 */
export default function PageHeader({
  title, views, view, onViewChange, actions, children,
}: {
  title: string;
  /** omit to hide the view switcher (BOM uses segmented tabs instead) */
  views?: string[];
  view?: string;
  onViewChange?: (v: string) => void;
  actions: ToolbarAction[];
  /** rendered between the title and the toolbar — segmented tabs, summary strip … */
  children?: React.ReactNode;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="pagehead">
      <h1>{title}</h1>

      {views && view && (
        <div style={{ position: 'relative' }}>
          <button className="viewswitch" aria-expanded={viewOpen} aria-haspopup="menu"
            onClick={() => setViewOpen(!viewOpen)}>
            {view}<Svg name="chevron-down" />
          </button>
          <Popover open={viewOpen} onClose={() => setViewOpen(false)} align="left">
            <div className="grouplabel">Views</div>
            {views.map((v) => (
              <button key={v} className={v === view ? 'active' : ''} role="menuitem"
                onClick={() => { onViewChange?.(v); setViewOpen(false); }}>
                {v}
              </button>
            ))}
          </Popover>
        </div>
      )}

      {children}

      <div className="tools">
        {actions.map((a, i) => (
          <div key={a.label} style={{ position: 'relative' }}>
            <button
              className={a.primary
                ? 'btn-primary sm'
                : 'toolbtn' + (a.active || openIdx === i ? ' on' : '')}
              title={a.label} aria-label={a.label}
              onClick={() => {
                if (a.popover) setOpenIdx(openIdx === i ? null : i);
                else a.onClick?.();
              }}>
              <Svg name={a.icon} />{a.primary && a.label}
            </button>
            {a.popover && (
              <Popover open={openIdx === i} onClose={() => setOpenIdx(null)}>
                {a.popover(() => setOpenIdx(null))}
              </Popover>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
