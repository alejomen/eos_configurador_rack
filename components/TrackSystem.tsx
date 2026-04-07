
import React, { useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { ConfigState, LampType, TrackSystemConfig, MountingType } from '../types';
import { LampModel } from './LampModels';

interface TrackSystemProps {
  config: ConfigState;
  systemId: string;
  systemConfig: TrackSystemConfig;
  onTrackClick: (e: ThreeEvent<MouseEvent>, trackIndex: number, pos: number) => void;
  onUpdateLampPos: (systemId: string, lampId: string, newPos: number) => void;
  activeLampType: LampType | null;
  onRemoveLamp: (id: string) => void;
  isSelected: boolean;
  setGlobalDraggingLamp: (id: string | null) => void;
}

export const TrackSystem: React.FC<TrackSystemProps> = ({ 
  config, systemId, systemConfig, onTrackClick, onUpdateLampPos, activeLampType, onRemoveLamp, isSelected, setGlobalDraggingLamp
}) => {
  const { mounting, width, depth, lamps } = systemConfig;
  const { ceilingHeight, suspensionHeight } = config;
  const [hoveredTrack, setHoveredTrack] = useState<{ index: number; pos: number } | null>(null);
  
  // Estado para el arrastre de lámparas: ID y offset local para evitar saltos
  const [draggingLamp, setDraggingLamp] = useState<{ id: string, index: number, offset: number } | null>(null);

  const trackY = mounting === MountingType.SUSPENDIDO ? ceilingHeight - suspensionHeight : (mounting === MountingType.SUPERFICIAL ? ceilingHeight - 0.02 : ceilingHeight + 0.015);
  const railThickness = 0.04;

  const getTensorPositions = (length: number) => {
    const edgeOffset = 0.1; 
    if (length <= 2 * edgeOffset) return [0];
    const positions = [-length / 2 + edgeOffset, length / 2 - edgeOffset];
    if (length > 2.5) positions.push(0);
    return positions;
  };

  const renderTrackSegment = (index: number, length: number, pos: [number, number, number], rot: [number, number, number]) => {
    const tensorOffsets = getTensorPositions(length);
    
    return (
      <group position={pos} rotation={rot}>
        <mesh 
          onPointerMove={(e) => {
            e.stopPropagation();
            const localPoint = e.point.clone().applyMatrix4(new THREE.Matrix4().copy(e.object.matrixWorld).invert());
            const localX = localPoint.x;
            const normalizedPos = (localX + length / 2) / length;

            // Caso 1: Arrastrando una lámpara existente
            if (draggingLamp && draggingLamp.index === index) {
              const adjustedX = localX + draggingLamp.offset;
              const finalPos = (adjustedX + length / 2) / length;
              onUpdateLampPos(systemId, draggingLamp.id, finalPos);
              return;
            }

            // Caso 2: Previsualización para colocar nueva lámpara
            if (activeLampType) {
              setHoveredTrack({ index, pos: Math.max(0, Math.min(1, normalizedPos)) });
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setDraggingLamp(null);
            setGlobalDraggingLamp(null);
          }}
          onPointerOut={() => {
            if (!draggingLamp) setHoveredTrack(null);
          }}
          onClick={(e) => {
             if (activeLampType && hoveredTrack?.index === index && !draggingLamp) {
               e.stopPropagation();
               onTrackClick(e, index, hoveredTrack.pos);
             }
          }}
          position={[0, trackY, 0]}
          castShadow
        >
          <boxGeometry args={[length, railThickness, railThickness]} />
          <meshStandardMaterial color={isSelected ? "#000" : "#111"} roughness={0.9} />
        </mesh>
        
        {/* Tirantes de suspensión */}
        {mounting === MountingType.SUSPENDIDO && tensorOffsets.map((tx, i) => {
          return (
            <mesh key={i} position={[tx, trackY + suspensionHeight / 2, 0]}>
              <cylinderGeometry args={[0.003, 0.003, suspensionHeight, 8]} />
              <meshStandardMaterial color="#888" />
            </mesh>
          );
        })}

        {/* Previsualización de colocación */}
        {activeLampType && hoveredTrack?.index === index && !draggingLamp && (
          <group position={[hoveredTrack.pos * length - length/2, trackY - railThickness/2, 0]}>
            <LampModel type={activeLampType} isPreview />
          </group>
        )}

        {/* Lámparas colocadas */}
        {lamps.filter(l => l.trackIndex === index).map(lamp => (
          <group 
            key={lamp.id} 
            position={[lamp.position * length - length/2, trackY - railThickness/2, 0]}
            rotation={[0, lamp.rotation, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              // Calculamos el offset: posición actual del objeto - posición del ratón en el eje X local
              const localPoint = e.point.clone().applyMatrix4(new THREE.Matrix4().copy(e.object.parent!.matrixWorld).invert());
              const currentX = lamp.position * length - length/2;
              const offset = currentX - localPoint.x;
              
              setDraggingLamp({ id: lamp.id, index: index, offset: offset });
              setGlobalDraggingLamp(lamp.id);
            }}
            onClick={(e) => {
              // Si no se movió (o fue un clic rápido), permitir borrar si es necesario
              // Aunque el prompt pide solo mejorar el movimiento
            }}
          >
            <LampModel type={lamp.type} />
            {/* Botón de borrado pequeño opcional sobre la lámpara */}
            <mesh 
              position={[0, -0.05, 0.05]} 
              visible={false} 
              onClick={(e) => { e.stopPropagation(); onRemoveLamp(lamp.id); }}
            >
              <sphereGeometry args={[0.05]} />
            </mesh>
          </group>
        ))}
      </group>
    );
  };

  return (
    <group onPointerUp={() => { setDraggingLamp(null); setGlobalDraggingLamp(null); }}>
      {systemConfig.layout === 'LINEAL' && renderTrackSegment(0, width, [0, 0, 0], [0, 0, 0])}
      {systemConfig.layout === 'RECTANGULAR' && (
        <>
          {renderTrackSegment(0, width, [0, 0, depth / 2], [0, 0, 0])}
          {renderTrackSegment(2, width, [0, 0, -depth / 2], [0, 0, 0])}
          {renderTrackSegment(1, depth, [-width / 2, 0, 0], [0, Math.PI / 2, 0])}
          {renderTrackSegment(3, depth, [width / 2, 0, 0], [0, Math.PI / 2, 0])}
        </>
      )}
      {systemConfig.layout === 'FORMA L' && (
        <>
          {renderTrackSegment(0, width, [width / 2, 0, 0], [0, 0, 0])}
          {renderTrackSegment(1, depth, [width, 0, depth / 2], [0, Math.PI / 2, 0])}
        </>
      )}
      {systemConfig.layout === 'FORMA U' && (
        <>
          {renderTrackSegment(0, width, [width / 2, 0, 0], [0, 0, 0])}
          {renderTrackSegment(1, depth, [width, 0, depth / 2], [0, Math.PI / 2, 0])}
          {renderTrackSegment(2, width, [width / 2, 0, depth], [0, 0, 0])}
        </>
      )}
    </group>
  );
};
