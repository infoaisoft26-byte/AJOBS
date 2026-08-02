import { Component, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { ref } from "firebase/storage";
import { motion } from "motion/react";
import { Cable, Component, Container, Group, Key, Mouse, Scroll, Shell } from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Html } from "@react-three/drei";
import * as THREE from "three";

// Mouse and Scroll parallax state hook
function useSceneControls() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { mouse, scrollY };
}

// 1. Solid Fibre-Optic Energy Cable Component
function FibreCable({ start, end, active }: { start: [number, number, number]; end: [number, number, number]; active?: boolean }) {
  const lineRef = useRef<THREE.Line>(null!);
  const pulseRef = useRef<THREE.Mesh>(null!);

  const curve = useMemo(() => {
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);
    mid.y += 0.3; // subtle curve arc
    return new THREE.QuadraticBezierCurve3(vStart, mid, vEnd);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(32), [curve]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame((state, delta) => {
    if (pulseRef.current) {
      const t = (state.clock.getElapsedTime() * 0.4) % 1;
      const point = curve.getPoint(t);
      pulseRef.current.position.copy(point);
    }
  });

  return (
    <group>
      {/* Physical Cable Wire */}
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color="#0284c7" transparent opacity={0.6} linewidth={1.5} />
      </line>

      {/* Energy Pulse travelling along fibre-optic wire */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

// 2. Physical Data Capsule Node (Talent, Skills, Resume, Matching, Consultancy, Opportunity)
function DataCapsule({
  position,
  label,
  iconSymbol,
  isMobile,
}: {
  position: [number, number, number];
  label: string;
  iconSymbol: string;
  isMobile: boolean;
}) {
  const meshGroupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Fibre cable connecting to Central AI Core [0,0,0] */}
      <FibreCable start={position} end={[0, 0, 0]} />

      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={meshGroupRef}>
          {/* Main Brushed Titanium Capsule Body */}
          <mesh>
            <capsuleGeometry args={[isMobile ? 0.22 : 0.28, isMobile ? 0.5 : 0.65, 16, 32]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.92}
              roughness={0.22}
              envMapIntensity={1.5}
            />
          </mesh>

          {/* Polished Metallic Ring Accent */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[isMobile ? 0.23 : 0.29, isMobile ? 0.23 : 0.29, 0.08, 32]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.8}
              metalness={0.95}
              roughness={0.1}
            />
          </mesh>

          {/* Smoked Dark Glass Core Inset */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[isMobile ? 0.21 : 0.27, isMobile ? 0.21 : 0.27, 0.35, 32]} />
            <meshPhysicalMaterial
              color="#0f172a"
              metalness={0.8}
              roughness={0.15}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>

        {/* Engraved Metallic Label Node */}
        <Html
          position={[0, isMobile ? -0.45 : -0.55, 0]}
          center
          distanceFactor={12}
          className="pointer-events-none select-none"
        >
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-sky-500/40 text-sky-200 text-[10px] font-mono font-bold uppercase tracking-wider shadow-lg backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>{label}</span>
          </div>
        </Html>
      </Float>
    </group>
  );
}

// 3. Central AI Quantum Core
function AiQuantumCore({ isMobile }: { isMobile: boolean }) {
  const coreGroupRef = useRef<THREE.Group>(null!);
  const centralSphereRef = useRef<THREE.Mesh>(null!);
  const innerNucleusRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Group>(null!);
  const ring2Ref = useRef<THREE.Group>(null!);
  const ring3Ref = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    // Very slow, realistic central rotation
    if (centralSphereRef.current) {
      centralSphereRef.current.rotation.y += delta * 0.08;
      centralSphereRef.current.rotation.x += delta * 0.03;
    }

    if (innerNucleusRef.current) {
      const scalePulse = 1 + Math.sin(state.clock.getElapsedTime() * 1.5) * 0.04;
      innerNucleusRef.current.scale.set(scalePulse, scalePulse, scalePulse);
    }

    // Independent mechanical ring rotations
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.12;
      ring1Ref.current.rotation.y += delta * 0.05;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= delta * 0.1;
      ring2Ref.current.rotation.z -= delta * 0.08;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y += delta * 0.15;
    }
  });

  const coreRadius = isMobile ? 1.0 : 1.45;

  return (
    <group ref={coreGroupRef} position={[0, 0, 0]}>
      {/* 3.1 Liquid-Metal Outer AI Shell */}
      <mesh ref={centralSphereRef}>
        <sphereGeometry args={[coreRadius, 64, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.96}
          roughness={0.12}
          wireframe={false}
        />
      </mesh>

      {/* Electric-Blue Emissive Neural Lines Inset */}
      <mesh ref={innerNucleusRef}>
        <sphereGeometry args={[coreRadius * 0.98, 32, 32]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#2563eb"
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* 3.2 Precision Mechanical Ring 1 - Brushed Titanium */}
      <group ref={ring1Ref}>
        <mesh>
          <torusGeometry args={[coreRadius * 1.35, isMobile ? 0.04 : 0.06, 16, 100]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.95}
            roughness={0.2}
          />
        </mesh>
        {/* Node bolts along Ring 1 */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <mesh
            key={idx}
            position={[
              Math.cos(angle) * coreRadius * 1.35,
              Math.sin(angle) * coreRadius * 1.35,
              0,
            ]}
          >
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.2} />
          </mesh>
        ))}
      </group>

      {/* 3.3 Precision Mechanical Ring 2 - Dark Anodized Aluminium */}
      <group ref={ring2Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <mesh>
          <torusGeometry args={[coreRadius * 1.65, isMobile ? 0.03 : 0.05, 16, 100]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* 3.4 Outer Carbon-Fibre Precision Ring 3 */}
      <group ref={ring3Ref} rotation={[-Math.PI / 4, 0, Math.PI / 6]}>
        <mesh>
          <torusGeometry args={[coreRadius * 1.95, isMobile ? 0.02 : 0.035, 16, 100]} />
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.85}
            roughness={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

// 4. Dark Reflective Studio Floor & Lighting Rig
function StudioEnvironment({ isMobile }: { isMobile: boolean }) {
  return (
    <group>
      {/* Product-Photography Studio Lights */}
      {/* Soft Blue Key Light */}
      <directionalLight position={[-6, 6, 6]} intensity={2.5} color="#0284c7" />
      {/* Cool White Rim Light */}
      <directionalLight position={[8, 8, -4]} intensity={2.2} color="#f8fafc" />
      {/* Subtle Purple Backlight */}
      <pointLight position={[0, -4, -6]} intensity={2.0} color="#7c3aed" />
      {/* Studio Ambient */}
      <ambientLight intensity={0.6} color="#0f172a" />

      {/* Dark Reflective Studio Floor */}
      <mesh position={[0, -2.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#020617"
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>
    </group>
  );
}

// 5. Main 3D Scene Controller
function SceneContent({ isMobile, mouse, scrollY }: { isMobile: boolean; mouse: { x: number; y: number }; scrollY: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      // Very subtle mouse parallax depth movement
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mouse.x * 0.15,
        0.04
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -mouse.y * 0.1,
        0.04
      );
    }

    // Gentle scroll camera response (moves camera slightly closer as user scrolls)
    const targetZ = (isMobile ? 8.5 : 7.2) - Math.min(scrollY * 0.0015, 1.2);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
  });

  // On desktop: place AI Quantum Core on the RIGHT side ([2.4, 0, 0]) so hero text on LEFT is clear
  // On mobile: place in top-right background ([0.8, 1.2, -1.0])
  const corePosition: [number, number, number] = isMobile ? [0.8, 1.2, -1.0] : [2.4, 0, 0];

  // Data Capsules positions relative to central AI core
  const capsulesData: Array<{ label: string; icon: string; pos: [number, number, number] }> = [
    { label: "Talent", icon: "user", pos: isMobile ? [-1.6, 1.8, 0] : [-2.2, 1.6, 0.2] },
    { label: "Skills", icon: "sparkles", pos: isMobile ? [1.8, 2.2, -0.5] : [2.0, 2.2, 0.4] },
    { label: "Resume", icon: "file", pos: isMobile ? [-1.8, -1.2, 0] : [-2.4, -1.2, 0.1] },
    { label: "Matching", icon: "zap", pos: isMobile ? [1.6, -1.6, -0.5] : [2.2, -1.6, -0.2] },
    { label: "Consultancy", icon: "building", pos: isMobile ? [0, 2.6, -1] : [0, 2.4, 0.3] },
    { label: "Opportunity", icon: "briefcase", pos: isMobile ? [0, -2.4, -1] : [0, -2.2, 0.2] },
  ];

  return (
    <group ref={groupRef}>
      <StudioEnvironment isMobile={isMobile} />

      {/* Main AI Quantum Intelligence Core Container */}
      <group position={corePosition}>
        <AiQuantumCore isMobile={isMobile} />

        {/* 6 Solid Physical Data Capsules Connected via Fibre-Optic Cables */}
        {capsulesData.map((cap) => (
          <DataCapsule
            key={cap.label}
            position={cap.pos}
            label={cap.label}
            iconSymbol={cap.icon}
            isMobile={isMobile}
          />
        ))}
      </group>
    </group>
  );
}

