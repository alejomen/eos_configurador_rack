
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LampType } from '../types';

interface LampModelProps {
  type: LampType;
  isPreview?: boolean;
  lightsOn?: boolean;
  lightIntensity?: number;
  target?: [number, number, number];
  isSelected?: boolean;
}

const RackSpot: React.FC<{ position: [number, number, number], color: string, opacity: number, isPreview?: boolean, lightsOn?: boolean, lightIntensity: number }> = ({ position, color, opacity, isPreview, lightsOn, lightIntensity }) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  
  useFrame(() => {
    if (lightRef.current && lightRef.current.target) {
      // For the rack, we want the light to always point straight down relative to the light's position.
      // Since the target is attached but not in the scene graph, we update its local position 
      // and then force a world matrix update.
      lightRef.current.target.position.set(0, -1, 0);
      
      // We need to apply the parent's world matrix to the target so it points down in world space
      // relative to the rack's orientation.
      if (lightRef.current.parent) {
        lightRef.current.target.matrixWorld.copy(lightRef.current.parent.matrixWorld);
        lightRef.current.target.matrixWorld.multiply(new THREE.Matrix4().makeTranslation(0, -1, 0));
      }
    }
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.035, 0.01, 0.03]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {!isPreview && (
        <mesh position={[0, -0.006, 0]}>
          <boxGeometry args={[0.02, 0.005, 0.02]} />
          <meshStandardMaterial color={lightsOn ? "#fef08a" : "#e5e7eb"} emissive={lightsOn ? "#fef08a" : "#000000"} emissiveIntensity={lightsOn ? lightIntensity / 30 : 0} />
        </mesh>
      )}
      {lightsOn && !isPreview && (
        <spotLight 
          ref={lightRef}
          position={[0, -0.01, 0]} 
          angle={0.6} 
          penumbra={0.8} 
          intensity={lightIntensity * 0.15} 
          castShadow={false} 
          distance={8}
          decay={2}
          color="#fef08a"
        >
          <object3D attach="target" />
        </spotLight>
      )}
    </group>
  );
};

export const LampModel: React.FC<LampModelProps> = ({ type, isPreview, lightsOn, lightIntensity = 100, target, isSelected }) => {
  const opacity = isPreview ? 0.4 : 1;
  const color = isPreview ? "#4ade80" : isSelected ? "#22c55e" : "#111111"; // Green tint for placement preview or selection
  const headRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.SpotLight>(null);

  useFrame(() => {
    if (headRef.current && groupRef.current && target) {
      // Get the world position of the lamp
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      
      // Create a dummy object at the lamp's world position
      const dummy = new THREE.Object3D();
      dummy.position.copy(worldPos);
      
      // Look at the target
      dummy.lookAt(target[0], target[1], target[2]);
      
      // Apply the rotation to the head
      // We need to convert the world rotation to local rotation
      const parent = headRef.current.parent;
      if (parent) {
        dummy.updateMatrixWorld();
        const localMatrix = new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(dummy.matrixWorld);
        dummy.rotation.setFromRotationMatrix(localMatrix);
      }
      
      headRef.current.rotation.copy(dummy.rotation);
      
      // Add an offset because the cylinder is oriented along Y by default
      headRef.current.rotateX(-Math.PI / 2);
    }

    if (lightRef.current && lightRef.current.target) {
      lightRef.current.target.updateMatrixWorld();
    }
  });

  if (type === LampType.SPOT_DIRECTIONAL) {
    return (
      <group ref={groupRef}>
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
        <group ref={headRef} position={[0, -0.1, 0]} rotation={[0.5, 0, 0]}>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.12]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
          {/* Lens */}
          {!isPreview && (
            <mesh position={[0, -0.11, 0]}>
                <cylinderGeometry args={[0.028, 0.028, 0.005, 32]} />
                <meshStandardMaterial color={lightsOn ? "#fef08a" : "#e5e7eb"} emissive={lightsOn ? "#fef08a" : "#000000"} emissiveIntensity={lightsOn ? lightIntensity / 20 : 0} />
            </mesh>
          )}
          {lightsOn && !isPreview && (
            <spotLight 
              ref={lightRef}
              position={[0, -0.11, 0]} 
              angle={0.55} 
              penumbra={0.8} 
              intensity={lightIntensity * 0.4} 
              castShadow={false} 
              distance={12}
              decay={2}
              color="#fef08a"
            >
              <object3D position={target || [0, -1, 0]} attach="target" />
            </spotLight>
          )}
        </group>
      </group>
    );
  }

  // FIXED RACK (8 lights)
  return (
    <group ref={groupRef}>
      {/* Main Body */}
      <mesh position={[0, -0.015, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.03]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>

      {/* 8 Spots */}
      {Array.from({ length: 8 }).map((_, i) => (
        <RackSpot 
          key={i} 
          position={[(i - 3.5) * 0.045, -0.035, 0]} 
          color={color} 
          opacity={opacity} 
          isPreview={isPreview} 
          lightsOn={lightsOn} 
          lightIntensity={lightIntensity} 
        />
      ))}
    </group>
  );
};
