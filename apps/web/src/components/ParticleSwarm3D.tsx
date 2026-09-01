"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function ParticleSwarm() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const count = 8000;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pColor = useMemo(() => new THREE.Color(), []);

  const positions = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      pos.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80,
        ),
      );
    }
    return pos;
  }, [count]);

  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.25), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    [],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const speed = 0.4;
    const chaos = 12.0;
    const coreSize = 6.0;

    for (let i = 0; i < count; i++) {
      const norm = i / count;
      const progress = (norm + time * speed * 0.2) % 1.0;
      const easeProgress = Math.pow(progress, 1.5);

      const goldenRatio = (1.0 + Math.sqrt(5.0)) / 2.0;
      const theta = (2.0 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1.0 - 2.0 * norm);

      const currentRadius = coreSize + 100.0 * (1.0 - easeProgress);
      const instability = Math.pow(1.0 - progress, 2.0);

      const wobbleX = Math.sin(time * 2.0 + norm * 100.0) * chaos * instability;
      const wobbleY = Math.cos(time * 1.5 + norm * 200.0) * chaos * instability;
      const wobbleZ = Math.sin(time * 3.0 - norm * 300.0) * chaos * instability;

      const sinPhi = Math.sin(phi);
      const x = currentRadius * sinPhi * Math.cos(theta) + wobbleX;
      const y = currentRadius * sinPhi * Math.sin(theta) + wobbleY;
      const z = currentRadius * Math.cos(phi) + wobbleZ;

      target.set(x, y, z);

      const currentPos = positions[i];
      if (currentPos) {
        currentPos.lerp(target, 0.08);
        dummy.position.copy(currentPos);
      }

      const hue = 0.52 + 0.28 * progress;
      const saturation = 0.85;
      const corePulse = progress > 0.94 ? Math.sin(time * 10.0) * 0.3 : 0.0;
      const lightness = Math.max(
        0.1,
        Math.min(0.9, 0.25 + 0.55 * progress + corePulse),
      );

      pColor.setHSL(hue, saturation, lightness);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, pColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
}

export default function ParticleSwarm3D() {
  return (
    <div className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none bg-[#090a0f]">
      <Canvas camera={{ position: [0, 0, 75], fov: 60 }}>
        <fog attach="fog" args={["#090a0f", 30, 140]} />
        <ParticleSwarm />
        <OrbitControls
          autoRotate={true}
          autoRotateSpeed={0.8}
          enableZoom={false}
        />
      </Canvas>
    </div>
  );
}
