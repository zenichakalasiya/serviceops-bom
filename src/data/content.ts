/**
 * Static record content for PCH-4811, transcribed from the captured surfaces.
 * Table rows live in the generated `tables.ts`; this is everything that is not
 * a table.
 */

export const record = {
  id: 'PCH-4811',
  title: '2026-04 Cumulative Update for Windows 11 Version 23H2 for x64 (KB5036894)',
  category: 'Security Updates',
  severity: 'Critical',
  releaseDate: 'Apr 14, 2026',
  kb: 'KB5036894',
} as const;

export const products = [
  'Microsoft Windows Server 2022 Standard',
  'Microsoft Windows Server 2022 Datacenter',
  'Microsoft Windows Server 2019 Standard',
  'Microsoft Windows Server 2019 Datacenter',
  'Microsoft Windows Server 2016 Standard',
  'Microsoft Windows 11 Enterprise',
  'Microsoft Windows 11 Pro',
  'Microsoft Windows 11 Education',
  'Microsoft Windows 10 Enterprise',
  'Microsoft Windows 10 Pro',
];

export const files = [
  { name: 'officedeploymenttool_19822.20114.exe', sub: '3.52 MB Â· Language: all' },
  { name: 'windows11.0-kb5036893-x64.msu', sub: '287.4 MB Â· Language: en-US' },
];

export interface Deployment {
  id: string; host: string; status: 'Yet to Receive' | 'Success' | 'Failed';
  ip: string; config: string; date: string; retry: string;
  download: string; downloadOk: boolean; task: string;
}
export const deployments: Deployment[] = [
  { id: 'EP-380', host: 'ACIWSUSV-01', status: 'Yet to Receive', ip: '192.168.1.13',
    config: 'Install', date: '---', retry: '0', download: 'Success', downloadOk: true,
    task: 'Manual Remote Deployment' },
  { id: 'EP-397', host: 'Jevyjava-LT', status: 'Success', ip: '192.168.112.75',
    config: 'Install', date: 'Mon, Jul 20, 2026 04:58 PM', retry: '0', download: 'Success',
    downloadOk: true, task: 'Manual Remote Deployment' },
  { id: 'EP-400', host: 'PARTH-UPADHYAY', status: 'Failed', ip: '192.168.1.75',
    config: 'Install', date: 'Mon, Jul 20, 2026 03:40 PM', retry: '2', download: 'Failed',
    downloadOk: false, task: 'Manual Remote Deployment' },
];

export interface GraphNode { kb: string; title: string; build: string; count?: number }
/** Patches that supersede this one (rendered above the record). */
export const supersededBy: GraphNode[] = [
  { kb: 'KB5077891', title: '2026-02 Cumulative Upâ€¦', build: '26200.8012', count: 2 },
  { kb: 'KB5081234', title: '2026-03 Cumulative Upâ€¦', build: '26200.8455', count: 2 },
  { kb: 'KB5085602', title: '2026-04 Cumulative Upâ€¦', build: '26200.8890' },
];
/** Patches this one supersedes (rendered below the record). */
export const supersedes: GraphNode[] = [
  { kb: 'KB5068861', title: '2025-11 Cumulative Upâ€¦', build: '26200.7171' },
  { kb: 'KB5066835', title: '2025-10 Cumulative Upâ€¦', build: '26200.6899', count: 2 },
  { kb: 'KB5065789', title: '2025-09 Cumulative Upâ€¦', build: '26200.6725' },
  { kb: 'KB5065426', title: '2025-09 Cumulative Upâ€¦', build: '26200.6584' },
  { kb: 'KB5064081', title: '2025-08 Cumulative Upâ€¦', build: '26200.5074' },
  { kb: 'KB5063878', title: '2025-08 Cumulative Upâ€¦', build: '26200.4946', count: 2 },
];

