
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { LampType, PRODUCT_DETAILS } from '../types';
import { LampModel } from './LampModels';

interface ProductModalProps {
  productType: LampType | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ productType, onClose }) => {
  if (!productType) return null;

  const product = PRODUCT_DETAILS[productType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="relative h-64 bg-gray-100 cursor-move">
          <Canvas camera={{ position: [0, 0.2, 0.5], fov: 45 }}>
            <Suspense fallback={null}>
              <Environment preset="city" />
              <ambientLight intensity={0.5} />
              <spotLight position={[1, 2, 1]} intensity={1} />
              <group position={[0, 0, 0]} scale={1.5}>
                <LampModel type={productType} isPreview={false} lightsOn={true} lightIntensity={50} />
              </group>
              <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={1} blur={2} far={1} />
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
            </Suspense>
          </Canvas>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-black shadow-sm hover:bg-white"
          >
            ✕
          </button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-light text-gray-900 leading-tight">{product.name}</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Componente Magnético 48V</p>
            </div>
            <span className="text-xl font-medium text-black">${product.price}.00</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-8">
            {product.description}
          </p>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-gray-800 transition-colors"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
