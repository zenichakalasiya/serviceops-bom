import Drawer from '../../../components/Drawer';
import { scanHistory, versions } from '../../../data/bomTab';

/**
 * Opened from the connector between two version cards.
 *
 * Titled by the INTERVAL, not the version: these runs are what happened between
 * the previous version and this one. Most find nothing; the run that finds a
 * difference is the one that produced the new version.
 */
export default function ScanHistory({
  versionId, onClose,
}: {
  /** null when closed */
  versionId: string | null;
  onClose: () => void;
}) {
  const runs = versionId ? scanHistory[versionId] ?? [] : [];
  const i = versions.findIndex((v) => v.id === versionId);
  const previous = i >= 0 ? versions[i + 1] : undefined;
  const current = i >= 0 ? versions[i] : undefined;

  const title = !current ? 'Scan history'
    : previous ? `Scans between ${previous.label} and ${current.label}`
    : `Initial scan — ${current.label}`;

  const subtitle = !current ? ''
    : previous
      ? `${runs.length} run${runs.length === 1 ? '' : 's'} · the last one produced ${current.label}`
      : `${runs.length} run${runs.length === 1 ? '' : 's'} · first BOM generated`;

  return (
    <Drawer open={!!versionId} onClose={onClose} width={640} title={title} subtitle={subtitle}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <table className="scantable">
        <thead>
          <tr>
            <th>Timestamp</th><th>Trigger</th><th>Duration</th><th>Result</th><th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r, idx) => {
            // newest first, so index 0 is the run that produced this version
            const produced = idx === 0 && r.result === 'Success';
            return (
              <tr key={r.timestamp}>
                <td>{r.timestamp}</td>
                <td className="psource">{r.trigger}</td>
                <td>{r.duration}</td>
                <td>
                  <span className={'chip ' + (r.result === 'Success' ? 'ok' : 'fail')}>{r.result}</span>
                </td>
                <td>
                  {produced && current
                    ? <span className="outcome made">{r.delta} → {current.label}</span>
                    : <span className="pmeta">{r.delta === 'no change' ? 'no change' : r.delta}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Drawer>
  );
}