export interface AuditEntry {
  initials: string; colour: string; who: string; action: string; time: string;
  desc: string; change?: { field: string; from: string; to: string };
}
export const auditTrail: { day: string; entries: AuditEntry[] }[] = [
  { day: 'Sat, Jun 20, 2026', entries: [
    { initials: 'RR', colour: 'var(--color-primary)', who: 'Rakesh Rathod',
      action: 'Patch Approved', time: '4:39 PM',
      desc: 'Approved the patch for deployment',
      change: { field: 'Approval Status', from: 'Not Approved', to: 'Approved' } },
    { initials: 'DP', colour: 'var(--color-violet)', who: 'Dharti Parikh',
      action: 'Test Status Updated', time: '2:12 PM',
      desc: 'Marked the patch as passed in the pilot test ring',
      change: { field: 'Test Status', from: 'Not Tested', to: 'Passed' } },
    { initials: 'SY', colour: 'var(--color-ok)', who: 'System',
      action: 'Patch Downloaded', time: '11:05 AM',
      desc: 'Downloaded the patch package (3.77 MB) to the file server',
      change: { field: 'Download Status', from: '---', to: 'Success' } },
  ]},
  { day: 'Fri, May 22, 2026', entries: [
    { initials: 'JS', colour: 'var(--color-warn)', who: 'Jainam Shah',
      action: 'Added to Deployment', time: '5:30 PM',
      desc: 'Added the patch to deployment "April 2026 Patch Tuesday" (PDR-1433)' },
    { initials: 'SY', colour: 'var(--color-ok)', who: 'System',
      action: 'Patch Synced', time: '10:14 AM',
      desc: 'Patch discovered and synced from the vendor catalog by the patch scan' },
  ]},
];

export type FieldValue =
  | { kind: 'text'; text: string }
  | { kind: 'empty' }
  | { kind: 'dot'; dot: string; text: string }
  | { kind: 'link'; href: string }
  | { kind: 'tags'; tags: string[] };

export const patchFields: { key: string; value: FieldValue }[] = [
  { key: 'Patch Category',    value: { kind: 'text', text: 'Updates' } },
  { key: 'Severity',          value: { kind: 'dot', dot: 'rgb(17 24 39)', text: 'Low' } },
  { key: 'Approval Status',   value: { kind: 'dot', dot: 'var(--color-ok)', text: 'Approved' } },
  { key: 'Test Status',       value: { kind: 'text', text: 'Not Tested' } },
  { key: 'Release Date',      value: { kind: 'text', text: '01 Feb 2026' } },
  { key: 'KB Number',         value: { kind: 'empty' } },
  { key: 'Superseded Status', value: { kind: 'text', text: 'No' } },
  { key: 'Bulletin Id',       value: { kind: 'empty' } },
  { key: 'Refrence Url',      value: { kind: 'link', href: 'https://www.win-rar.com/support.html' } },
  { key: 'Tags',              value: { kind: 'tags', tags: ['production', 'critical'] } },
  { key: 'UUID',              value: { kind: 'text', text: 'win_rar-windows-x64-exe-7.20' } },
  { key: 'Architecture',      value: { kind: 'text', text: '64 BIT' } },
  { key: 'Source',            value: { kind: 'text', text: 'Patch Scanning' } },
  { key: 'Status',            value: { kind: 'text', text: 'Published' } },
];

export const shortcuts: { group: string; rows: [string, string[]][] }[] = [
  { group: 'Window',     rows: [['Close tab', ['Esc']], ['Next tab', ['Alt', 'M']], ['Maximise', ['Alt', 'W']]] },
  { group: 'Navigation', rows: [['Search', ['Ctrl', 'F']], ['Overview', ['G', 'O']], ['Audit Trail', ['G', 'A']]] },
  { group: 'Actions',    rows: [['Approve', ['A']], ['Decline', ['D']], ['Deploy', ['Ctrl', 'D']]] },
  { group: 'Help',       rows: [['Shortcuts', ['?']]] },
];

/** Module names for the left rail, in on-screen order. Only Vulnerabilities is
 *  in scope â€” the rest are labelled from their icons. */
export const modules = ['Dashboard', 'Requests', 'Users', 'Workflow', 'Release', 'Assets',
  'Reports', 'Vulnerabilities', 'Automation', 'Inventory', 'Topology', 'Knowledge',
  'Analytics', 'Approvals', 'Tasks', 'Teams'];
