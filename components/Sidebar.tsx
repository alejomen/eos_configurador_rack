
import React from 'react';
import { ConfigState, LayoutType, LampType, MountingType, EnvironmentType, PRICING, TrackSystemConfig } from '../types';

interface SidebarProps {
  config: ConfigState;
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
  updateConfig: (key: keyof ConfigState, value: any) => void;
  quoteData: any;
  activeLampType: LampType | null;
  setActiveLampType: (type: LampType | null) => void;
  onDownloadPDF: () => void;
  onExport3D: () => void;
  onProductDetail: (type: LampType) => void;
  logoUrl: string;
  onUndo: () => void;
  canUndo: boolean;
  onToggleEnv: () => void;
  deleteMode: boolean;
  setDeleteMode: (val: boolean) => void;
  onEnvTypeChange: (type: EnvironmentType) => void;
  onRotateObject: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  config, setConfig, updateConfig, quoteData, activeLampType, setActiveLampType, 
  onDownloadPDF, onExport3D, onProductDetail, logoUrl, onUndo, canUndo, 
  onToggleEnv, deleteMode, setDeleteMode, onEnvTypeChange, onRotateObject
}) => {
  const selectedSystem = config.systems.find(s => s.id === config.selectedSystemId);
  const selectedObject = config.envObjects.find(o => o.id === config.selectedObjectId);
  
  const updateSelectedSystem = (key: keyof TrackSystemConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      systems: prev.systems.map(s => s.id === config.selectedSystemId ? { ...s, [key]: value } : s)
    }));
  };

  const addNewSystem = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setConfig(prev => ({
      ...prev,
      systems: [...prev.systems, {
        id, layout: LayoutType.LINEAR, mounting: MountingType.SUSPENDIDO,
        width: 3, depth: 2, position: [0, 0, 0], rotation: 0, lamps: []
      }],
      selectedSystemId: id
    }));
  };

  const rotateSystem = () => {
    if (selectedSystem) {
      updateSelectedSystem('rotation', (selectedSystem.rotation || 0) + Math.PI / 2);
    }
  };

  return (
    <div className="w-[340px] bg-white border-l flex flex-col h-full z-20 text-[10px] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="EOS" className="h-10 w-auto object-contain" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h1 className="font-bold uppercase tracking-tighter text-gray-900 leading-tight border-l-2 border-gray-200 pl-3">
            Configurador <br/> <span className="font-light text-gray-400 text-[8px]">Iluminación</span>
          </h1>
        </div>
        <button 
          onClick={onUndo} 
          disabled={!canUndo}
          className={`p-2 rounded-full border transition-all ${canUndo ? 'border-gray-300 text-black hover:bg-gray-100' : 'border-gray-100 text-gray-200 cursor-not-allowed'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
        {/* Configuración Técnica Global */}
        <section className="space-y-4">
          <span className="uppercase font-bold text-gray-400 tracking-widest text-[7px]">Configuración Técnica</span>
          <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[7px] uppercase font-bold text-gray-500">Altura del Techo</span>
                  <span className="font-bold text-[9px]">{config.ceilingHeight.toFixed(1)}m</span>
                </div>
                <input 
                  type="range" min="2.2" max="5" step="0.1" 
                  value={config.ceilingHeight} 
                  onChange={e => updateConfig('ceilingHeight', parseFloat(e.target.value))} 
                  className="w-full accent-black h-1" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[7px] uppercase font-bold text-gray-500">Cuelgue Riel</span>
                  <span className="font-bold text-[9px]">{config.suspensionHeight.toFixed(1)}m</span>
                </div>
                <input 
                  type="range" min="0" max="2" step="0.1" 
                  value={config.suspensionHeight} 
                  onChange={e => updateConfig('suspensionHeight', parseFloat(e.target.value))} 
                  className="w-full accent-black h-1" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Entorno */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="uppercase font-bold text-gray-400 tracking-widest text-[7px]">Entorno</span>
            <div className="flex gap-1">
              <button 
                onClick={onToggleEnv} 
                className={`px-3 py-1 rounded-full border text-[7px] font-bold transition-all ${config.showEnvironment ? 'bg-[#22c55e] border-[#22c55e] text-white' : 'bg-white text-gray-400 border-gray-200'}`}
              >
                {config.showEnvironment ? 'VISIBLE' : 'OCULTO'}
              </button>
              <button 
                onClick={() => setDeleteMode(!deleteMode)} 
                className={`px-3 py-1 rounded-full border text-[7px] font-bold transition-all ${deleteMode ? 'bg-[#ef4444] border-[#ef4444] text-white' : 'bg-white text-gray-400 border-gray-200'}`}
              >
                BORRAR
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(EnvironmentType).map(type => (
              <button 
                key={type} 
                onClick={() => onEnvTypeChange(type)}
                className={`py-2 border rounded-lg uppercase font-bold text-[8px] transition-all ${config.environmentType === type ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
              >
                {type}
              </button>
            ))}
          </div>
          {selectedObject && (
            <button 
              onClick={() => onRotateObject(selectedObject.id)}
              className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg uppercase font-bold text-[7px] hover:border-black active:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              Rotar Objeto Seleccionado 90° ↻
            </button>
          )}
        </section>

        {/* Sistemas de Riel */}
        <section className="space-y-3 pt-4 border-t border-gray-50">
          <div className="flex justify-between items-center">
            <span className="uppercase font-bold text-gray-400 tracking-widest text-[7px]">Sistemas de Riel</span>
            <button onClick={addNewSystem} className="bg-black text-white font-bold uppercase text-[7px] px-2 py-1 rounded-full hover:scale-105 transition-transform">+ Nuevo</button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {config.systems.map((s, i) => (
              <button 
                key={s.id} 
                onClick={() => updateConfig('selectedSystemId', s.id)} 
                className={`px-4 py-2 border rounded-full text-[8px] uppercase font-bold transition-all shrink-0 ${config.selectedSystemId === s.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
              >
                Sistema {i + 1}
              </button>
            ))}
          </div>

          {selectedSystem && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="grid grid-cols-2 gap-1.5">
                {Object.values(LayoutType).map(v => (
                  <button key={v} onClick={() => updateSelectedSystem('layout', v)} className={`py-1.5 border rounded-lg uppercase font-bold text-[7px] transition-all ${selectedSystem.layout === v ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>{v}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.values(MountingType).map(v => (
                  <button key={v} onClick={() => updateSelectedSystem('mounting', v)} className={`py-1.5 border rounded-lg uppercase font-bold text-[7px] transition-all ${selectedSystem.mounting === v ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}>{v}</button>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-12 text-[7px] uppercase font-bold text-gray-400">Ancho</span>
                  <input type="range" min="1" max="10" step="0.5" value={selectedSystem.width} onChange={e => updateSelectedSystem('width', parseFloat(e.target.value))} className="flex-1 accent-black h-1" />
                  <span className="w-8 text-right font-bold text-[9px]">{selectedSystem.width}m</span>
                </div>
                {selectedSystem.layout !== LayoutType.LINEAR && (
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-[7px] uppercase font-bold text-gray-400">Fondo</span>
                    <input type="range" min="1" max="10" step="0.5" value={selectedSystem.depth} onChange={e => updateSelectedSystem('depth', parseFloat(e.target.value))} className="flex-1 accent-black h-1" />
                    <span className="w-8 text-right font-bold text-[9px]">{selectedSystem.depth}m</span>
                  </div>
                )}
              </div>
              <button onClick={rotateSystem} className="w-full py-2 bg-white border border-gray-200 rounded-lg uppercase font-bold text-[7px] hover:border-black transition-all flex items-center justify-center gap-2 active:scale-95">
                 Rotar Riel 90° ↻
              </button>
            </div>
          )}
        </section>

        {/* Luminarias */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="uppercase font-bold text-gray-400 tracking-widest text-[7px]">Luminarias</span>
            {activeLampType && <button onClick={() => setActiveLampType(null)} className="text-red-500 font-bold uppercase text-[7px] animate-pulse">● Soltar</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[LampType.SPOT_DIRECTIONAL, LampType.FIXED_RACK].map(type => (
              <button key={type} onClick={() => setActiveLampType(type)} className={`flex flex-col p-3 border rounded-2xl transition-all ${activeLampType === type ? 'border-black bg-gray-50 ring-1 ring-black shadow-lg' : 'border-gray-100 hover:border-gray-300'}`}>
                <div className="flex justify-between items-center mb-2 w-full">
                  <div className={`w-6 h-6 rounded-full ${activeLampType === type ? 'bg-[#22c55e]' : 'bg-black'}`} />
                  <div onClick={(e) => { e.stopPropagation(); onProductDetail(type); }} className="w-5 h-5 flex items-center justify-center text-[7px] bg-gray-100 rounded-full hover:bg-black hover:text-white border border-transparent">i</div>
                </div>
                <p className="font-bold text-[8px] uppercase">{type === LampType.SPOT_DIRECTIONAL ? 'Spot Bala 12W' : 'Rack 8 Luces'}</p>
                <p className="text-[8px] text-gray-400 font-medium">${type === LampType.SPOT_DIRECTIONAL ? PRICING.SPOT_DIRECTIONAL : PRICING.FIXED_RACK}.00</p>
              </button>
            ))}
          </div>
        </section>

        {/* Cotización Real-Time Simplificada */}
        <section className="space-y-3 border-t pt-4">
          <span className="uppercase font-bold text-gray-400 tracking-widest text-[7px]">Detalle de Cotización</span>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
            <div className="flex justify-between items-center text-[8px] text-gray-500 uppercase font-bold">
              <span>Componente</span>
              <span>Total</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-gray-600">Kit Riel x{quoteData.railSegments}</span>
                <span className="font-bold">${quoteData.railCost}</span>
              </div>
              {quoteData.cornerCount > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-600">Uniones x{quoteData.cornerCount}</span>
                  <span className="font-bold">${quoteData.cornersCost}</span>
                </div>
              )}
              {quoteData.spotCount > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-600">Spot Bala x{quoteData.spotCount}</span>
                  <span className="font-bold">${quoteData.spotsCost}</span>
                </div>
              )}
              {quoteData.rackCount > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-600">Rack Lineal x{quoteData.rackCount}</span>
                  <span className="font-bold">${quoteData.racksCost}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={config.includeInstallation} onChange={e => updateConfig('includeInstallation', e.target.checked)} className="w-4 h-4 accent-black rounded" />
                <span className="font-bold text-[8px] uppercase tracking-wider text-gray-700">Instalación</span>
              </div>
              <span className="font-bold text-[9px] text-gray-400">${quoteData.installationCost}</span>
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={config.includeShipping} onChange={e => updateConfig('includeShipping', e.target.checked)} className="w-4 h-4 accent-black rounded" />
                <span className="font-bold text-[8px] uppercase tracking-wider text-gray-700">Transporte</span>
              </div>
              <span className="font-bold text-[9px] text-gray-400">${quoteData.shippingCost}</span>
            </label>
          </div>

          <div className="bg-black text-white p-5 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 uppercase tracking-widest text-[8px] font-bold">Total Presupuesto</span>
              <span className="text-2xl font-light">${quoteData.total.toLocaleString()}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="p-4 bg-white border-t shrink-0">
        <button onClick={onDownloadPDF} className="w-full py-4 bg-black text-white font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-98">
          Descargar PDF Formal
        </button>
      </div>
    </div>
  );
};
