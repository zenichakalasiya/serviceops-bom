/**
 * BOM tab data for EP-4 / WIN-6SA2JMQEV36.
 *
 * Counts are product-scoped: the type switcher, the version cards and the
 * BOM Info rail section all re-read from here when the product changes.
 */

export type BomType = 'SBOM' | 'CBOM' | 'AI BOM';
export const bomTypes: BomType[] = ['SBOM', 'CBOM', 'AI BOM'];

export interface HostProduct {
  id: string;
  name: string;
  /** null for the OS / base platform pseudo-product */
  version: string | null;
  findings: number;
  counts: Record<BomType, number>;
}

export const products: HostProduct[] = [
  { id: 'payments-web', name: 'Payments Web', version: '2.4.1', findings: 6,
    counts: { SBOM: 187, CBOM: 5, 'AI BOM': 5 } },
  { id: 'reporting-service', name: 'Reporting Service', version: '3.1.0', findings: 1,
    counts: { SBOM: 88, CBOM: 2, 'AI BOM': 0 } },
  { id: 'os-base', name: 'OS / base platform', version: null, findings: 0,
    counts: { SBOM: 37, CBOM: 3, 'AI BOM': 0 } },
];

/** Spec §3: the product dropdown defaults to the OS / base platform entry. */
export const defaultProductId = 'os-base';

export const label = (p: HostProduct) => (p.version ? `${p.name} ${p.version}` : p.name);

/** CTA label per BOM type — spec §7. */
export const ctaLabel: Record<BomType, string> = {
  SBOM: 'View components',
  CBOM: 'View crypto assets',
  'AI BOM': 'View models',
};

/* ---- version history ------------------------------------------------------ */

export interface BomVersion {
  id: string;
  label: string;
  generated: string;
  delta: string;
  scans: number;
  current?: boolean;
}

export const versions: BomVersion[] = [
  { id: 'v3', label: 'v3', generated: 'Jun 16, 2026 08:33 AM',
    delta: '+2 components · 1 removed', scans: 3, current: true },
  { id: 'v2', label: 'v2', generated: 'Jun 09, 2026 06:12 AM', delta: '+5 components', scans: 2 },
  { id: 'v1', label: 'v1', generated: 'May 30, 2026 06:40 PM', delta: 'initial agent scan', scans: 1 },
];

export interface ScanRun {
  timestamp: string;
  trigger: 'scheduled' | 'manual' | 'agent';
  duration: string;
  result: 'Success' | 'Failed';
  delta: string;
}
export const scanHistory: Record<string, ScanRun[]> = {
  v3: [
    { timestamp: 'Jun 16, 2026 08:33 AM', trigger: 'scheduled', duration: '2m 14s', result: 'Success', delta: '+2 · −1' },
    { timestamp: 'Jun 15, 2026 08:31 AM', trigger: 'scheduled', duration: '2m 02s', result: 'Success', delta: 'no change' },
    { timestamp: 'Jun 14, 2026 11:20 PM', trigger: 'manual', duration: '1m 58s', result: 'Failed', delta: '—' },
  ],
  v2: [
    { timestamp: 'Jun 09, 2026 06:12 AM', trigger: 'scheduled', duration: '2m 20s', result: 'Success', delta: '+5' },
    { timestamp: 'Jun 02, 2026 06:10 AM', trigger: 'agent', duration: '2m 11s', result: 'Success', delta: 'no change' },
  ],
  v1: [
    { timestamp: 'May 30, 2026 06:40 PM', trigger: 'agent', duration: '3m 41s', result: 'Success', delta: 'initial' },
  ],
};

/* ---- BOM metadata (right rail, spec §6) ----------------------------------- */

