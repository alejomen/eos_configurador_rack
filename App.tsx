
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
  const [isExportingImage, setIsExportingImage] = useState(false);
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

  const deleteSystem = (id: string) => {
    saveHistory(config);
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.filter(s => s.id !== id),
      selectedSystemId: prev.selectedSystemId === id ? (prev.systems.find(s => s.id !== id)?.id || null) : prev.selectedSystemId
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
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes para generar el PDF.");
      return;
    }

    // Show loading state in the new window
    printWindow.document.write('<html><head><title>Generando PDF...</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;"><h2>Preparando documento...</h2></body></html>');

    // Hide environment for screenshot
    setIsExportingImage(true);

    // Wait for React to re-render and Three.js to draw the frame
    setTimeout(() => {
      const canvas = canvasRef.current;
      const imageUrl = canvas ? canvas.toDataURL('image/jpeg', 0.9) : '';
      
      // Restore environment
      setIsExportingImage(false);

      const date = new Date().toLocaleDateString();
      
      let itemsHtml = `
        <tr><td>Kit Riel Magnético (2m)</td><td>${quoteData.railSegments}</td><td>$${PRICING.RAIL_KIT_2M}</td><td>$${quoteData.railCost}</td></tr>
        ${quoteData.cornerCount > 0 ? `<tr><td>Uniones de Esquina</td><td>${quoteData.cornerCount}</td><td>$${PRICING.CORNER_PIECE}</td><td>$${quoteData.cornersCost}</td></tr>` : ''}
        ${quoteData.spotCount > 0 ? `<tr><td>Spot Bala 12W</td><td>${quoteData.spotCount}</td><td>$${PRICING.SPOT_DIRECTIONAL}</td><td>$${quoteData.spotsCost}</td></tr>` : ''}
        ${quoteData.rackCount > 0 ? `<tr><td>Rack Lineal 8 Luces</td><td>${quoteData.rackCount}</td><td>$${PRICING.FIXED_RACK}</td><td>$${quoteData.racksCost}</td></tr>` : ''}
      `;

      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>Cotización EOS Iluminación</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; }
              .logo { height: 60px; }
              .title { text-align: right; }
              .preview-image { width: 100%; height: 250px; display: flex; justify-content: center; align-items: center; margin: 20px 0; }
              .preview-image img { width: 100%; height: 100%; object-fit: contain; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
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
            
            ${imageUrl ? `
            <div class="preview-image">
              <img src="${imageUrl}" alt="Vista del Sistema de Iluminación" />
            </div>
            ` : ''}

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
            <script>
              window.onload = () => { 
                setTimeout(() => {
                  window.print(); 
                  window.close(); 
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }, 150);
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

  const handleExpressLighting = useCallback((count: number) => {
    if (!activeLampType || !config.selectedSystemId) return;

    saveHistory(config);
    setConfig(prev => {
      const systemIndex = prev.systems.findIndex(s => s.id === prev.selectedSystemId);
      if (systemIndex === -1) return prev;

      const system = prev.systems[systemIndex];
      
      let segments: { index: number, length: number }[] = [];
      if (system.layout === LayoutType.LINEAR) {
        segments = [{ index: 0, length: system.width }];
      } else if (system.layout === LayoutType.RECTANGULAR) {
        segments = [
          { index: 0, length: system.width },
          { index: 1, length: system.depth },
          { index: 2, length: system.width },
          { index: 3, length: system.depth }
        ];
      } else if (system.layout === LayoutType.L_SHAPE) {
        segments = [
          { index: 0, length: system.width },
          { index: 1, length: system.depth }
        ];
      } else if (system.layout === LayoutType.U_SHAPE) {
        segments = [
          { index: 0, length: system.width },
          { index: 1, length: system.depth },
          { index: 2, length: system.width }
        ];
      }

      const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
      const segmentLength = totalLength / count;
      
      const newLamps: PlacedLamp[] = [];
      
      for (let i = 0; i < count; i++) {
        const basePos = segmentLength * (i + 0.5);
        // Up to 40% variation in distance means +/- 20% of segment length variation
        const variation = (Math.random() - 0.5) * 2 * (segmentLength * 0.2);
        let pos = basePos + variation;
        
        // Clamp to avoid edges (leave at least 0.1m at the ends)
        pos = Math.max(0.1, Math.min(totalLength - 0.1, pos));

        let accumulated = 0;
        let targetSegment = segments[0];
        let localPos = pos;

        for (const seg of segments) {
          if (pos <= accumulated + seg.length) {
            targetSegment = seg;
            localPos = pos - accumulated;
            break;
          }
          accumulated += seg.length;
        }

        // Ensure localPos is strictly within the segment bounds
        localPos = Math.max(0, Math.min(targetSegment.length, localPos));
        const normalizedPos = localPos / targetSegment.length;

        newLamps.push({
          id: Math.random().toString(36).substring(2, 9),
          type: activeLampType,
          trackIndex: targetSegment.index,
          position: normalizedPos,
          rotation: activeLampType === LampType.SPOT_DIRECTIONAL ? (Math.random() - 0.5) * 2 * Math.PI : 0
        });
      }

      const updatedSystems = [...prev.systems];
      updatedSystems[systemIndex] = {
        ...system,
        lamps: newLamps
      };

      return { ...prev, systems: updatedSystems };
    });
  }, [activeLampType, config, saveHistory]);

  return (
    <div className="h-screen w-full bg-white text-gray-900 overflow-hidden relative">
      <div className="absolute inset-0 cursor-crosshair">
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
          onDeleteSystem={deleteSystem}
          onSelectObject={(id) => setConfig(prev => ({ ...prev, selectedObjectId: id }))}
          deleteMode={deleteMode}
          isExportingImage={isExportingImage}
        />
      </div>
      <div className="absolute top-4 left-4 w-32 md:w-48 z-10 pointer-events-none">
        <img 
          src={LOGO_URL} 
          alt="EOS Logo" 
          className="w-full h-auto drop-shadow-md" 
          crossOrigin="anonymous"
        />
      </div>

      {/* Top Right Info */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-100">
        <span className="font-bold text-sm">${quoteData.total.toLocaleString()}</span>
        <div className="w-px h-4 bg-gray-300"></div>
        <button onClick={handleDownloadPDF} className="text-black hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
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
        onExpressLighting={handleExpressLighting}
      />
      <ProductModal productType={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
};

export default App;
