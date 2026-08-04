import { useEffect, useRef, useState } from 'react';
import Svg from '../../components/Svg';

export interface DownloadFormat {
  id: string;
  label: string;
  hint: string;
  /** e.g. "Selected rows" with nothing selected */
  disabled?: boolean;
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
  open, title, subtitle, formats = BOM_FORMATS, scopes, onClose, onDownload,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  formats?: DownloadFormat[];
  /** optional second choice, e.g. selected rows vs the whole file */
  scopes?: DownloadFormat[];
  onClose: () => void;
  onDownload: (format: DownloadFormat, scope?: DownloadFormat) => void;
}) {
  const [selected, setSelected] = useState(formats[0].id);
  const [scope, setScope] = useState(scopes?.[0]?.id ?? '');
  const panel = useRef<HTMLDivElement>(null);

  // always reopen on the native format rather than remembering a stale pick
  useEffect(() => { if (open) setSelected(formats[0].id); }, [open, formats]);
  // default to the first *enabled* scope — "Selected rows" is disabled with an
  // empty selection, and preselecting it would leave Download doing nothing
  useEffect(() => {
    if (!open || !scopes?.length) return;
    setScope((scopes.find((s) => !s.disabled) ?? scopes[0]).id);
  }, [open, scopes]);

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
    if (f) onDownload(f, scopes?.find((x) => x.id === scope));
  };

  const group = (
    legend: string, items: DownloadFormat[], name: string,
    value: string, set: (v: string) => void,
  ) => (
    <fieldset className="radiogroup" aria-label={legend}>
      <legend className="rgroup-legend">{legend}</legend>
      {items.map((f) => (
        <label key={f.id} className={'radiorow' + (value === f.id ? ' on' : '')
          + (f.disabled ? ' off' : '')}>
          <input type="radio" name={name} value={f.id} checked={value === f.id}
            disabled={f.disabled} onChange={() => set(f.id)} />
          <span className="rtext">
            <span className="rlabel">{f.label}</span>
            <span className="rhint">{f.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );

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
          {scopes?.length ? group('What to export', scopes, 'bom-scope', scope, setScope) : null}
          {group('Format', formats, 'bom-format', selected, setSelected)}
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
