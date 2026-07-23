import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import soundSynth from "../utils/audioSynth";

export type BackgroundMode = "neural" | "solarsystem" | "cyber";

interface ThreeDBackgroundProps {
  mode?: BackgroundMode;
  onModeChange?: (mode: BackgroundMode) => void;
}

export function ThreeDBackground({ mode = "neural", onModeChange }: ThreeDBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentModeRef = useRef<BackgroundMode>(mode);
  currentModeRef.current = mode;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030307, 0.0015);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030307, 1);
    
    // Clear existing canvas
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Mouse tracking for parallax
    let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX - window.innerWidth / 2) * 0.2;
      mouse.targetY = (e.clientY - window.innerHeight / 2) * 0.2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x6366f1, 2, 800);
    pointLight.position.set(0, 100, 200);
    scene.add(pointLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 1.5, 600);
    cyanLight.position.set(-200, -100, 100);
    scene.add(cyanLight);

    // ==========================================
    // 1. SCENE 1: NEURAL NETWORK MESH GROUP
    // ==========================================
    const neuralGroup = new THREE.Group();
    scene.add(neuralGroup);

    // Neural Nodes
    const nodeCount = 120;
    const nodeGeometry = new THREE.SphereGeometry(2, 12, 12);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
    const nodeInstanced = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount);

    const nodePositions: THREE.Vector3[] = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < nodeCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 500
      );
      nodePositions.push(pos);
      dummy.position.copy(pos);
      dummy.scale.setScalar(Math.random() * 0.8 + 0.6);
      dummy.updateMatrix();
      nodeInstanced.setMatrixAt(i, dummy.matrix);
    }
    neuralGroup.add(nodeInstanced);

    // Neural Connection Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    const maxConnections = 300;
    const linePositions = new Float32Array(maxConnections * 2 * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    neuralGroup.add(lineSegments);

    // Central Core Wireframe Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(60, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      wireframe: true,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    neuralGroup.add(coreMesh);

    // Inner Glowing Core Sphere
    const innerCoreGeo = new THREE.SphereGeometry(30, 24, 24);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.25
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    neuralGroup.add(innerCoreMesh);

    // ==========================================
    // 2. SCENE 2: 3D ANIMATED SOLAR SYSTEM GROUP (AIJOBS LOGO CORE)
    // ==========================================
    const solarGroup = new THREE.Group();
    scene.add(solarGroup);

    // Dynamic AIJOBS Canvas Texture
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = 512;
    logoCanvas.height = 512;
    const lCtx = logoCanvas.getContext("2d");
    if (lCtx) {
      const grad = lCtx.createRadialGradient(256, 256, 20, 256, 256, 250);
      grad.addColorStop(0, "#818cf8");
      grad.addColorStop(0.4, "#4f46e5");
      grad.addColorStop(0.8, "#1e1b4b");
      grad.addColorStop(1, "#0f172a");
      lCtx.fillStyle = grad;
      lCtx.fillRect(0, 0, 512, 512);

      // AIJOBS Branding
      lCtx.font = "900 78px sans-serif";
      lCtx.textAlign = "center";
      lCtx.textBaseline = "middle";
      lCtx.fillStyle = "#ffffff";
      lCtx.shadowColor = "#38bdf8";
      lCtx.shadowBlur = 24;
      lCtx.fillText("AIJOBS", 256, 256);
      
      // Subtitle
      lCtx.font = "bold 24px sans-serif";
      lCtx.fillStyle = "#38bdf8";
      lCtx.shadowBlur = 10;
      lCtx.fillText("RECRUITMENT 5D", 256, 320);
    }
    const aiJobsTexture = new THREE.CanvasTexture(logoCanvas);

    // Central AIJOBS Solar Core Sphere
    const sunGeo = new THREE.SphereGeometry(38, 32, 32);
    const sunMat = new THREE.MeshStandardMaterial({ 
      map: aiJobsTexture,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0x4338ca,
      emissiveIntensity: 0.4
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    solarGroup.add(sun);

    // AIJOBS Dual Rotating Orbital Logo Rings
    const ring1Geo = new THREE.TorusGeometry(52, 1.2, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const logoRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    logoRing1.rotation.x = Math.PI / 3;
    solarGroup.add(logoRing1);

    const ring2Geo = new THREE.TorusGeometry(58, 1.2, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
    const logoRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    logoRing2.rotation.y = Math.PI / 3;
    solarGroup.add(logoRing2);

    // Sun Glow Halo
    const sunGlowGeo = new THREE.SphereGeometry(48, 32, 32);
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    solarGroup.add(sunGlow);

    // Orbiting Planets Config
    const planetData = [
      { name: "Mercury", radius: 5, distance: 70, speed: 0.025, color: 0x94a3b8 },
      { name: "Venus", radius: 8, distance: 105, speed: 0.018, color: 0xfb923c },
      { name: "Earth", radius: 9, distance: 150, speed: 0.012, color: 0x38bdf8, hasMoon: true },
      { name: "Mars", radius: 7, distance: 195, speed: 0.009, color: 0xf87171 },
      { name: "Jupiter", radius: 18, distance: 265, speed: 0.005, color: 0xeab308, hasRings: true },
      { name: "Saturn", radius: 14, distance: 330, speed: 0.003, color: 0xc084fc, hasRings: true }
    ];

    interface PlanetPivot {
      mesh: THREE.Mesh;
      pivot: THREE.Group;
      speed: number;
      moonPivot?: THREE.Group;
    }

    const planetPivots: PlanetPivot[] = [];

    planetData.forEach((pd) => {
      // Orbit Path Ring
      const orbitGeo = new THREE.RingGeometry(pd.distance - 0.8, pd.distance + 0.8, 64);
      const orbitMat = new THREE.MeshBasicMaterial({
        color: 0x475569,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25
      });
      const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
      orbitRing.rotation.x = Math.PI / 2;
      solarGroup.add(orbitRing);

      // Planet Pivot
      const pivot = new THREE.Group();
      solarGroup.add(pivot);

      const pGeo = new THREE.SphereGeometry(pd.radius, 24, 24);
      const pMat = new THREE.MeshStandardMaterial({
        color: pd.color,
        roughness: 0.4,
        metalness: 0.2
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.x = pd.distance;
      pivot.add(pMesh);

      // Saturn / Jupiter Rings
      if (pd.hasRings) {
        const ringGeo = new THREE.RingGeometry(pd.radius * 1.4, pd.radius * 2.3, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: pd.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        pMesh.add(ring);
      }

      // Earth Moon
      let moonPivot: THREE.Group | undefined;
      if (pd.hasMoon) {
        moonPivot = new THREE.Group();
        moonPivot.position.x = pd.distance;
        pivot.add(moonPivot);

        const mGeo = new THREE.SphereGeometry(2.5, 12, 12);
        const mMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
        const moon = new THREE.Mesh(mGeo, mMat);
        moon.position.x = pd.radius + 10;
        moonPivot.add(moon);
      }

      planetPivots.push({ mesh: pMesh, pivot, speed: pd.speed, moonPivot });
    });

    // Cosmic Starfield background for Solar System
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starCoords = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starCoords[i] = (Math.random() - 0.5) * 1600;
      starCoords[i + 1] = (Math.random() - 0.5) * 1200;
      starCoords[i + 2] = (Math.random() - 0.5) * 1400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    solarGroup.add(starPoints);

    // ==========================================
    // 3. SCENE 3: QUANTUM CYBER PARTICLES GROUP
    // ==========================================
    const cyberGroup = new THREE.Group();
    scene.add(cyberGroup);

    const cyberParticleCount = 600;
    const cyberGeo = new THREE.BufferGeometry();
    const cyberPositions = new Float32Array(cyberParticleCount * 3);
    const cyberSpeeds: number[] = [];

    for (let i = 0; i < cyberParticleCount; i++) {
      cyberPositions[i * 3] = (Math.random() - 0.5) * 800;
      cyberPositions[i * 3 + 1] = (Math.random() - 0.5) * 600;
      cyberPositions[i * 3 + 2] = (Math.random() - 0.5) * 600;
      cyberSpeeds.push(Math.random() * 0.8 + 0.2);
    }

    cyberGeo.setAttribute("position", new THREE.BufferAttribute(cyberPositions, 3));
    const cyberMat = new THREE.PointsMaterial({
      size: 3,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const cyberPoints = new THREE.Points(cyberGeo, cyberMat);
    cyberGroup.add(cyberPoints);

    // Torus Knot Matrix Architecture
    const torusGeo = new THREE.TorusKnotGeometry(70, 18, 100, 16);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      wireframe: true,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.5
    });
    const torusKnot = new THREE.Mesh(torusGeo, torusMat);
    cyberGroup.add(torusKnot);

    // ==========================================
    // ANIMATION & RENDER LOOP (60 FPS)
    // ==========================================
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const currentMode = currentModeRef.current;

      // Mouse Parallax Smooth Interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x;
      camera.position.y = -mouse.y;
      camera.lookAt(0, 0, 0);

      // Visibility toggles based on current active mode
      neuralGroup.visible = currentMode === "neural";
      solarGroup.visible = currentMode === "solarsystem";
      cyberGroup.visible = currentMode === "cyber";

      if (currentMode === "neural") {
        // Rotate Core Mesh
        coreMesh.rotation.x = elapsedTime * 0.15;
        coreMesh.rotation.y = elapsedTime * 0.2;
        innerCoreMesh.rotation.y = -elapsedTime * 0.3;

        // Dynamic Line Connections Update
        let lineIdx = 0;
        const maxDist = 110;
        const positions = lineGeometry.attributes.position.array as Float32Array;

        for (let i = 0; i < nodeCount; i++) {
          for (let j = i + 1; j < nodeCount; j++) {
            if (lineIdx >= maxConnections * 6) break;

            const p1 = nodePositions[i];
            const p2 = nodePositions[j];
            const dist = p1.distanceTo(p2);

            if (dist < maxDist) {
              positions[lineIdx++] = p1.x;
              positions[lineIdx++] = p1.y;
              positions[lineIdx++] = p1.z;
              positions[lineIdx++] = p2.x;
              positions[lineIdx++] = p2.y;
              positions[lineIdx++] = p2.z;
            }
          }
        }
        lineGeometry.attributes.position.needsUpdate = true;
        neuralGroup.rotation.y = elapsedTime * 0.05;
      } else if (currentMode === "solarsystem") {
        // Rotate Sun & Logo Rings
        sun.rotation.y = elapsedTime * 0.15;
        logoRing1.rotation.z = elapsedTime * 0.25;
        logoRing2.rotation.z = -elapsedTime * 0.3;
        sunGlow.rotation.y = -elapsedTime * 0.05;

        // Orbit Planets
        planetPivots.forEach((pp) => {
          pp.pivot.rotation.y += pp.speed * 0.8;
          pp.mesh.rotation.y += 0.02;
          if (pp.moonPivot) {
            pp.moonPivot.rotation.y += 0.05;
          }
        });

        solarGroup.rotation.x = 0.35; // Slight isometric tilt
        solarGroup.rotation.y = elapsedTime * 0.02;
      } else if (currentMode === "cyber") {
        // Cyber Torus Knot Rotation
        torusKnot.rotation.x = elapsedTime * 0.25;
        torusKnot.rotation.y = elapsedTime * 0.35;

        // Animate Floating Cyber Particles
        const positions = cyberGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < cyberParticleCount; i++) {
          positions[i * 3 + 1] -= cyberSpeeds[i];
          if (positions[i * 3 + 1] < -300) {
            positions[i * 3 + 1] = 300;
          }
        }
        cyberGeo.attributes.position.needsUpdate = true;
        cyberGroup.rotation.y = elapsedTime * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-85"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

export default ThreeDBackground;
