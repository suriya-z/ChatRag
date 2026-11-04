'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface PulsarWaveHeroProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PulsarWaveHero({
  title = "Where should we begin?",
  subtitle = "Autonomous research, document intelligence, and real-time synthesis.",
  className = ""
}: PulsarWaveHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    let height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let displayWidth = canvas.offsetWidth;
    let displayHeight = canvas.offsetHeight;
    let targetDistort = 0.5;
    let currentDistort = 0.5;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      displayWidth = canvas.offsetWidth;
      displayHeight = canvas.offsetHeight;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetDistort = Math.max(0.15, Math.min(0.85, (e.clientX - rect.left) / rect.width));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const linesCount = 14;
    let t = 0;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      
      // Smooth interpolation for mouse interaction
      currentDistort += (targetDistort - currentDistort) * 0.05;
      
      if (!prefersReduced) t += 0.015;

      for (let i = 0; i < linesCount; i++) {
        const progress = i / (linesCount - 1);
        const yBase = (displayHeight / (linesCount + 1)) * (i + 1);
        
        ctx.beginPath();
        // Delicate gradient opacity for Hermes elegance
        const isCenter = Math.abs(i - 6) <= 2;
        const alpha = isCenter ? 0.45 : 0.15 + (1 - Math.abs(progress - 0.5) * 2) * 0.2;
        ctx.strokeStyle = isCenter ? `rgba(56, 189, 248, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = isCenter ? 1.25 : 1;

        for (let x = 0; x <= displayWidth; x += 4) {
          const normX = x / displayWidth;
          const dist = Math.abs(normX - currentDistort);
          const envelope = Math.max(0, 1 - dist * 2.8);
          const wave = Math.sin(x * 0.02 + t + i * 0.35) * Math.cos(x * 0.012 - t * 0.8);
          const yOffset = wave * envelope * 24;

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
      window.removeEventListener('mousemove', handleMouseMove);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={`w-full max-w-2xl mx-auto flex flex-col items-center select-none ${className}`}>
      {/* Hermes Status Badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        <span className="text-xs text-zinc-300 font-medium">Hermes Ready</span>
        <span className="text-zinc-600">•</span>
        <span className="text-[11px] text-zinc-400">Knowledge Engine</span>
      </motion.div>

      {/* Hero Typography */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-2.5 font-sans">
          {title}
        </h1>
        <p className="text-sm text-zinc-400 max-w-[440px] text-balance mx-auto leading-relaxed">
          {subtitle}
        </p>
      </motion.div>

      {/* Fluid Ambient Waveform Canvas */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-28 relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
      </motion.div>
    </div>
  );
}
