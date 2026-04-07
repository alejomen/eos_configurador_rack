
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Scene3D } from './components/Scene3D';
import { Sidebar } from './components/Sidebar';
import { ProductModal } from './components/ProductModal';
import { ConfigState, LayoutType, MountingType, PlacedLamp, PRICING, LampType, EnvironmentType, TrackSystemConfig, EnvironmentObject, EnvObjectType, PRODUCT_DETAILS } from './types';
import * as THREE from 'three';

const LOGO_URL = "/logo.svg";

const DEFAULT_HOME: EnvironmentObject[] = [
  { id: 'h1', type: 'sofa', position: [0, 0, -2.5], rotation: [0, 0, 0] },
  { id: 'h2', type: 'coffeeTable', position: [0, 0, -1], rotation: [0, 0, 0] },
  { id: 'h3', type: 'sideboard', position: [2.5, 0, -2.5], rotation: [0, -Math.PI / 2, 0] },
  { id: 'h4', type: 'loungeChair', position: [-2, 0, -1.5], rotation: [0, Math.PI / 4, 0] }
];

const DEFAULT_OFFICE: EnvironmentObject[] = [
  { id: 'o1', type: 'officeTable', position: [0, 0, 0], rotation: [0, 0, 0] },
  { id: 'o2', type: 'officeTable', position: [2.5, 0, 0], rotation: [0, 0, 0] },
  { id: 'o3', type: 'bookshelf', position: [0, 0, -3], rotation: [0, 0, 0] },
  { id: 'o4', type: 'lowCabinet', position: [-2.5, 0, 0], rotation: [0, Math.PI / 2, 0] }
];

