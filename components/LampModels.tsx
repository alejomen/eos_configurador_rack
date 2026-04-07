
import React from 'react';
import { LampType } from '../types';

interface LampModelProps {
  type: LampType;
  isPreview?: boolean;
}

export const LampModel: React.FC<LampModelProps> = ({ type, isPreview }) => {
  const opacity = isPreview ? 0.4 : 1;
  const color = isPreview ? "#4ade80" : "#111111"; // Green tint for placement preview

  if (type === LampType.SPOT_DIRECTIONAL) {
    return (
      <group>
        {/* Magnetic Adapter */}
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
        {/* Arm */}
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.1]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
        {/* Head */}
        <group position={[0, -0.1, 0]} rotation={[0.5, 0, 0]}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
          {/* Lens */}
          {!isPreview && (
            <mesh position={[0, -0.11, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <circleGeometry args={[0.025, 32]} />
                <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} />
            </mesh>
          )}
        </group>
      </group>
    );
  }

  // FIXED RACK (8 lights)
  return (
    <group>
      {/* Main Body */}
      <mesh position={[0, -0.015, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.03]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* 8 Spots */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i} position={[(i - 3.5) * 0.045, -0.035, 0]}>
          <mesh>
            <boxGeometry args={[0.035, 0.01, 0.03]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
          {!isPreview && (
            <mesh position={[0, -0.006, 0]}>
              <boxGeometry args={[0.02, 0.005, 0.02]} />
              <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};
