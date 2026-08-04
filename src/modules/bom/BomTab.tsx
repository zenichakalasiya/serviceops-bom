import { useState } from 'react';
import Svg from '../../components/Svg';
import Popover from '../../components/listing/Popover';
import { bomMeta, bomTypes, ctaLabel, label, products, scanPaths, versions } from '../../data/bomTab';
import type { BomType } from '../../data/bomTab';
import { useToast } from '../../lib/toast';
import ScanHistory from './drawers/ScanHistory';
import CompareVersions from './CompareVersions';
import DownloadMenu from './DownloadMenu';
import ComponentsDrawer from './drawers/ComponentsDrawer';

/**
 * BOM tab body.
 *
 * BOM **type** is the primary switch, product secondary. The product metadata
 * lives in the right rail (Other Info › BOM) rather than repeating in the main
 * column, so the column is just: scope → versions.
 */
export default function BomTab({
  productId, onProductChange, type, onTypeChange, onOpenComponents, onManagePaths,
}: {
  productId: string;
  onProductChange: (id: string) => void;
  type: BomType;
  onTypeChange: (t: BomType) => void;
  onOpenComponents: (versionId: string) => void;
  onManagePaths: () => void;
}) {
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [downloadFor, setDownloadFor] = useState<string | null>(null);
  const [drawerFor, setDrawerFor] = useState<string | null>(null);

  const product = products.find((p) => p.id === productId)!;
  const meta = bomMeta[productId]?.[type];
  const count = product.counts[type];
  const scanPath = scanPaths.find((p) => p.product === product.name)?.path;

  /* Compare is always available: it opens on the two most recent versions and
     the range is changed inside the modal, so there is nothing to select first. */
  const defaultRange: [string, string] =
    versions.length >= 2 ? [versions[1].id, versions[0].id] : [versions[0].id, versions[0].id];

  return (
    <>
      {/* ---- BOM type switcher (primary) -------------------------------- */}
      <div className="typerow">
        <div className="typeswitch" role="tablist" aria-label="BOM type">
          {bomTypes.map((t) => (
            <button key={t} role="tab" aria-selected={t === type}
              className={t === type ? 'active' : ''} onClick={() => onTypeChange(t)}>
              {t} <span className="n">· {product.counts[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- product & scope -------------------------------------------- */}
      <div className="sectionhead">
        <h3>Product &amp; scope</h3>
      </div>
      <div className="scoperow">
        <div>
          <div className="field-label">Product</div>
          <div style={{ position: 'relative' }}>
            <button className="selectbtn" aria-haspopup="listbox" aria-expanded={pickerOpen}
              onClick={() => setPickerOpen(!pickerOpen)}>
              <span className="optrow">
                <span>{product.name}</span>
                {product.version && <span className="ver">{product.version}</span>}
              </span>
              <span className="chev"><Svg name="chevron-down" /></span>
            </button>
            <Popover open={pickerOpen} onClose={() => setPickerOpen(false)} align="left">
              <div className="grouplabel">Products on this host</div>
              {products.map((p) => (
                <button key={p.id} className={p.id === productId ? 'active' : ''} role="option"
                  aria-selected={p.id === productId}
                  onClick={() => { onProductChange(p.id); setPickerOpen(false); }}>
                  <span className="optrow">
                    <span>{p.name}</span>
                    {p.version && <span className="ver">{p.version}</span>}
                    <span className={'badge' + (p.findings > 0 ? ' hot' : '')}>{p.findings}</span>
                  </span>
                </button>
              ))}
            </Popover>
          </div>
        </div>

        <button className="btn-secondary tall" onClick={onManagePaths}>
          <Svg name="settings" />Manage scan paths
        </button>
      </div>
      {/* names the actual scanned location for the selected product — a generic
          sentence told the user nothing they could act on */}
      <p className="scopehelp">
        {productId === 'os-base'
          ? <>Everything not claimed by another product on this host rolls up here.</>
          : <>Scanned at <code>{scanPath ?? '—'}</code> on this host · {count} components.</>}
      </p>

      {/* ---- versions ---------------------------------------------------- */}
      {count === 0 ? (
        <div className="panel-placeholder">
          <Svg name="layers" />
          <div>No {type} for {label(product)}. Selection is kept — pick another product to compare.</div>
        </div>
      ) : (
        <>
          <div className="sectionhead">
            <h3>{type} versions</h3>
            <span className="sectioncount">{versions.length}</span>
            <div className="right">
              <button className="btn-secondary btn-outline" onClick={() => setCompareOpen(true)}>
                <Svg name="columns3" />Compare versions
              </button>
            </div>
          </div>

          {/* A version only exists because a scan found a difference. The scan
              runs therefore belong to the INTERVAL between two versions, not to
              a version — so they render as the connector under each card,
              carrying how many ran and how many changed nothing. */}
          <div className="vercards">
            {versions.map((v, i) => {
              const previous = versions[i + 1];
              const quiet = Math.max(0, v.scans - 1);
              return (
              <div key={v.id}>
              <div className={'vercard' + (v.current ? ' current' : '')}>
                <div className="vcmain">
                  <div className="titleline">
                    <span className="vlabel">{v.label}</span>
                    <span className="vstamp">{v.generated}</span>
                    {v.current
                      ? <span className="chip-current">Current</span>
                      : <span className="chip-past">Superseded</span>}
                  </div>
                  <div className="delta">{v.delta}</div>
                </div>

                <span className="chip-meta">{meta?.format ?? 'CycloneDX 1.6'}</span>

                {/* icon actions use the header's icon-button treatment, with an
                    instant tooltip — the native title attribute has a ~1s delay */}
                <div className="vcacts">
                  {/* format menu opens beside the button, not centre-screen */}
                  <div style={{ position: 'relative' }}>
                    <button className="iconbtn tip" data-tip="Download BOM"
                      aria-label={`Download ${v.label}`} aria-haspopup="dialog"
                      onClick={() => setDownloadFor(downloadFor === v.id ? null : v.id)}>
                      <Svg name="download" />
                    </button>
                    <DownloadMenu
                      open={downloadFor === v.id} onClose={() => setDownloadFor(null)}
                      summary={`Downloading ${type} ${v.label} — ${meta?.components ?? count} components`}
                      onDownload={(f) => {
                        toast(`Download ${type} ${v.label} — ${f.label}`);
                        setDownloadFor(null);
                      }}
                    />
                  </div>
                  {/* only the current version can be re-scanned — a superseded
                      BOM is a historical record, re-scanning it is meaningless */}
                  {v.current && (
                    <button className="iconbtn tip" data-tip="Re-scan components"
                      aria-label={`Re-scan ${v.label}`}
                      onClick={() => toast(`Re-scan components — ${v.label}`)}>
                      <Svg name="refresh-cw" />
                    </button>
                  )}
                  {/* v2 opens the drawer; v1 and v3 keep the full page, so the
                      two presentations can be compared on the same content */}
                  <button className="viewlink"
                    onClick={() => (v.id === 'v2' ? setDrawerFor(v.id) : onOpenComponents(v.id))}>
                    {ctaLabel[type]} · {count}
                  </button>
                </div>
              </div>

              <button className="scaninterval" onClick={() => setHistoryFor(v.id)}>
                <span className="node" aria-hidden="true" />
                <span className="txt">
                  {previous
                    ? <>
                        <b>{v.scans} scans</b> between {previous.label} and {v.label}
                        {quiet > 0 && <> · {quiet} found no change</>}
                      </>
                    : <><b>{v.scans} scan</b> · initial agent scan, first {type} generated</>}
                </span>
                <span className="go">View</span>
              </button>
              </div>
              );
            })}
          </div>
        </>
      )}

      <ScanHistory versionId={historyFor} onClose={() => setHistoryFor(null)} />

      <ComponentsDrawer
        open={!!drawerFor} onClose={() => setDrawerFor(null)}
        productId={productId} type={type} versionId={drawerFor ?? ''}
      />


      <CompareVersions
        open={compareOpen} onClose={() => setCompareOpen(false)}
        productId={productId} type={type} initial={defaultRange}
      />
    </>
  );
}
