'use client';

import React, { useEffect, useRef } from 'react';

interface PulsarWaveHeroProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PulsarWaveHero({
  title = "ChatRAG",
  subtitle = "Enterprise Knowledge Platform // Sub-50ms HNSW Retrieval",
  className = ""
}: PulsarWaveHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    let cursorDistort = 0.5;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursorDistort = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const linesCount = 18;
    let t = 0;
    let animId: number;

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 1;
      if (!prefersReduced) t += 0.02;

      for (let i = 0; i < linesCount; i++) {
        const yBase = (height / (linesCount + 1)) * (i + 1);
        ctx.beginPath();
        ctx.strokeStyle = i === 9 ? '#38bdf8' : 'rgba(255, 255, 255, 0.35)';

        for (let x = 0; x < width; x += 3) {
          const normX = x / width;
          const centerDist = Math.abs(normX - cursorDistort);
          const envelope = Math.max(0, 1 - centerDist * 3.2);
          const wave = Math.sin(x * 0.03 + t + i * 0.4) * Math.cos(x * 0.015 - t);
          const yOffset = wave * envelope * 22;

          if (x === 0) ctx.moveTo(x, yBase - yOffset);
          else ctx.lineTo(x, yBase - yOffset);
        }
        ctx.stroke();
      }

      if (!prefersReduced) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) canvas.removeEventListener('mousemove', handleMouseMove);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={`w-full max-w-3xl mx-auto flex flex-col items-center select-none ${className}`}>
      {/* Waveform Canvas */}
      <div className="w-full h-24 mb-5 rounded border border-[#1a1c24] bg-black overflow-hidden relative shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
        <div className="absolute top-2 left-3 flex items-center gap-2 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#94a3b8]">PGVECTOR // HNSW READY</span>
        </div>
      </div>

      {/* Hero Typography */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-[1px] bg-[#38bdf8]"></span>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">{title}</h1>
        </div>
        <p className="text-xs text-[#94a3b8] font-mono tracking-wide max-w-[55ch] text-balance mx-auto">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
