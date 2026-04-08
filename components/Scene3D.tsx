
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
  onSelectObject: (id: string | null) => void;
  deleteMode: boolean;
}

export const Scene3D: React.FC<Scene3DProps> = ({ 
  config, activeLampType, onPlaceLamp, onRemoveLamp, onUpdateLampPos, canvasRef, sceneGroupRef,
  onUpdateSystemPos, onUpdateObjectPos, onCloneObject, onDeleteObject, onSelectObject, deleteMode
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingLampId, setDraggingLampId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'system' | 'object' | null>(null);

  const onPointerDown = (e: ThreeEvent<PointerEvent>, id: string, type: 'system' | 'object') => {
    e.stopPropagation();
    if (type === 'object') {
      onSelectObject(id);
      if (deleteMode) {
        onDeleteObject(id);
        return;
      }
    } else {
      onSelectObject(null);
    }
    setDraggingId(id);
    setDragType(type);
  };

  const onPointerUp = () => {
    setDraggingId(null);
    setDraggingLampId(null);
    setDragType(null);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId || !dragType) return;
    
    // Proyectar el movimiento sobre el plano XZ (suelo)
    const movePos: [number, number, number] = [e.point.x, 0, e.point.z];
    
    if (dragType === 'system') {
      onUpdateSystemPos(draggingId, movePos);
    } else {
      onUpdateObjectPos(draggingId, movePos);
    }
  };

  return (
    <Canvas 
      shadows 
      className="w-full h-full bg-[#fdfdfd]" 
      ref={canvasRef}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => onSelectObject(null)}
    >
      <PerspectiveCamera makeDefault position={[8, 5, 8]} fov={35} />
      <OrbitControls 
        target={[0, 1.5, 0]}
        minPolarAngle={0} 
        maxPolarAngle={Math.PI} 
        enableDamping 
        enabled={!draggingId && !draggingLampId}
        makeDefault
      />
      
      <ambientLight intensity={0.7} />
      <spotLight position={[10, 20, 10]} angle={0.25} penumbra={1} intensity={2.5} castShadow />
      
      <Suspense fallback={null}>
        <Environment preset="apartment" />
        
        {/* TECHO: Invisible desde arriba usando THREE.FrontSide y rotación estratégica */}
        <mesh position={[0, config.ceilingHeight, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#ffffff" 
            side={THREE.FrontSide} 
            roughness={1} 
            transparent={false}
          />
        </mesh>

        {/* Plano invisible para capturar el arrastre */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.01, 0]} 
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          visible={false}
        >
          <planeGeometry args={[200, 200]} />
        </mesh>

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

        {config.showEnvironment && (
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
                deleteMode={deleteMode}
              />
            </group>
          ))}
        </group>

        <ContactShadows position={[0, 0, 0]} opacity={0.25} scale={40} blur={2.5} far={8} />
      </Suspense>
    </Canvas>
  );
};
