
import React from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

export const HumanScale: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      <Billboard follow={true}>
        {/* Simplified 2D human silhouette using a shape */}
        <mesh position={[0, 0.85, 0]}>
          <planeGeometry args={[0.55, 1.7]} />
          <meshBasicMaterial 
            color="#cccccc" 
            transparent 
            opacity={0.8}
            side={THREE.DoubleSide}
            alphaTest={0.1}
          />
        </mesh>
      </Billboard>
      {/* Label indicating height */}
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.4, 0.1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
      
      {/* Visual base for the silhouette location */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.22, 32]} />
        <meshBasicMaterial color="#d1d5db" />
      </mesh>
    </group>
  );
};
