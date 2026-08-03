/**
 * BOM module data.
 *
 * The six configuration items are exactly the rows given in the brief (Image C)
 * — no invented rows or columns. The endpoint detail record is EP-4.
 */

export type BomStatus = 'Generated' | 'Partial';
export type CiScope = 'Agent CIs' | 'Managed CIs';

export interface ConfigItem {
  ci: string;
  hostName: string;
  ip: string;
  os: string;
  status: BomStatus;
  products: number;
  components: number;
  findings: number;
  /** null renders as an em-dash, per the brief */
  cryptoAssets: number | null;
  lastGenerated: string;
  scope: CiScope;
  health: 'Healthy' | 'Warning' | 'Critical';
}

export const configItems: ConfigItem[] = [
  { ci: 'EP-4', hostName: 'WIN-6SA2JMQEV36', ip: '172.16.13.48', os: 'Microsoft Windows Server 2019',
    status: 'Generated', products: 3, components: 312, findings: 7, cryptoAssets: 9,
    lastGenerated: 'Jun 16, 2026', scope: 'Agent CIs', health: 'Healthy' },
  { ci: 'EP-3', hostName: 'WIN-9IGL1TLLAKN', ip: '172.16.12.228', os: 'Microsoft Windows Server 2022',
    status: 'Generated', products: 2, components: 284, findings: 4, cryptoAssets: 2,
    lastGenerated: 'Jun 16, 2026', scope: 'Agent CIs', health: 'Healthy' },
  { ci: 'EP-1', hostName: 'WIN-GONKABA3FFG', ip: '172.16.12.239', os: 'Microsoft Windows Server 2025',
    status: 'Generated', products: 1, components: 251, findings: 3, cryptoAssets: 1,
    lastGenerated: 'Jun 15, 2026', scope: 'Agent CIs', health: 'Healthy' },
  { ci: 'EP-5', hostName: 'WIN-S89SRH2KET7', ip: '172.16.13.45', os: 'Microsoft Windows Server 2025',
    status: 'Generated', products: 1, components: 176, findings: 1, cryptoAssets: null,
    lastGenerated: 'Jun 14, 2026', scope: 'Agent CIs', health: 'Healthy' },
  { ci: 'EP-6', hostName: 'DESKTOP-G4S7FTB', ip: '172.16.12.246', os: 'Microsoft Windows 10 Enterprise',
    status: 'Generated', products: 1, components: 142, findings: 0, cryptoAssets: 1,
    lastGenerated: 'Jun 12, 2026', scope: 'Agent CIs', health: 'Healthy' },
  { ci: 'EP-2', hostName: 'DESKTOP-G4S7FTB', ip: '172.16.12.222', os: 'Microsoft Windows 10 Enterprise',
    status: 'Partial', products: 1, components: 88, findings: 0, cryptoAssets: null,
    lastGenerated: 'Jun 09, 2026', scope: 'Agent CIs', health: 'Healthy' },
];

/**
 * Segmented scope counts.
 *
 * All six supplied rows are Agent CIs (Image C shows them under `Agent CIs · 6`).
 * The brief states `Managed CIs · 1` but does not supply that row, and the brief
 * forbids inventing rows — so the count is taken as given and the Managed CIs
 * tab renders its empty state until the row is provided.
 */
export const scopeCounts: Record<CiScope, number> = {
  'Agent CIs': 6,
  'Managed CIs': 1,
};

/** Right-aligned summary strip above the grid. */
export const inventorySummary = [
  { value: '9', label: 'products' },
  { value: '13', label: 'crypto assets' },
  { value: '6', label: 'covered' },
  { value: '0', label: 'pending', muted: true },
];

/* ---------------------------------------------------------------------------
   Endpoint detail — EP-4 / WIN-6SA2JMQEV36
   --------------------------------------------------------------------------- */

export const endpointTabs = [
  'Vulnerabilities', 'BOM', 'Products & scan scopes', 'Patches',
  'Installation', 'Notes', 'Audit Trail',
] as const;

export interface EndpointDetailRecord {
  id: string;
  hostName: string;
  timestamp: string;
  /** the header field strip, in order */
  fields: { label: string; value: string; dot?: string }[];
  otherInfo: { label: string; value: string; link?: boolean }[];
  scanInfo: { label: string; value: string; note?: string; noteTone?: 'progress' | 'ok' }[];
}

export const endpoint: EndpointDetailRecord = {
  id: 'EP-4',
  hostName: 'WIN-6SA2JMQEV36',
  timestamp: 'Tue, Jun 16, 2026 04:12 PM',
  fields: [
    { label: 'System Health', value: 'Healthy', dot: 'var(--color-ok)' },
    { label: 'Used By', value: 'test_b' },
    { label: 'IP Address', value: '172.16.13.48' },
    { label: 'Host Name', value: 'WIN-6SA2JMQEV36' },
    { label: 'Architecture', value: '64 BIT' },
    { label: 'OS Name', value: 'Microsoft Windows Server 2019' },
  ],
  otherInfo: [
    { label: 'Asset ID', value: 'AST-4', link: true },
    { label: 'CI ID', value: 'CI-1', link: true },
    { label: 'Agent ID', value: 'AGENT-4', link: true },
    { label: 'Reboot Required', value: 'No' },
    { label: 'Agent Version', value: '8.7.408' },
    { label: 'MAC Address', value: '00:50:56:9E:5F:85' },
    { label: 'Domain Name', value: 'WORKGROUP' },
    { label: 'Remote Office', value: 'Local Office' },
    { label: 'Last Logged In User', value: 'test_b' },
    { label: 'Language', value: 'English (United States)' },
  ],
  scanInfo: [
    { label: 'Patch Scan Date', value: 'Tue, Jun 16, 2026 08:33 AM', note: 'In Progress', noteTone: 'progress' },
    { label: 'Vulnerability Scan Date', value: 'Sun, Jun 14, 2026 04:07 PM', note: 'In Progress', noteTone: 'progress' },
    { label: 'SBOM (agent)', value: 'v3 · current', note: 'CycloneDX 1.6', noteTone: 'ok' },
  ],
};
