import { useEffect, useRef, useState } from 'react';
import Svg from '../../components/Svg';

export interface DownloadFormat {
  id: string;
  label: string;
  hint: string;
}

/** The two serialisation formats a BOM can be exported as. */
export const BOM_FORMATS: DownloadFormat[] = [
  { id: 'cyclonedx', label: 'CycloneDX 1.6', hint: 'OWASP standard · what this BOM was generated as' },
  { id: 'spdx', label: 'SPDX 2.3', hint: 'Linux Foundation standard · converted on export' },
];

/**
 * Small confirm dialog for picking an export format.
 *
 * A menu fires the moment you pick, which is wrong here: the two formats are a
 * real choice with a consequence (SPDX is converted, not native), so the pick
 * and the commit are separated by an explicit Download.
 */
export default function DownloadDialog({
  open, title, subtitle, formats = BOM_FORMATS, onClose, onDownload,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  formats?: DownloadFormat[];
  onClose: () => void;
  onDownload: (format: DownloadFormat) => void;
}) {
  const [selected, setSelected] = useState(formats[0].id);
  const panel = useRef<HTMLDivElement>(null);

  // always reopen on the native format rather than remembering a stale pick
  useEffect(() => { if (open) setSelected(formats[0].id); }, [open, formats]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])');
      if (!f.length) return;
      const [first, last] = [f[0], f[f.length - 1]];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  const commit = () => {
    const f = formats.find((x) => x.id === selected);
    if (f) onDownload(f);
  };

  return (
    <>
      <div className="scrim" style={{ zIndex: 150 }} onClick={onClose} />
      <div className="dlg" ref={panel} tabIndex={-1} role="dialog" aria-modal="true"
        aria-label={title}>
        <header className="dlg-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="dlg-sub">{subtitle}</div>}
          </div>
          <button className="iconbtn" title="Close" aria-label="Close" onClick={onClose}>
            <Svg name="x" />
          </button>
        </header>

        <div className="dlg-body">
          <div className="radiogroup" role="radiogroup" aria-label="Export format">
            {formats.map((f) => (
              <label key={f.id} className={'radiorow' + (selected === f.id ? ' on' : '')}>
                <input type="radio" name="bom-format" value={f.id}
                  checked={selected === f.id}
                  onChange={() => setSelected(f.id)} />
                <span className="rtext">
                  <span className="rlabel">{f.label}</span>
                  <span className="rhint">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <footer className="dlg-foot">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={commit}>
            <Svg name="download" />Download
          </button>
        </footer>
      </div>
    </>
  );
}
