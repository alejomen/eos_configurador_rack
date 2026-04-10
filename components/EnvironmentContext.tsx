
import React from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { ConfigState, EnvironmentObject } from '../types';

const getMaterialProps = (isSelected: boolean, isDeleteMode: boolean, lightsOn: boolean) => {
  if (isDeleteMode) return { color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.2, roughness: 0.8 };
  if (isSelected) return { color: '#4ade80', emissive: '#22c55e', emissiveIntensity: 0.3, roughness: 0.8 };
  return { color: lightsOn ? '#222222' : '#ffffff', roughness: 0.8 };
};

interface EnvObjProps {
  selected: boolean;
  deleteMode: boolean;
  lightsOn: boolean;
}

const Sofa: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  return (
    <group>
      <mesh position={[0, 0.15, 0.1]} castShadow><boxGeometry args={[2.8, 0.3, 0.8]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[0, 0.4, -0.2]} castShadow><boxGeometry args={[2.8, 0.2, 0.2]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
};

const CoffeeTable: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  return (
    <group>
      <mesh position={[0, 0.125, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.25, 64]} />
          <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  );
};

const OfficeTable: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  const thickness = 0.06;
  const width = 2.0;
  const depth = 1.0;
  const height = 0.75;
  
  return (
    <group>
      <mesh position={[0, height, 0]} castShadow><boxGeometry args={[width, thickness, depth]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[-(width/2 - thickness/2), height/2, 0]} castShadow><boxGeometry args={[thickness, height + thickness, depth]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[width/2 - thickness/2, height/2, 0]} castShadow><boxGeometry args={[thickness, height + thickness, depth]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
};

const Sideboard: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  return (
    <group>
      <mesh castShadow position={[0, 0.35, 0]}><boxGeometry args={[2.0, 0.7, 0.4]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
};

const LowCabinet: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  return (
    <group>
      <mesh castShadow position={[0, 0.3, 0]}><boxGeometry args={[1.6, 0.5, 0.4]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
};

const LoungeChair: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  return (
    <group>
      <mesh position={[0, 0.15, 0.1]} castShadow><boxGeometry args={[0.9, 0.3, 0.8]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[0, 0.4, -0.2]} castShadow><boxGeometry args={[0.9, 0.2, 0.2]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
};

const Bookshelf: React.FC<EnvObjProps> = ({ selected, deleteMode, lightsOn }) => {
  const mat = getMaterialProps(selected, deleteMode, lightsOn);
  return (
    <group>
      <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.4, 2.0, 0.35]} /><meshStandardMaterial {...mat} /></mesh>
      {[0.4, 0.8, 1.2, 1.6].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}><boxGeometry args={[1.38, 0.01, 0.34]} /><meshStandardMaterial {...mat} /></mesh>
      ))}
    </group>
  );
};

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
      {config.envObjects.map((obj) => {
        const isSelected = selectedObjectId === obj.id || draggingId === obj.id;
        const isDelete = !!deleteMode;

        return (
          <group 
            key={obj.id} 
            position={obj.position}
            rotation={obj.rotation}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, obj.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(e as any, obj.id); }}
          >
            <group>
              {obj.type === 'sofa' && <Sofa selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
              {obj.type === 'coffeeTable' && <CoffeeTable selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
              {obj.type === 'officeTable' && <OfficeTable selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
              {obj.type === 'sideboard' && <Sideboard selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
              {obj.type === 'loungeChair' && <LoungeChair selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
              {obj.type === 'bookshelf' && <Bookshelf selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
              {obj.type === 'lowCabinet' && <LowCabinet selected={isSelected} deleteMode={isDelete} lightsOn={config.lightsOn} />}
            </group>
          </group>
        );
      })}
    </group>
  );
};
