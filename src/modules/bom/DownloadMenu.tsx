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
 * Format picker, anchored to the control that opened it.
 *
 * Anchored rather than centred: this is a small follow-up to a button press,
 * not a context switch, so it opens where the user is already looking.
 *
 * There is no "what to export" choice — the selection decides it. Nothing
 * ticked exports the whole file; anything ticked exports just those rows. The
 * summary line states which of the two is about to happen so the rule is
 * visible rather than something you have to know.
 */
export default function DownloadMenu({
  open, onClose, onDownload, summary, formats = BOM_FORMATS, align = 'right',
}: {
  open: boolean;
  onClose: () => void;
  onDownload: (format: DownloadFormat) => void;
  /** e.g. "Exporting 3 selected components" */
  summary: string;
  formats?: DownloadFormat[];
  align?: 'left' | 'right';
}) {
  const [selected, setSelected] = useState(formats[0].id);
  const panel = useRef<HTMLDivElement>(null);

  // always reopen on the native format rather than remembering a stale pick
  useEffect(() => { if (open) setSelected(formats[0].id); }, [open, formats]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={'dlmenu' + (align === 'left' ? ' left' : '')} ref={panel} role="dialog"
      aria-label="Export format">
      <div className="dlmenu-sum">{summary}</div>

      <fieldset className="radiogroup" aria-label="Format">
        {formats.map((f) => (
          <label key={f.id} className={'radiorow' + (selected === f.id ? ' on' : '')}>
            <input type="radio" name="dl-format" value={f.id} checked={selected === f.id}
              onChange={() => setSelected(f.id)} />
            <span className="rtext">
              <span className="rlabel">{f.label}</span>
              <span className="rhint">{f.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="dlmenu-foot">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => {
          const f = formats.find((x) => x.id === selected);
          if (f) onDownload(f);
        }}>
          <Svg name="download" />Download
        </button>
      </div>
    </div>
  );
}