export interface BomMeta {
  format: string; generated: string; version: string; components: number;
  signed: string; cmdb: string[]; throttle: string;
}
export const bomMeta: Record<string, Partial<Record<BomType, BomMeta>>> = {
  'payments-web': {
    SBOM: { format: 'CycloneDX 1.6', generated: 'Jun 16, 2026', version: 'v3 · living SBOM',
      components: 187, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
    CBOM: { format: 'CycloneDX 1.6', generated: 'Jun 16, 2026', version: 'v3 · living CBOM',
      components: 5, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
    'AI BOM': { format: 'CycloneDX 1.6', generated: 'Jun 16, 2026', version: 'v3 · living AI BOM',
      components: 5, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
  },
  'reporting-service': {
    SBOM: { format: 'CycloneDX 1.6', generated: 'Jun 15, 2026', version: 'v2 · living SBOM',
      components: 88, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
    CBOM: { format: 'CycloneDX 1.6', generated: 'Jun 15, 2026', version: 'v2 · living CBOM',
      components: 2, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
  },
  'os-base': {
    SBOM: { format: 'CycloneDX 1.6', generated: 'Jun 16, 2026', version: 'v3 · living SBOM',
      components: 37, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
    CBOM: { format: 'CycloneDX 1.6', generated: 'Jun 16, 2026', version: 'v3 · living CBOM',
      components: 3, signed: 'cosign ✓', cmdb: ['AST-4', 'CI-1'], throttle: 'Off-peak · ≤ 15% CPU' },
  },
};

/* ---- scan paths (Drawer A, Image 1) --------------------------------------- */

export interface ScanPath {
  id: string;
  product: string;
  version: string | null;
  path: string;
  source: 'agent · discovered' | 'manual';
  comps: number | null;
  scanned: string | null;
  excluded?: boolean;
  /** product-level exclusions entered in Drawer B */
  excludes?: string[];
}

export const scanPaths: ScanPath[] = [
  { id: 'sp-1', product: 'Payments Web', version: '2.4.1', path: '/opt/payments',
    source: 'agent · discovered', comps: 187, scanned: 'Jun 16, 2026' },
  { id: 'sp-2', product: 'Reporting Service', version: '3.1.0', path: '/opt/reporting',
    source: 'agent · discovered', comps: 88, scanned: 'Jun 15, 2026' },
  { id: 'sp-3', product: 'OS / base platform', version: null, path: '/',
    source: 'agent · discovered', comps: 37, scanned: 'Jun 16, 2026' },
];

/** Host-wide exclusions (Image 3) — distinct from Drawer B's product-level field. */
export const hostExcludes = [
  '**/logs', '**/temp', '**/cache', '**/node_modules',
  '**/*.log', '**/*.tmp', 'C:\\Windows\\Temp', 'C:\\pagefile.sys',
];

/* ---- components (Image 6) -------------------------------------------------- */

export type Origin = 'Proprietary' | 'Open-source' | 'Third-party';
export interface Component {
  name: string; version: string; type: string; ecosystem: string;
  purl: string; license: string; origin: Origin;
}

export const components: Component[] = [
  { name: 'Microsoft Windows Server 2019', version: '10.0.17763.3650', type: 'Operating-System',
    ecosystem: 'Windows', purl: 'pkg:generic/windows-server@10.0.17763.3650', license: 'Proprietary', origin: 'Proprietary' },
  { name: 'openssl', version: '3.0.1', type: 'Library', ecosystem: 'Generic',
    purl: 'pkg:generic/openssl@3.0.1', license: 'Apache-2.0', origin: 'Open-source' },
  { name: 'zlib', version: '1.2.11', type: 'Library', ecosystem: 'Generic',
    purl: 'pkg:generic/zlib@1.2.11', license: 'Zlib', origin: 'Open-source' },
  { name: 'log4j-core', version: '2.14.1', type: 'Library', ecosystem: 'Maven',
    purl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1', license: 'Apache-2.0', origin: 'Open-source' },
  { name: 'spring-core', version: '5.3.18', type: 'Library', ecosystem: 'Maven',
    purl: 'pkg:maven/org.springframework/spring-core@5.3.18', license: 'Apache-2.0', origin: 'Open-source' },
  { name: 'jackson-databind', version: '2.12.3', type: 'Library', ecosystem: 'Maven',
    purl: 'pkg:maven/com.fasterxml.jackson.core/jackson-databind@2.12.3', license: 'Apache-2.0', origin: 'Open-source' },
  { name: 'commons-text', version: '1.9', type: 'Library', ecosystem: 'Maven',
    purl: 'pkg:maven/org.apache.commons/commons-text@1.9', license: 'Apache-2.0', origin: 'Open-source' },
  { name: 'lodash', version: '4.17.20', type: 'Library', ecosystem: 'Npm',
    purl: 'pkg:npm/lodash@4.17.20', license: 'MIT', origin: 'Open-source' },
  { name: 'node-forge', version: '1.2.1', type: 'Library', ecosystem: 'Npm',
    purl: 'pkg:npm/node-forge@1.2.1', license: 'BSD-3-Clause', origin: 'Open-source' },
  { name: 'pycryptodome', version: '3.9.8', type: 'Library', ecosystem: 'Pypi',
    purl: 'pkg:pypi/pycryptodome@3.9.8', license: 'BSD-2-Clause', origin: 'Open-source' },
  { name: 'golang.org/x/crypto', version: '0.16.0', type: 'Library', ecosystem: 'Golang',
    purl: 'pkg:golang/golang.org/x/crypto@0.16.0', license: 'BSD-3-Clause', origin: 'Open-source' },
  { name: 'Microsoft .NET Runtime', version: '6.0.21', type: 'Framework', ecosystem: 'Nuget',
    purl: 'pkg:nuget/Microsoft.NETCore.App.Runtime@6.0.21', license: 'MIT', origin: 'Open-source' },
  { name: 'Newtonsoft.Json', version: '13.0.3', type: 'Library', ecosystem: 'Nuget',
    purl: 'pkg:nuget/Newtonsoft.Json@13.0.3', license: 'MIT', origin: 'Open-source' },
  { name: 'in.hdfc.auth-sdk', version: '1.4.2', type: 'Library', ecosystem: 'Internal',
    purl: 'pkg:internal/in.hdfc/auth-sdk@1.4.2', license: 'Unknown', origin: 'Proprietary' },
  { name: 'Avecto DefendPoint', version: '5.7.142', type: 'Application', ecosystem: 'Generic',
    purl: 'pkg:generic/avecto-defendpoint@5.7.142', license: 'Commercial', origin: 'Third-party' },
];

/* ---- version comparison ---------------------------------------------------- */

export type ChangeKind = 'added' | 'updated' | 'removed' | 'unchanged';

export interface Change {
  name: string;
  kind: ChangeKind;
  ecosystem: string;
  license: string;
  origin: Origin;
  componentType: string;
  purl: string;
  /** present on updated rows */
  from?: string;
  to?: string;
  /** semver step, present on updated rows */
  step?: 'major' | 'minor' | 'patch';
  version?: string;
  /** count of CVEs attached to the component */
  cves?: number;
  note?: string;
}

export const comparison: Change[] = [
  { name: 'Newtonsoft.Json', kind: 'updated', ecosystem: 'Nuget', license: 'MIT',
    origin: 'Open-source', componentType: 'Library', purl: 'pkg:nuget/Newtonsoft.Json@13.0.3',
    from: '13.0.1', to: '13.0.3', step: 'patch', note: 'Patch version update (13.0.1 → 13.0.3).' },
  { name: 'apache-poi', kind: 'added', ecosystem: 'Maven', license: 'Apache-2.0',
    origin: 'Open-source', componentType: 'Library', purl: 'pkg:maven/org.apache.poi/poi@5.2.3',
    version: '5.2.3', note: 'New direct dependency introduced in v3.' },
  { name: 'Avecto DefendPoint', kind: 'added', ecosystem: 'Generic', license: 'Commercial',
    origin: 'Third-party', componentType: 'Application', purl: 'pkg:generic/avecto-defendpoint@5.7.142',
    version: '5.7.142', note: 'Detected on the host during the v3 scan.' },
  { name: 'commons-collections', kind: 'removed', ecosystem: 'Maven', license: 'Apache-2.0',
    origin: 'Open-source', componentType: 'Library', purl: 'pkg:maven/commons-collections/commons-collections@3.2.1',
    version: '3.2.1', cves: 1, note: 'No longer present — resolved 1 known vulnerability.' },
];

/** Unchanged components are counted but not listed. */
export const unchangedCount = 13;

export const componentsFooterNote =
  'captures the CERT-In minimum elements (supplier, license, origin, direct + transitive dependencies, hash).';

export const agentBanner =
  'Generated on this endpoint by the ServiceOps agent (ServiceOps Agent v8.7.408) — asset-native, no external ' +
  'scanner. Scoped to product Payments Web 2.4.1 — co-located products keep separate SBOMs. Auto-linked to CI-1 ' +
  '+ its mapped services, and signed (cosign · keyless (OIDC)).';
