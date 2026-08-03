import { useState } from 'react';
import { ToastProvider } from './lib/toast';
import IconRail from './components/IconRail';
import type { RailEntry } from './components/IconRail';
import AppTopBar from './components/AppTopBar';
import VulnerabilityListing from './modules/vulnerability/VulnerabilityListing';
import VulnerabilityDetail from './modules/vulnerability/VulnerabilityDetail';
import BomInventory from './modules/bom/BomInventory';
import EndpointDetail from './modules/bom/EndpointDetail';
import ComponentsPage from './modules/bom/ComponentsPage';
import ManageScanPaths from './modules/bom/drawers/ManageScanPaths';
import { defaultProductId } from './data/bomTab';
import type { BomType } from './data/bomTab';

/** Vulnerabilities is index 7 in the captured product rail. */
const VULN_MODULE = 7;

type Route =
  | { name: 'vuln-listing' }
  | { name: 'vuln-detail'; id: string }
  | { name: 'bom-inventory' }
  | { name: 'bom-endpoint'; ci: string }
  | { name: 'bom-components'; ci: string; versionId: string };

function Shell() {
  const [route, setRoute] = useState<Route>({ name: 'vuln-listing' });
  const [pathsOpen, setPathsOpen] = useState(false);

  /* Product + BOM type live here, not in the endpoint page, so drilling into
     the components listing and coming back restores the scope exactly. */
  const [productId, setProductId] = useState(defaultProductId);
  const [bomType, setBomType] = useState<BomType>('SBOM');

  const inBom = route.name.startsWith('bom');

  const extraRail: RailEntry[] = [{
    icon: 'layers',
    label: 'BOM',
    onClick: () => setRoute({ name: 'bom-inventory' }),
    flyout: {
      title: 'BOM',
      badge: 'New',
      items: [{
        label: 'BOM Inventory', icon: 'layers', active: inBom,
        onClick: () => setRoute({ name: 'bom-inventory' }),
      }],
    },
  }];

  return (
    <div className="app">
      <IconRail
        active={inBom ? -1 : VULN_MODULE}
        extra={extraRail}
        activeExtra={inBom ? 'BOM' : undefined}
        // the shield returns to Vulnerabilities from anywhere in BOM
        onSelectModule={(i) => {
          if (i !== VULN_MODULE) return false;
          setRoute({ name: 'vuln-listing' });
          return true;
        }}
      />

      {route.name === 'vuln-listing' && (
        <div className="main">
          <AppTopBar />
          <VulnerabilityListing onOpen={(id) => setRoute({ name: 'vuln-detail', id })} />
        </div>
      )}

      {route.name === 'vuln-detail' && (
        <VulnerabilityDetail recordId={route.id}
          onClose={() => setRoute({ name: 'vuln-listing' })} />
      )}

      {route.name === 'bom-inventory' && (
        <div className="main">
          <AppTopBar />
          <BomInventory onOpen={(ci) => setRoute({ name: 'bom-endpoint', ci })} />
        </div>
      )}

      {route.name === 'bom-endpoint' && (
        <EndpointDetail
          onBack={() => setRoute({ name: 'bom-inventory' })}
          onOpenComponents={(versionId) =>
            setRoute({ name: 'bom-components', ci: route.ci, versionId })}
          onManagePaths={() => setPathsOpen(true)}
          productId={productId} onProductChange={setProductId}
          bomType={bomType} onBomTypeChange={setBomType}
        />
      )}

      {route.name === 'bom-components' && (
        <div className="main">
          <ComponentsPage
            productId={productId} type={bomType} versionId={route.versionId}
            onBackToInventory={() => setRoute({ name: 'bom-inventory' })}
            onBackToEndpoint={() => setRoute({ name: 'bom-endpoint', ci: route.ci })}
          />
        </div>
      )}

      <ManageScanPaths open={pathsOpen} onClose={() => setPathsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
