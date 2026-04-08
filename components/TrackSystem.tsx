
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
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  deleteMode: boolean;
}

export const TrackSystem: React.FC<TrackSystemProps> = ({ 
  config, systemId, systemConfig, onTrackClick, onUpdateLampPos, activeLampType, onRemoveLamp, isSelected, setGlobalDraggingLamp, selectedObjectId, onSelectObject, deleteMode
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
            const localPoint = e.eventObject.parent!.worldToLocal(e.point.clone());
            const localX = localPoint.x;
            const normalizedPos = (localX + length / 2) / length;

            if (activeLampType && !draggingLamp) {
              setHoveredTrack({ index, pos: Math.max(0, Math.min(1, normalizedPos)) });
            }
          }}
          onPointerOut={() => {
            if (!draggingLamp) setHoveredTrack(null);
          }}
          onClick={(e) => {
             if (activeLampType && !draggingLamp) {
               e.stopPropagation();
               const localPoint = e.eventObject.parent!.worldToLocal(e.point.clone());
               const localX = localPoint.x;
               const normalizedPos = Math.max(0, Math.min(1, (localX + length / 2) / length));
               onTrackClick(e, index, normalizedPos);
             }
          }}
          position={[0, trackY, 0]}
          castShadow
        >
          <boxGeometry args={[length, railThickness, railThickness]} />
          <meshStandardMaterial color={deleteMode ? "#ef4444" : (isSelected ? "#000" : "#111")} roughness={0.9} />
        </mesh>

        {draggingLamp && draggingLamp.index === index && (
          <mesh
            position={[0, 0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={(e) => {
              e.stopPropagation();
              const localPoint = e.eventObject.parent!.worldToLocal(e.point.clone());
              const localX = localPoint.x;
              const adjustedX = localX + draggingLamp.offset;
              const finalPos = Math.max(0, Math.min(1, (adjustedX + length / 2) / length));
              onUpdateLampPos(systemId, draggingLamp.id, finalPos);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setDraggingLamp(null);
              setGlobalDraggingLamp(null);
            }}
          >
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0} />
          </mesh>
        )}
        
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
        {lamps.filter(l => l.trackIndex === index).map(lamp => {
          const lampX = lamp.position * length - length/2;
          const isLampSelected = selectedObjectId === lamp.id;
          
          return (
            <React.Fragment key={lamp.id}>
              <group 
                position={[lampX, trackY - railThickness/2, 0]}
                rotation={[0, lamp.rotation, 0]}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (deleteMode) {
                    onRemoveLamp(lamp.id);
                  } else {
                    onSelectObject(lamp.id);
                  }
                }}
              >
                <LampModel type={lamp.type} />
                {deleteMode && (
                  <mesh position={[0, -0.1, 0]}>
                    <sphereGeometry args={[0.08]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
                  </mesh>
                )}
              </group>

              {/* The Green Ring on the floor */}
              {isLampSelected && !deleteMode && (
                <group
                  position={[lampX, 0.01, 0]}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const localPoint = e.eventObject.parent!.worldToLocal(e.point.clone());
                    const offset = lampX - localPoint.x;
                    setDraggingLamp({ id: lamp.id, index: index, offset: offset });
                    setGlobalDraggingLamp(lamp.id);
                  }}
                >
                  <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.3, 0.35, 32]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
                  </mesh>
                  {/* Hit area */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[0.6, 32]} />
                    <meshBasicMaterial transparent opacity={0} />
                  </mesh>
                </group>
              )}
            </React.Fragment>
          );
        })}
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
