
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Joyride, Step } from 'react-joyride';
import { Info } from 'lucide-react';
import { Scene3D } from './components/Scene3D';
import { Sidebar } from './components/Sidebar';
import { ProductModal } from './components/ProductModal';
import { ConfigState, LayoutType, MountingType, PlacedLamp, PRICING, LampType, EnvironmentType, TrackSystemConfig, EnvironmentObject, EnvObjectType, PRODUCT_DETAILS } from './types';
import * as THREE from 'three';

const LOGO_URL = "/logo.png";

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
    envObjects: [...DEFAULT_HOME],
    projectName: '',
    clientName: '',
    lightsOn: false,
    lightIntensity: 100,
    selectedLampId: null
  });

  const [history, setHistory] = useState<ConfigState[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [activeLampType, setActiveLampType] = useState<LampType | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LampType | null>(null);
  const [runTour, setRunTour] = useState(false);
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

  const handleUpdateLampTarget = useCallback((systemId: string, lampId: string, newTarget: [number, number, number]) => {
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(sys => sys.id === systemId ? {
        ...sys,
        lamps: sys.lamps.map(l => l.id === lampId ? { ...l, target: newTarget } : l)
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
    const system = config.systems.find(s => s.id === systemId);
    const targetX = system ? system.position[0] : 0;
    const targetZ = system ? system.position[2] : 0;

    const newLamp: PlacedLamp = {
      id: Math.random().toString(36).substr(2, 9),
      type, trackIndex, position,
      rotation: type === LampType.SPOT_DIRECTIONAL ? (Math.random() - 0.5) * 2 * Math.PI : 0,
      target: type === LampType.SPOT_DIRECTIONAL ? [targetX, 0, targetZ] : undefined
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
              .top-section { display: flex; width: 100%; height: 250px; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
              .info-col { width: 33.33%; height: 100%; padding-right: 20px; display: flex; flex-direction: column; justify-content: flex-start; border-right: 1px solid #eee; }
              .logo { height: 50px; margin-bottom: 20px; object-fit: contain; align-self: flex-start; }
              .info-col h1 { margin: 0 0 15px 0; font-weight: 300; font-size: 20px; text-align: left; }
              .info-item { margin-bottom: 10px; text-align: left; }
              .info-label { font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; display: block; }
              .info-value { font-size: 14px; font-weight: 500; color: #000; }
              .image-col { width: 66.66%; height: 100%; display: flex; justify-content: center; align-items: center; padding-left: 20px; }
              .image-col img { max-width: 100%; max-height: 100%; object-fit: contain; }
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
            <div class="top-section">
              <div class="info-col">
                <img src="${config.logoUrl || LOGO_URL}" class="logo" />
                <h1>COTIZACIÓN FORMAL</h1>
                <div class="info-item">
                  <span class="info-label">Fecha</span>
                  <span class="info-value">${date}</span>
                </div>
                ${config.projectName ? `
                <div class="info-item">
                  <span class="info-label">Proyecto</span>
                  <span class="info-value">${config.projectName}</span>
                </div>` : ''}
                ${config.clientName ? `
                <div class="info-item">
                  <span class="info-label">Cliente</span>
                  <span class="info-value">${config.clientName}</span>
                </div>` : ''}
              </div>
              <div class="image-col">
                ${imageUrl ? `<img src="${imageUrl}" alt="Vista del Sistema de Iluminación" />` : ''}
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
    if (!activeLampType) return;

    saveHistory(config);
    setConfig(prev => {
      const targetSystemId = prev.selectedSystemId || prev.systems[0]?.id;
      if (!targetSystemId) return prev;

      const systemIndex = prev.systems.findIndex(s => s.id === targetSystemId);
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
          rotation: activeLampType === LampType.SPOT_DIRECTIONAL ? (Math.random() - 0.5) * 2 * Math.PI : 0,
          target: activeLampType === LampType.SPOT_DIRECTIONAL ? [system.position[0], 0, system.position[2]] : undefined
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

  const tourSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      content: 'Bienvenido a la aplicación de configuración 3D. Aquí puedes diseñar y visualizar sistemas de iluminación.',
      title: 'Tour de la Aplicación',
      disableBeacon: true,
    },
    {
      target: '.tour-toolbar',
      content: 'Esta es la barra de herramientas principal. Aquí puedes acceder a la configuración, añadir luminarias, deshacer cambios y exportar.',
      placement: 'top',
    },
    {
      target: '.tour-tab-settings',
      content: 'Ajusta las medidas de tu espacio, la altura del techo y la altura de suspensión del sistema de rieles.',
      placement: 'top',
    },
    {
      target: '.tour-tab-lamps',
      content: 'Selecciona el tipo de luminaria que deseas añadir. Haz clic para seleccionarla y luego haz clic en el riel para colocarla.',
      placement: 'top',
    },
    {
      target: '.tour-export',
      content: 'Revisa el costo total y exporta tu diseño con una cotización detallada en PDF.',
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (['finished', 'skipped'].includes(status)) {
      setRunTour(false);
    }
  };

  return (
    <div className="h-screen w-full bg-white text-gray-900 overflow-hidden relative">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#000',
            zIndex: 10000,
          }
        }}
        locale={{
          back: 'Atrás',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
          skip: 'Saltar'
        }}
      />
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
          onSelectObject={(id) => setConfig(prev => ({ ...prev, selectedObjectId: id, selectedLampId: null }))}
          onSelectSystem={(id) => setConfig(prev => ({ ...prev, selectedSystemId: id, selectedLampId: null }))}
          onSelectLamp={(id) => setConfig(prev => ({ ...prev, selectedLampId: id, selectedObjectId: null, selectedSystemId: null }))}
          onUpdateLampTarget={handleUpdateLampTarget}
          deleteMode={deleteMode}
          isExportingImage={isExportingImage}
        />
      </div>
      <div className="absolute top-4 left-4 w-32 md:w-48 z-10 group">
        <label className="cursor-pointer block relative">
          <img 
            src={config.logoUrl || LOGO_URL} 
            alt="Logo" 
            className="w-full h-auto drop-shadow-md transition-opacity group-hover:opacity-50" 
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Cambiar Logo
            </span>
          </div>
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                updateConfig('logoUrl', url);
              }
            }} 
          />
        </label>
      </div>

      {/* Top Right Info */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-100">
        <span className="font-bold text-sm">${quoteData.total.toLocaleString()}</span>
        <div className="w-px h-4 bg-gray-300"></div>
        <button onClick={handleDownloadPDF} className="tour-export text-black hover:text-gray-600 transition-colors" title="Exportar PDF">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </button>
        <div className="w-px h-4 bg-gray-300"></div>
        <button onClick={() => setRunTour(true)} className="text-black hover:text-blue-600 transition-colors" title="Tour de la App">
          <Info className="w-5 h-5" />
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
        logoUrl={config.logoUrl || LOGO_URL}
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
