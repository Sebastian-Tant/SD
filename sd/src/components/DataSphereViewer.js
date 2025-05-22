import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

function DataSphere() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.6, 48, 48]} /> {/* Slightly increased detail */}
      <meshStandardMaterial 
        color="#3b82f6" // A blue color, can be indigo-500
        wireframe={true}
        emissive="#6366f1" // indigo-500
        emissiveIntensity={0.4}
        transparent={true}
        opacity={0.75}
      />
    </mesh>
  );
}

export default function DataSphereViewer() {
  return (
    <div className="w-full h-[300px] md:h-[350px] lg:h-[400px] rounded-xl overflow-hidden 
                   bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 
                   shadow-xl hover:shadow-blue-500/20 transition-shadow duration-500">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }}> {/* Adjusted camera slightly */}
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-10, -5, -10]} intensity={0.8} color="#818cf8" /> {/* Softer indigo light */}
        
        <DataSphere />
        <Stars radius={80} depth={40} count={4000} factor={3} saturation={0} fade speed={0.8} />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false} // Pan might not be needed for this view
          enableRotate={true}
          zoomSpeed={0.5}
          rotateSpeed={0.3}
          minDistance={3} // Prevent zooming too close
          maxDistance={10} // Prevent zooming too far
          autoRotate // Subtle auto-rotation
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}