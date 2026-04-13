
import React, { Suspense, useRef, useState } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { ConfigState, LampType } from '../types';
import { EnvironmentContext } from './EnvironmentContext';
import { TrackSystem } from './TrackSystem';

interface Scene3DProps {
  config: ConfigState;
  activeLampType: LampType | null;
  onPlaceLamp: (type: LampType, systemId: string, trackIndex: number, position: number) => void;
  onRemoveLamp: (systemId: string, id: string) => void;
  onUpdateLampPos: (systemId: string, lampId: string, newPos: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  sceneGroupRef: React.RefObject<THREE.Group>;
  onUpdateSystemPos: (id: string, pos: [number, number, number]) => void;
  onUpdateObjectPos: (id: string, pos: [number, number, number]) => void;
  onCloneObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onDeleteSystem: (id: string) => void;
  onSelectObject: (id: string | null) => void;
  onSelectSystem: (id: string | null) => void;
  onSelectLamp: (id: string | null) => void;
  onUpdateLampTarget: (systemId: string, lampId: string, target: [number, number, number]) => void;
  deleteMode: boolean;
  isExportingImage: boolean;
}

export const Scene3D: React.FC<Scene3DProps> = ({ 
  config, activeLampType, onPlaceLamp, onRemoveLamp, onUpdateLampPos, canvasRef, sceneGroupRef,
  onUpdateSystemPos, onUpdateObjectPos, onCloneObject, onDeleteObject, onDeleteSystem, onSelectObject, onSelectSystem, onSelectLamp, onUpdateLampTarget, deleteMode, isExportingImage
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingLampId, setDraggingLampId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'system' | 'object' | 'target' | null>(null);
  const [dragData, setDragData] = useState<{ planeY: number, startPoint: THREE.Vector3, startObjPos: [number, number, number] } | null>(null);

  // Find selected lamp
  let selectedLampSystemId: string | null = null;
  let selectedLamp = null;
  if (config.selectedLampId) {
    for (const sys of config.systems) {
      const lamp = sys.lamps.find(l => l.id === config.selectedLampId);
      if (lamp) {
        selectedLamp = lamp;
        selectedLampSystemId = sys.id;
        break;
      }
    }
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>, id: string, type: 'system' | 'object' | 'target') => {
    e.stopPropagation();
    if (deleteMode) {
      if (type === 'object') onDeleteObject(id);
      if (type === 'system') onDeleteSystem(id);
      return;
    }
    
    // Si estamos en modo de agregar lámpara, no iniciar el arrastre del sistema
    if (type === 'system' && activeLampType) {
      return;
    }

    if (type === 'target') {
      if (selectedLamp && selectedLamp.target) {
        setDragData({
          planeY: e.point.y,
          startPoint: e.point.clone(),
          startObjPos: selectedLamp.target
        });
        setDraggingId(id);
        setDragType(type);
      }
      return;
    }

    if (type === 'object') {
      onSelectObject(id);
      onSelectSystem(null);
      onSelectLamp(null);
    } else {
      onSelectObject(null);
      onSelectSystem(id);
      onSelectLamp(null);
    }

    // Obtener la posición actual del objeto
    let objPos: [number, number, number] = [0, 0, 0];
    if (type === 'system') {
      const sys = config.systems.find(s => s.id === id);
      if (sys) objPos = sys.position;
    } else {
      const obj = config.envObjects.find(o => o.id === id);
      if (obj) objPos = obj.position;
    }
    
    // Guardar los datos exactos del clic para un arrastre perfecto desde cualquier ángulo
    setDragData({
      planeY: e.point.y,
      startPoint: e.point.clone(),
      startObjPos: objPos
    });

    setDraggingId(id);
    setDragType(type);
  };

  const onPointerUp = () => {
    setDraggingId(null);
    setDraggingLampId(null);
    setDragType(null);
    setDragData(null);
  };

  return (
    <Canvas 
      shadows 
      className="w-full h-full bg-[#fdfdfd]" 
      ref={canvasRef}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => {
        onSelectObject(null);
        onSelectSystem(null);
        onSelectLamp(null);
      }}
    >
      <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={35} />
      <color attach="background" args={[config.lightsOn ? '#111111' : '#ffffff']} />
      <OrbitControls 
        target={[0, 1.5, 0]}
        minPolarAngle={0} 
        maxPolarAngle={Math.PI} 
        enableDamping 
        enabled={!draggingId && !draggingLampId}
        makeDefault
      />
      
      <ambientLight intensity={config.lightsOn ? 0.1 : 0.7} />
      <spotLight position={[10, 20, 10]} angle={0.25} penumbra={1} intensity={config.lightsOn ? 0.05 : 2.5} castShadow={!config.lightsOn} />
      
      <Suspense fallback={null}>
        {config.lightsOn ? <Environment preset="city" environmentIntensity={0.05} /> : <Environment preset="apartment" />}
        
        {/* PISO: Recibe sombras */}
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#f3f4f6" roughness={0.9} />
        </mesh>

        {/* TECHO: Invisible desde arriba usando THREE.FrontSide y rotación estratégica */}
        <mesh visible={!isExportingImage} position={[0, config.ceilingHeight, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#e5e5e5" 
            side={THREE.FrontSide} 
            roughness={1} 
            transparent={false}
          />
        </mesh>

        {/* Plano invisible para capturar el arrastre - Activo solo al arrastrar, a la altura exacta del clic, doble cara */}
        {draggingId && dragData && (
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, dragData.planeY, 0]} 
            onPointerMove={(e) => {
              e.stopPropagation();
              const deltaX = e.point.x - dragData.startPoint.x;
              const deltaZ = e.point.z - dragData.startPoint.z;
              
              const movePos: [number, number, number] = [
                dragData.startObjPos[0] + deltaX, 
                0, 
                dragData.startObjPos[2] + deltaZ
              ];
              
              if (dragType === 'system') {
                onUpdateSystemPos(draggingId, movePos);
              } else if (dragType === 'object') {
                onUpdateObjectPos(draggingId, movePos);
              } else if (dragType === 'target' && selectedLampSystemId) {
                onUpdateLampTarget(selectedLampSystemId, draggingId, movePos);
              }
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onPointerUp();
            }}
          >
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Target for selected lamp */}
        {selectedLamp && selectedLamp.type === LampType.SPOT_DIRECTIONAL && (
          <mesh
            position={selectedLamp.target || [0, 0, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={(e) => onPointerDown(e as any, selectedLamp!.id, 'target')}
          >
            <ringGeometry args={[0.2, 0.25, 32]} />
            <meshBasicMaterial color="#3b82f6" side={THREE.DoubleSide} transparent opacity={0.8} />
            <mesh position={[0, 0, 0]}>
              <circleGeometry args={[0.05, 16]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          </mesh>
        )}

        <group visible={!isExportingImage}>
          <Grid 
            infiniteGrid 
            fadeDistance={40} 
            fadeStrength={10} 
            sectionSize={2} 
            sectionColor="#cfd8dc" 
            sectionThickness={1.2}
            cellSize={0.5} 
            cellColor="#eceff1"
            cellThickness={0.8}
            position={[0, -0.001, 0]}
          />
        </group>

        {config.showEnvironment && !isExportingImage && (
          <EnvironmentContext 
            config={config} 
            onPointerDown={(e, id) => onPointerDown(e, id, 'object')}
            onDoubleClick={(e, id) => onCloneObject(id)}
            draggingId={draggingId}
            deleteMode={deleteMode}
            selectedObjectId={config.selectedObjectId}
          />
        )}

        <group ref={sceneGroupRef}>
          {config.systems.map((sys) => (
            <group 
              key={sys.id} 
              position={sys.position}
              rotation={[0, sys.rotation, 0]}
              onPointerDown={(e) => onPointerDown(e as any, sys.id, 'system')}
            >
              <TrackSystem 
                config={config} 
                systemId={sys.id}
                systemConfig={sys}
                onTrackClick={(e, trackIdx, pos) => onPlaceLamp(activeLampType!, sys.id, trackIdx, pos)}
                onUpdateLampPos={onUpdateLampPos}
                activeLampType={activeLampType}
                onRemoveLamp={(lampId) => onRemoveLamp(sys.id, lampId)}
                isSelected={config.selectedSystemId === sys.id}
                setGlobalDraggingLamp={setDraggingLampId}
                selectedObjectId={config.selectedObjectId}
                onSelectObject={onSelectObject}
                onSelectLamp={onSelectLamp}
                onUpdateLampTarget={onUpdateLampTarget}
                deleteMode={deleteMode}
              />
            </group>
          ))}
        </group>

        <group visible={!isExportingImage}>
          <ContactShadows position={[0, 0, 0]} opacity={0.25} scale={40} blur={2.5} far={8} />
        </group>
      </Suspense>
    </Canvas>
  );
};
