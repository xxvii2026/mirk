"use client";

import { useEffect, useRef } from "react";

export interface VoxelTopographyGridProps {
  tileSize?: number;
  maxHeight?: number;
  /** Hex color for the voxels, e.g. #b9a6ff. */
  primaryColor?: string;
  wireColor?: string;
  /** Hex color the canvas clears to; match the surface behind it. */
  background?: string;
  /** Wave speed, in radians per 60th of a second. */
  speed?: number;
  /** Cap on device pixel ratio. Below 1 renders at reduced resolution and lets CSS scale it up, which suits a dimmed background. */
  maxDpr?: number;
  /** Frame-rate cap. */
  fps?: number;
  className?: string;
}

/** Top faces are shaded in this many elevation steps; each step is one fill per row. */
const LEVELS = 10;
const LIFT = 55;
const RADIUS = 220;

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
 *
 * Voxels on one screen diagonal never overlap, so each diagonal is drawn as a
 * handful of batched paths (left faces, right faces, one per top shade, the
 * wireframe), back to front. That keeps a frame to a few hundred canvas calls
 * instead of several per voxel.
 */
export function VoxelTopographyGrid({
  tileSize = 28,
  maxHeight = 70,
  primaryColor = "#b9a6ff",
  wireColor = "rgba(11, 11, 12, 0.5)",
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
    const shade = (k: number) => `rgb(${Math.floor(base.r * k)}, ${Math.floor(base.g * k)}, ${Math.floor(base.b * k)})`;
    const leftFace = shade(0.4);
    const rightFace = shade(0.58);
    const topShades = Array.from({ length: LEVELS }, (_, i) => shade(0.55 + (i / (LEVELS - 1)) * 0.45));

    const tileW = tileSize * 0.866025; // cos 30°
    const tileH = tileSize * 0.5; // sin 30°
    const invTop = 1 / (maxHeight + LIFT);

    // Per-row scratch, reused every frame.
    let xs = new Float32Array(0);
    let hs = new Float32Array(0);
    let lv = new Uint8Array(0);

    const draw = () => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const originX = width * 0.5;
      const originY = height / 3.2;
      const mx = mouse.x;
      const my = mouse.y;
      const near = mx > -500;

      // u = c − r runs across the screen, d = c + r down it; a voxel exists where they share parity.
      const uMin = Math.floor(-originX / tileW) - 1;
      const uMax = Math.ceil((width - originX) / tileW) + 1;
      const dMin = Math.floor((-tileH - 15 - originY) / tileH);
      const dMax = Math.ceil((height + maxHeight + LIFT + tileH - originY) / tileH);

      for (let d = dMin; d <= dMax; d++) {
        const isoY = originY + d * tileH;
        let n = 0;
        let used = 0;
        for (let u = uMin + ((((uMin - d) % 2) + 2) % 2); u <= uMax; u += 2) {
          const c = (d + u) / 2;
          const r = (d - u) / 2;
          const isoX = originX + u * tileW;
          let h =
            (Math.sin(time * 2 + c * 0.25 + r * 0.25) + Math.cos(time * 1.5 + c * 0.15 - r * 0.3) + 2) *
            0.25 *
            maxHeight;
          if (near) {
            const dx = isoX - mx;
            const dy = isoY - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < RADIUS * RADIUS) {
              const k = 1 - Math.sqrt(distSq) / RADIUS;
              h += k * k * LIFT;
            }
          }
          if (isoY - h - tileH > height) continue;
          const light = Math.min(1, Math.max(0.1, h * invTop));
          const level = Math.min(LEVELS - 1, (light * LEVELS) | 0);
          xs[n] = isoX;
          hs[n] = h;
          lv[n] = level;
          used |= 1 << level;
          n++;
        }
        if (!n) continue;

        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = xs[i]!;
          const py = isoY - hs[i]!;
          const drop = hs[i]! + 15;
          ctx.moveTo(x - tileW, py);
          ctx.lineTo(x, py + tileH);
          ctx.lineTo(x, py + tileH + drop);
          ctx.lineTo(x - tileW, py + drop);
          ctx.closePath();
        }
        ctx.fillStyle = leftFace;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = xs[i]!;
          const py = isoY - hs[i]!;
          const drop = hs[i]! + 15;
          ctx.moveTo(x, py + tileH);
          ctx.lineTo(x + tileW, py);
          ctx.lineTo(x + tileW, py + drop);
          ctx.lineTo(x, py + tileH + drop);
          ctx.closePath();
        }
        ctx.fillStyle = rightFace;
        ctx.fill();

        for (let level = 0; level < LEVELS; level++) {
          if (!(used & (1 << level))) continue;
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            if (lv[i] !== level) continue;
            const x = xs[i]!;
            const py = isoY - hs[i]!;
            ctx.moveTo(x, py - tileH);
            ctx.lineTo(x + tileW, py);
            ctx.lineTo(x, py + tileH);
            ctx.lineTo(x - tileW, py);
            ctx.closePath();
          }
          ctx.fillStyle = topShades[level]!;
          ctx.fill();
        }

        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = xs[i]!;
          const py = isoY - hs[i]!;
          ctx.moveTo(x, py - tileH);
          ctx.lineTo(x + tileW, py);
          ctx.lineTo(x, py + tileH);
          ctx.lineTo(x - tileW, py);
          ctx.closePath();
        }
        ctx.stroke();
      }
    };

    let last = 0;
    const loop = (now: number) => {
      frame = 0;
      if (!visible) return;
      const dt = now - last;
      if (dt >= 1000 / fps - 2) {
        // Time-based, so the waves keep their pace at any frame rate.
        time += speed * Math.min(dt, 100) * 0.06;
        last = now;
        mouse.x += (mouse.targetX - mouse.x) * 0.32;
        mouse.y += (mouse.targetY - mouse.y) * 0.32;
        draw();
      }
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (still || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 0.6;
      const perRow = Math.ceil(width / tileW) + 4;
      if (xs.length < perRow) {
        xs = new Float32Array(perRow);
        hs = new Float32Array(perRow);
        lv = new Uint8Array(perRow);
      }
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
