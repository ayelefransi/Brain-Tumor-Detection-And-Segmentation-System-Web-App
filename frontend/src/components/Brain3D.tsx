"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function BrainMock() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <MeshDistortMaterial
          color="#3B7BFF"
          emissive="#1A4A99"
          emissiveIntensity={0.5}
          distort={0.4}
          speed={1.5}
          wireframe={true}
        />
        {/* Mock tumor core */}
        <Sphere args={[0.5, 32, 32]} position={[0.8, 0.5, 0.5]}>
          <MeshDistortMaterial color="#FF4560" emissive="#FF4560" emissiveIntensity={1} distort={0.2} speed={2} />
        </Sphere>
      </mesh>
    </Float>
  );
}

export default function Brain3D() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <BrainMock />
        <OrbitControls enableZoom={true} enablePan={false} autoRotate={false} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
