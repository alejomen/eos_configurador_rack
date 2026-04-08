
import React from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { ConfigState, EnvironmentObject } from '../types';

const COLORS = {
  terracotta: '#D48D71', 
  cream: '#F7F7F7', 
  walnut: '#3D2B1F', 
  gray: '#E2E2E2',
  charcoal: '#222222',
  oak: '#C19A6B',
  metal: '#8E8E8E',
  black: '#000000'
};

const Sofa = () => (
  <group>
    <mesh position={[0, 0.15, 0.1]} castShadow><boxGeometry args={[2.8, 0.3, 0.8]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>
    <mesh position={[0, 0.4, -0.2]} castShadow><boxGeometry args={[2.8, 0.2, 0.2]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>
  </group>
);

const CoffeeTable = () => (
  <group>
    <mesh position={[0, 0.125, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.25, 64]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
    </mesh>
  </group>
);

const OfficeTable = () => {
  const thickness = 0.06;
  const width = 2.0;
  const depth = 1.0;
  const height = 0.75;
  
  return (
    <group>
      {/* Waterfall Design - Top y Costados macizos */}
      <mesh position={[0, height, 0]} castShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>
      {/* Costado Izquierdo */}
      <mesh position={[-(width/2 - thickness/2), height/2, 0]} castShadow>
        <boxGeometry args={[thickness, height + thickness, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>
      {/* Costado Derecho */}
      <mesh position={[width/2 - thickness/2, height/2, 0]} castShadow>
        <boxGeometry args={[thickness, height + thickness, depth]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>
    </group>
  );
};

const Sideboard = () => (
  <group>
    <mesh castShadow position={[0, 0.35, 0]}>
      <boxGeometry args={[2.0, 0.7, 0.4]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  </group>
);

const LowCabinet = () => (
  <group>
    <mesh castShadow position={[0, 0.3, 0]}><boxGeometry args={[1.6, 0.5, 0.4]} /><meshStandardMaterial color="#ffffff" /></mesh>
  </group>
);

const LoungeChair = () => (
  <group>
    <mesh position={[0, 0.15, 0.1]} castShadow><boxGeometry args={[0.9, 0.3, 0.8]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>
    <mesh position={[0, 0.4, -0.2]} castShadow><boxGeometry args={[0.9, 0.2, 0.2]} /><meshStandardMaterial color="#ffffff" roughness={0.8} /></mesh>
  </group>
);

const Bookshelf = () => (
  <group>
    <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.4, 2.0, 0.35]} /><meshStandardMaterial color="#ffffff" /></mesh>
    {[0.4, 0.8, 1.2, 1.6].map((y, i) => (
      <mesh key={i} position={[0, y, 0]}><boxGeometry args={[1.38, 0.01, 0.34]} /><meshStandardMaterial color="#ffffff" /></mesh>
    ))}
  </group>
);

export const EnvironmentContext: React.FC<{ 
  config: ConfigState; 
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>, id: string) => void;
  draggingId: string | null;
  deleteMode?: boolean;
  selectedObjectId: string | null;
}> = ({ config, onPointerDown, onDoubleClick, draggingId, deleteMode, selectedObjectId }) => {
  return (
    <group>
      {config.envObjects.map((obj) => (
        <group 
          key={obj.id} 
          position={obj.position}
          rotation={obj.rotation}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, obj.id); }}
          onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(e as any, obj.id); }}
        >
          {/* Anillo de Selección */}
          {(selectedObjectId === obj.id || draggingId === obj.id) && !deleteMode && (
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.1, 1.15, 64]} />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
            </mesh>
          )}
          {deleteMode && (
             <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.1, 1.15, 64]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
             </mesh>
          )}
          <group>
            {obj.type === 'sofa' && <Sofa />}
            {obj.type === 'coffeeTable' && <CoffeeTable />}
            {obj.type === 'officeTable' && <OfficeTable />}
            {obj.type === 'sideboard' && <Sideboard />}
            {obj.type === 'loungeChair' && <LoungeChair />}
            {obj.type === 'bookshelf' && <Bookshelf />}
            {obj.type === 'lowCabinet' && <LowCabinet />}
          </group>
        </group>
      ))}
    </group>
  );
};
