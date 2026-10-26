"use client";

import { useEffect, useRef } from "react";

export interface VoxelTopographyGridProps {
  tileSize?: number;
  maxHeight?: number;
  /** Hex color for the voxels, e.g. #3ee58f. */
  primaryColor?: string;
  wireColor?: string;
  /** Hex color the canvas clears to; match the surface behind it. */
  background?: string;
  speed?: number;
  /** Cap on device pixel ratio; 1 is plenty for a background under a scrim. */
  maxDpr?: number;
  /** Frame-rate cap. */
  fps?: number;
  className?: string;
}

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const n = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/**
 * An isometric field of voxels rolling on two sine waves, rising under the
 * pointer. Fills its parent; position the parent. Pauses off screen, and with
 * reduced motion paints a single still frame.
 */
export function VoxelTopographyGrid({
  tileSize = 28,
  maxHeight = 70,
  primaryColor = "#3ee58f",
  wireColor = "rgba(62, 229, 143, 0.35)",
  background = "#0b0b0c",
  speed = 0.015,
  maxDpr = 2,
  fps = 60,
  className = "",
}: VoxelTopographyGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000 };
    let frame = 0;
    let width = 0;
    let height = 0;
    let time = 0;
    let visible = false;

    const base = hexToRgb(primaryColor);
    const shade = (k: number, a: number) =>
      `rgba(${Math.floor(base.r * k)}, ${Math.floor(base.g * k)}, ${Math.floor(base.b * k)}, ${a})`;
    const leftFace = shade(0.45, 0.85);
    const rightFace = shade(0.65, 0.85);
    // Top faces light up with elevation; precomputed so a frame allocates nothing.
    const topLUT = Array.from({ length: 101 }, (_, i) => shade(0.55 + (i / 100) * 0.45, 1));

    const tileW = tileSize * 0.866025; // cos 30°
    const tileH = tileSize * 0.5; // sin 30°
    const radius = 220;
    const invMaxHeight = 1 / (maxHeight + 55);

    const draw = () => {
      time += speed;
      mouse.x += (mouse.targetX - mouse.x) * 0.32;
      mouse.y += (mouse.targetY - mouse.y) * 0.32;

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const cols = Math.ceil(width / tileW) + 4;
      const rows = Math.ceil(height / tileH) + 8;
      const originX = width * 0.5;
      const originY = height / 3.2;

      // Back to front, so nearer voxels paint over farther ones.
      for (let r = -Math.floor(rows / 2); r < Math.ceil(rows / 2); r++) {
        for (let c = -Math.floor(cols / 2); c < Math.ceil(cols / 2); c++) {
          const isoX = originX + (c - r) * tileW;
          const isoY = originY + (c + r) * tileH;

          let h =
            (Math.sin(time * 2 + c * 0.25 + r * 0.25) + Math.cos(time * 1.5 + c * 0.15 - r * 0.3) + 2) *
            0.25 *
            maxHeight;
          const dx = isoX - mouse.x;
          const dy = isoY - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radius * radius) {
            const influence = 1 - Math.sqrt(distSq) / radius;
            h += influence * influence * 55;
          }

          const py = isoY - h;
          if (isoX + tileW < 0 || isoX - tileW > width || py + h + 15 < 0 || py - tileH > height) continue;

          const drop = h + 15;

          ctx.beginPath();
          ctx.moveTo(isoX - tileW, py);
          ctx.lineTo(isoX, py + tileH);
          ctx.lineTo(isoX, py + tileH + drop);
          ctx.lineTo(isoX - tileW, py + drop);
          ctx.closePath();
          ctx.fillStyle = leftFace;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(isoX, py + tileH);
          ctx.lineTo(isoX + tileW, py);
          ctx.lineTo(isoX + tileW, py + drop);
          ctx.lineTo(isoX, py + tileH + drop);
          ctx.closePath();
          ctx.fillStyle = rightFace;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(isoX, py - tileH);
          ctx.lineTo(isoX + tileW, py);
          ctx.lineTo(isoX, py + tileH);
          ctx.lineTo(isoX - tileW, py);
          ctx.closePath();
          const light = Math.min(1, Math.max(0.1, h * invMaxHeight));
          ctx.fillStyle = topLUT[(light * 100) | 0]!;
          ctx.fill();
          ctx.strokeStyle = wireColor;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    };

    let last = 0;
    const loop = (now: number) => {
      frame = 0;
      if (!visible) return;
      if (now - last >= 1000 / fps - 2) {
        last = now;
        draw();
      }
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!still && !frame) frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) start();
    });
    io.observe(container);

    // The container may sit under content, so track the pointer on the window.
    // Scale from the visual box to layout pixels, so CSS zoom never skews it.
    const move = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const k = rect.width ? width / rect.width : 1;
      const x = (e.clientX - rect.left) * k;
      const y = (e.clientY - rect.top) * k;
      const inside = x >= 0 && y >= 0 && x <= width && y <= height;
      mouse.targetX = inside ? x : -1000;
      mouse.targetY = inside ? y : -1000;
    };
    if (!still) window.addEventListener("pointermove", move, { passive: true });

    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [tileSize, maxHeight, primaryColor, wireColor, background, speed, maxDpr, fps]);

  return (
    <div ref={containerRef} aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

export default VoxelTopographyGrid;
