'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface PulsarWaveHeroProps {
  title?: string;
  titleStyle?: React.CSSProperties;
  subtitle?: string;
  className?: string;
}

export function PulsarWaveHero({
  title = "Where should we begin?",
  titleStyle,
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
    
    // 3D Gravitational tilt physics
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

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
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltX = Math.max(-1, Math.min(1, normX));
      targetTiltY = Math.max(-1, Math.min(1, normY));
    };

    const handleMouseLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      
      // Smooth damped spring inertia
      currentTiltX += (targetTiltX - currentTiltX) * 0.06;
      currentTiltY += (targetTiltY - currentTiltY) * 0.06;
      
      if (!prefersReduced) t += 0.012;

      const centerX = displayWidth / 2 + currentTiltX * 40;
      const centerY = displayHeight / 2 + currentTiltY * 20;

      // Draw mathematical orbital lattice
      const rings = 7;
      for (let r = 0; r < rings; r++) {
        const radiusX = (displayWidth * 0.38) * ((r + 1) / rings);
        const radiusY = (displayHeight * 0.34) * ((r + 1) / rings);
        const rotation = (r % 2 === 0 ? 1 : -1) * (t * 0.25 + r * 0.4);
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation * 0.2 + currentTiltX * 0.15);

        ctx.beginPath();
        ctx.ellipse(0, 0, radiusX, radiusY * (0.45 + r * 0.08), 0, 0, Math.PI * 2);
        
        const isCore = r === 2 || r === 3;
        const alpha = isCore ? 0.35 : 0.07 + (r / rings) * 0.12;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = isCore ? 1.25 : 0.75;
        ctx.stroke();

        // High-density nodal markers along the orbits
        if (!prefersReduced && r >= 2) {
          const nodeAngle = t * (0.8 + r * 0.2) + (r * Math.PI) / 3;
          const nodeX = Math.cos(nodeAngle) * radiusX;
          const nodeY = Math.sin(nodeAngle) * (radiusY * (0.45 + r * 0.08));
          
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, isCore ? 1.75 : 1.2, 0, Math.PI * 2);
          ctx.fillStyle = isCore ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
          ctx.fill();

          // Delicate light dispersion filament
          if (isCore) {
            ctx.beginPath();
            ctx.arc(nodeX, nodeY, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // Horizontal acoustic horizon line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(displayWidth, centerY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!prefersReduced) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={`w-full max-w-3xl mx-auto flex flex-col items-center select-none pt-4 pb-2 ${className}`}>
      {/* Editorial Monumental Typography */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-6 px-4"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-[-0.035em] text-white mb-3 font-sans antialiased text-balance" style={titleStyle}>
          {title}
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-lg text-balance mx-auto leading-relaxed font-normal">
          {subtitle}
        </p>
      </motion.div>

      {/* Kinetic Gravitational Lattice Core */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-36 relative overflow-hidden my-1"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, black 30%, transparent 100%)'
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
      </motion.div>
    </div>
  );
}
