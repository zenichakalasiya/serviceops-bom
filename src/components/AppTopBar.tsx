import Svg from './Svg';
import { useToast } from '../lib/toast';

/**
 * Product header shown above listing pages: 56px, logo left, action cluster
 * right (7 × 32px, 8px gap, ending in the avatar). Measured from the capture.
 */
const ACTIONS = [
  { icon: 'plus', label: 'Create', primary: true },
  { icon: 'calendar', label: 'Calendar' },
  { icon: 'bell', label: 'Notifications' },
  { icon: 'settings', label: 'Settings' },
  { icon: 'keyboard', label: 'Shortcuts' },
  { icon: 'info', label: 'Help' },
];

export default function AppTopBar() {
  const toast = useToast();
  return (
    <header className="topbar">
      <div className="logo" aria-label="Motadata">
        <span className="mota">mota</span><span className="data">data</span>
      </div>
      <div className="topactions">
        {ACTIONS.map((a) => (
          <button key={a.label} className={'topbtn' + (a.primary ? ' primary' : '')}
            title={a.label} aria-label={a.label} onClick={() => toast(a.label)}>
            <Svg name={a.icon} />
          </button>
        ))}
        <button className="avatar-btn" title="Account" onClick={() => toast('Account')}>AS</button>
      </div>
    </header>
  );
}