const App: React.FC = () => {
  const initialSystemId = Math.random().toString(36).substr(2, 9);
  const [config, setConfig] = useState<ConfigState>({
    environmentType: EnvironmentType.HOME,
    ceilingHeight: 3,
    suspensionHeight: 0.6,
    systems: [{
      id: initialSystemId,
      layout: LayoutType.LINEAR,
      mounting: MountingType.SUSPENDIDO,
      width: 3,
      depth: 2,
      position: [0, 0, 0],
      rotation: 0,
      lamps: []
    }],
    selectedSystemId: initialSystemId,
    selectedObjectId: null,
    includeInstallation: false,
    includeShipping: false,
    showEnvironment: true,
    envObjects: [...DEFAULT_HOME]
  });

  const [history, setHistory] = useState<ConfigState[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [activeLampType, setActiveLampType] = useState<LampType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LampType | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);

  const saveHistory = useCallback((newState: ConfigState) => {
    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (JSON.stringify(last) === JSON.stringify(newState)) return prev;
      return [...prev.slice(-19), newState];
    });
  }, []);

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setConfig(prev);
    }
  };

  const updateConfig = (key: keyof ConfigState, value: any) => {
    saveHistory(config);
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleEnvironment = () => {
    saveHistory(config);
    setConfig(prev => ({ ...prev, showEnvironment: !prev.showEnvironment }));
  };

  const handleEnvironmentTypeChange = (type: EnvironmentType) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      environmentType: type,
      selectedObjectId: null,
      envObjects: type === EnvironmentType.HOME ? [...DEFAULT_HOME] : [...DEFAULT_OFFICE]
    }));
  };

  const quoteData = useMemo(() => {
    let totalRailLength = 0;
    let totalCorners = 0;
    let totalSpots = 0;
    let totalRacks = 0;

    config.systems.forEach(sys => {
      let l = 0; let c = 0;
      switch (sys.layout) {
        case LayoutType.LINEAR: l = sys.width; c = 0; break;
        case LayoutType.RECTANGULAR: l = (sys.width * 2) + (sys.depth * 2); c = 4; break;
        case LayoutType.L_SHAPE: l = sys.width + sys.depth; c = 1; break;
        case LayoutType.U_SHAPE: l = (sys.width * 2) + sys.depth; c = 2; break;
      }
      totalRailLength += l; totalCorners += c;
      totalSpots += sys.lamps.filter(lamp => lamp.type === LampType.SPOT_DIRECTIONAL).length;
      totalRacks += sys.lamps.filter(lamp => lamp.type === LampType.FIXED_RACK).length;
    });

    const railSegments = Math.ceil(totalRailLength / 2);
    const railCost = railSegments * PRICING.RAIL_KIT_2M;
    const cornersCost = totalCorners * PRICING.CORNER_PIECE;
    const spotsCost = totalSpots * PRICING.SPOT_DIRECTIONAL;
    const racksCost = totalRacks * PRICING.FIXED_RACK;
    const installationCost = config.includeInstallation ? PRICING.INSTALLATION_BASE + ((totalSpots + totalRacks) * PRICING.INSTALLATION_PER_ITEM) : 0;
    const shippingCost = config.includeShipping ? PRICING.SHIPPING : 0;

    return {
      railSegments, railCost, cornerCount: totalCorners, cornersCost, 
      spotCount: totalSpots, spotsCost, rackCount: totalRacks, racksCost,
      installationCost, shippingCost, 
      subtotal: railCost + cornersCost + spotsCost + racksCost,
      total: railCost + cornersCost + spotsCost + racksCost + installationCost + shippingCost
    };
  }, [config]);

  const updateSystemPosition = (id: string, newPos: [number, number, number]) => {
    setConfig(prev => ({ 
      ...prev, 
      systems: prev.systems.map(s => s.id === id ? { ...s, position: newPos } : s) 
    }));
  };

  const updateObjectPosition = (id: string, newPos: [number, number, number]) => {
    setConfig(prev => ({ 
      ...prev, 
      envObjects: prev.envObjects.map(o => o.id === id ? { ...o, position: [newPos[0], o.position[1], newPos[2]] } : o) 
    }));
  };

  const handleUpdateLampPos = useCallback((systemId: string, lampId: string, newPos: number) => {
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(sys => sys.id === systemId ? {
        ...sys,
        lamps: sys.lamps.map(l => l.id === lampId ? { ...l, position: Math.max(0, Math.min(1, newPos)) } : l)
      } : sys)
    }));
  }, []);

  const deleteObject = (id: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      envObjects: prev.envObjects.filter(o => o.id !== id),
      selectedObjectId: prev.selectedObjectId === id ? null : prev.selectedObjectId
    }));
  };

  const rotateObject = (id: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      envObjects: prev.envObjects.map(o => o.id === id ? { ...o, rotation: [o.rotation[0], o.rotation[1] + Math.PI / 2, o.rotation[2]] } : o)
    }));
  };

  const addLamp = useCallback((type: LampType, systemId: string, trackIndex: number, position: number) => {
    saveHistory(config);
    const newLamp: PlacedLamp = {
      id: Math.random().toString(36).substr(2, 9),
      type, trackIndex, position,
      rotation: type === LampType.SPOT_DIRECTIONAL ? (Math.random() - 0.5) * 2 * Math.PI : 0
    };
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(sys => sys.id === systemId ? { ...sys, lamps: [...sys.lamps, newLamp] } : sys)
    }));
  }, [config, saveHistory]);

  const removeLamp = useCallback((systemId: string, lampId: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(sys => sys.id === systemId ? { ...sys, lamps: sys.lamps.filter(l => l.id !== lampId) } : sys)
    }));
  }, [config, saveHistory]);

  const cloneObject = (id: string) => {
    saveHistory(config);
    const obj = config.envObjects.find(o => o.id === id);
    if (!obj) return;
    const newObj: EnvironmentObject = {
      ...obj,
      id: Math.random().toString(36).substr(2, 9),
      position: [obj.position[0] + 0.5, obj.position[1], obj.position[2] + 0.5]
    };
    setConfig(prev => ({ ...prev, envObjects: [...prev.envObjects, newObj] }));
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const date = new Date().toLocaleDateString();
    
    let itemsHtml = `
      <tr><td>Kit Riel Magnético (2m)</td><td>${quoteData.railSegments}</td><td>$${PRICING.RAIL_KIT_2M}</td><td>$${quoteData.railCost}</td></tr>
      ${quoteData.cornerCount > 0 ? `<tr><td>Uniones de Esquina</td><td>${quoteData.cornerCount}</td><td>$${PRICING.CORNER_PIECE}</td><td>$${quoteData.cornersCost}</td></tr>` : ''}
      ${quoteData.spotCount > 0 ? `<tr><td>Spot Bala 12W</td><td>${quoteData.spotCount}</td><td>$${PRICING.SPOT_DIRECTIONAL}</td><td>$${quoteData.spotsCost}</td></tr>` : ''}
      ${quoteData.rackCount > 0 ? `<tr><td>Rack Lineal 8 Luces</td><td>${quoteData.rackCount}</td><td>$${PRICING.FIXED_RACK}</td><td>$${quoteData.racksCost}</td></tr>` : ''}
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cotización EOS Iluminación</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { height: 60px; }
            .title { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { text-align: left; border-bottom: 1px solid #eee; padding: 10px; font-size: 12px; text-transform: uppercase; color: #888; }
            td { padding: 15px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-section { margin-top: 40px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 10px; }
            .total-label { font-weight: bold; text-transform: uppercase; font-size: 12px; }
            .grand-total { font-size: 24px; font-weight: bold; margin-top: 10px; border-top: 2px solid #000; padding-top: 10px; }
            .footer { margin-top: 60px; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${LOGO_URL}" class="logo" />
            <div class="title">
              <h1 style="margin:0; font-weight:300;">COTIZACIÓN FORMAL</h1>
              <p style="margin:5px 0 0 0; color:#888;">Fecha: ${date}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Descripción del Componente</th><th>Cant.</th><th>P. Unitario</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total-section">
            <div class="total-row"><span class="total-label">Subtotal Productos</span><span>$${quoteData.subtotal}</span></div>
            ${config.includeInstallation ? `<div class="total-row"><span class="total-label">Servicio de Instalación</span><span>$${quoteData.installationCost}</span></div>` : ''}
            ${config.includeShipping ? `<div class="total-row"><span class="total-label">Logística y Transporte</span><span>$${quoteData.shippingCost}</span></div>` : ''}
            <div class="grand-total"><span class="total-label" style="margin-right:20px">Total Neto USD</span> $${quoteData.total.toLocaleString()}</div>
          </div>
          <div class="footer">
            <p>EOS Iluminación Profesional - Sistemas Magnéticos 48V de Alta Gama</p>
            <p>Válido por 15 días a partir de la fecha de emisión.</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExport3D = async () => {
    if (!sceneGroupRef.current) return;
    const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
    const exporter = new OBJExporter();
    const result = exporter.parse(sceneGroupRef.current);
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eos_iluminacion_3d.obj`;
    link.click();
  };

  return (
    <div className="flex h-screen w-full bg-white text-gray-900 overflow-hidden relative">
      <div className="flex-1 relative cursor-crosshair">
        <Scene3D 
          config={config} 
          activeLampType={activeLampType}
          onPlaceLamp={addLamp}
          onRemoveLamp={removeLamp}
          onUpdateLampPos={handleUpdateLampPos}
          canvasRef={canvasRef}
          sceneGroupRef={sceneGroupRef}
          onUpdateSystemPos={updateSystemPosition}
          onUpdateObjectPos={updateObjectPosition}
          onCloneObject={cloneObject}
          onDeleteObject={deleteObject}
          onSelectObject={(id) => setConfig(prev => ({ ...prev, selectedObjectId: id }))}
          deleteMode={deleteMode}
        />
        <div className="absolute bottom-8 left-8 w-48 z-10">
          <img 
            src={LOGO_URL} 
            alt="EOS Logo" 
            className="w-full h-auto drop-shadow-md" 
            crossOrigin="anonymous"
          />
        </div>
      </div>
      <Sidebar 
        config={config} 
        setConfig={setConfig} 
        updateConfig={updateConfig}
        quoteData={quoteData}
        activeLampType={activeLampType} 
        setActiveLampType={setActiveLampType}
        onDownloadPDF={handleDownloadPDF}
        onExport3D={handleExport3D}
        onProductDetail={setSelectedProduct}
        logoUrl={LOGO_URL}
        onUndo={handleUndo}
        canUndo={history.length > 0}
        onToggleEnv={toggleEnvironment}
        deleteMode={deleteMode}
        setDeleteMode={setDeleteMode}
        onEnvTypeChange={handleEnvironmentTypeChange}
        onRotateObject={rotateObject}
      />
      <ProductModal productType={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
};

export default App;
