import { useEffect, useRef, useState } from "react";

export default function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse interactive tracking
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Define 3D Interactive Star Field Particles
    interface Particle {
      x: number;
      y: number;
      z: number;
      size: number;
      color: string;
      speed: number;
      angle: number;
    }

    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * width - width / 2,
      y: Math.random() * height - height / 2,
      z: Math.random() * 1000 + 100, // Depth
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.4 ? "rgba(59, 130, 246, 0.35)" : "rgba(168, 85, 247, 0.25)",
      speed: Math.random() * 0.3 + 0.1,
      angle: Math.random() * Math.PI * 2,
    }));

    // Neural Grid Nodes
    interface GridNode {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      color: string;
      pulse: number;
    }

    const gridNodes: GridNode[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 500,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      color: "rgba(59, 130, 246, 0.15)",
      pulse: Math.random() * Math.PI,
    }));

    // Vertical Blue Laser Rain Particles
    interface LaserRain {
      x: number;
      y: number;
      speed: number;
      length: number;
      alpha: number;
    }

    const lasers: LaserRain[] = Array.from({ length: 25 }, () => ({
      x: Math.random() * width,
      y: Math.random() * -height,
      speed: Math.random() * 5 + 3,
      length: Math.random() * 120 + 60,
      alpha: Math.random() * 0.12 + 0.03,
    }));

    const render = () => {
      // Clear with absolute black / deep cobalt gradient background
      ctx.fillStyle = "#030307";
      ctx.fillRect(0, 0, width, height);

      // Interpolate mouse coordinates for fluid, slow lag cinematic sweep
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const cameraX = (mouse.x - width / 2) * -0.06;
      const cameraY = (mouse.y - height / 2) * -0.06 + scrollOffset * 0.15;

      // 1. Draw volumetric background glow blobs (Aurora System)
      const blobGrad1 = ctx.createRadialGradient(
        width * 0.25 + cameraX * 0.8,
        height * 0.3 + cameraY * 0.5,
        0,
        width * 0.25 + cameraX * 0.8,
        height * 0.3 + cameraY * 0.5,
        450
      );
      blobGrad1.addColorStop(0, "rgba(59, 130, 246, 0.07)");
      blobGrad1.addColorStop(0.5, "rgba(99, 102, 241, 0.02)");
      blobGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = blobGrad1;
      ctx.beginPath();
      ctx.arc(width * 0.25 + cameraX * 0.8, height * 0.3 + cameraY * 0.5, 450, 0, Math.PI * 2);
      ctx.fill();

      const blobGrad2 = ctx.createRadialGradient(
        width * 0.75 - cameraX * 0.5,
        height * 0.7 - cameraY * 0.7,
        0,
        width * 0.75 - cameraX * 0.5,
        height * 0.7 - cameraY * 0.7,
        500
      );
      blobGrad2.addColorStop(0, "rgba(168, 85, 247, 0.05)");
      blobGrad2.addColorStop(0.5, "rgba(59, 130, 246, 0.015)");
      blobGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = blobGrad2;
      ctx.beginPath();
      ctx.arc(width * 0.75 - cameraX * 0.5, height * 0.7 - cameraY * 0.7, 500, 0, Math.PI * 2);
      ctx.fill();

      // 2. Render 3D Floating Particles
      particles.forEach((p) => {
        p.z -= p.speed * 4;
        if (p.z <= 0) {
          p.z = 1000;
          p.x = Math.random() * width - width / 2;
          p.y = Math.random() * height - height / 2;
        }

        // Project particle coordinates into 3D view space
        const scale = 400 / p.z;
        const px = p.x * scale + width / 2 + cameraX * (1 - p.z / 1000);
        const py = p.y * scale + height / 2 + cameraY * (1 - p.z / 1000);
        const size = p.size * scale;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      });

      // 3. Render Neural Network grid
      gridNodes.forEach((node) => {
        // Move nodes slowly
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.01;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Apply dynamic parallax coordinate modification
        const nx = node.x + cameraX * 0.4;
        const ny = node.y + cameraY * 0.4;

        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        const pulseAlpha = 0.15 + Math.sin(node.pulse) * 0.08;
        ctx.fillStyle = `rgba(59, 130, 246, ${pulseAlpha})`;
        ctx.fill();
      });

      // Draw Connection links between neural nodes
      const maxConnectDist = 170;
      for (let i = 0; i < gridNodes.length; i++) {
        for (let j = i + 1; j < gridNodes.length; j++) {
          const n1 = gridNodes[i];
          const n2 = gridNodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(n1.x + cameraX * 0.4, n1.y + cameraY * 0.4);
            ctx.lineTo(n2.x + cameraX * 0.4, n2.y + cameraY * 0.4);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 4. Draw Digital Laser Rain Columns
      lasers.forEach((l) => {
        l.y += l.speed;
        if (l.y > height) {
          l.y = -l.length - 20;
          l.x = Math.random() * width;
          l.speed = Math.random() * 5 + 3;
        }

        const lx = l.x + cameraX * 0.2;
        const ly = l.y + cameraY * 0.2;

        const laserGrad = ctx.createLinearGradient(lx, ly, lx, ly + l.length);
        laserGrad.addColorStop(0, "rgba(59, 130, 246, 0)");
        laserGrad.addColorStop(0.7, `rgba(59, 130, 246, ${l.alpha * 0.55})`);
        laserGrad.addColorStop(1, `rgba(168, 85, 247, ${l.alpha})`);

        ctx.strokeStyle = laserGrad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + l.length);
        ctx.stroke();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [scrollOffset]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-80"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