// 6. Fallback Background for WebGL errors or reduced-motion
function FallbackStudioBackground() {
  return (
    <div className="absolute inset-0 bg-[#020617] flex items-center justify-center overflow-hidden pointer-events-none">
      <div className="w-[600px] h-[600px] rounded-full bg-slate-900 border border-slate-800 shadow-[0_0_80px_rgba(2,132,199,0.2)] flex items-center justify-center">
        <div className="w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-sky-900/40 to-slate-800 border border-sky-500/30 blur-sm animate-pulse" />
      </div>
    </div>
  );
}

export default function Hero3DCanvas() {
  const { mouse, scrollY } = useSceneControls();
  const [isMobile, setIsMobile] = useState(false);
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
    }

    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (hasWebGLError || reducedMotion) {
    return <FallbackStudioBackground />;
  }

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, isMobile ? 8.5 : 7.2], fov: isMobile ? 55 : 48 }}
        dpr={isMobile ? [1, 1.2] : [1, 1.5]}
        gl={{ powerPreference: "high-performance", alpha: true, antialias: !isMobile }}
        onError={() => setHasWebGLError(true)}
        frameloop={isTabHidden ? "never" : "always"}
        className="w-full h-full"
      >
        <SceneContent isMobile={isMobile} mouse={mouse} scrollY={scrollY} />
      </Canvas>
    </div>
  );
}
