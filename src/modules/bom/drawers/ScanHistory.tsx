import Drawer from '../../../components/Drawer';
import { scanHistory } from '../../../data/bomTab';

/** Opened from a version card's "N scans" link. */
export default function ScanHistory({
  versionId, onClose,
}: {
  /** null when closed */
  versionId: string | null;
  onClose: () => void;
}) {
  const runs = versionId ? scanHistory[versionId] ?? [] : [];

  return (
    <Drawer open={!!versionId} onClose={onClose} width={620}
      title={`Scan history — ${versionId ?? ''}`}
      subtitle={`${runs.length} run${runs.length === 1 ? '' : 's'}`}
      footer={<button className="btn-secondary" onClick={onClose}>Close</button>}
    >
      <table className="scantable">
        <thead>
          <tr>
            <th>Timestamp</th><th>Trigger</th><th>Duration</th><th>Result</th><th>Delta</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.timestamp}>
              <td>{r.timestamp}</td>
              <td className="psource">{r.trigger}</td>
              <td>{r.duration}</td>
              <td>
                <span className={'chip ' + (r.result === 'Success' ? 'ok' : 'fail')}>{r.result}</span>
              </td>
              <td className="pmeta">{r.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Drawer>
  );
}
