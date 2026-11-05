'use client';

import React, { useState } from 'react';
import { LazyMotion, m } from 'framer-motion';
import { cn } from '@/lib/utils';

// Dynamically import features to reduce initial bundle size
const loadFeatures = () => import('@/lib/framer-motion/features').then(res => res.default);

interface CollapsibleButtonProps {
  icon: React.ReactNode;
  text: string;
  onClick: (e: React.MouseEvent) => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  alwaysShowText?: boolean;
  /** Optional tooltip text (currently unused by this component, kept for compatibility) */
  tooltipText?: string;
}

export function CollapsibleButton({
  icon,
  text,
  onClick,
  isActive = false,
  disabled = false,
  className,
  alwaysShowText = false,
}: CollapsibleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showText = alwaysShowText || isHovered;

  return (
    <LazyMotion features={loadFeatures} strict>
      <m.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative inline-flex h-9 items-center justify-center rounded-xl transition-colors group border-[0.5px] mr-0.25",
        isActive ? "bg-zinc-800/90 border-white/[0.22] text-white shadow-[0_0_16px_rgba(255,255,255,0.06)] hover:bg-zinc-700/90" : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.18]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
        {/* Icon container - always visible */}
        <m.div
          className="flex items-center justify-center"
          initial={{ paddingLeft: "0.5rem", paddingRight: "0.5rem" }}
          animate={{
            paddingLeft: showText ? "0.5rem" : "0.5rem",
            paddingRight: showText ? "0.25rem" : "0.5rem"
          }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <span className={cn(
            "flex items-center justify-center",
            isActive ? "text-white" : "text-zinc-400 group-hover:text-white"
          )}>
            {icon}
          </span>
        </m.div>

        {/* Text container - visible on hover or when alwaysShowText is true */}
        <m.div
          className="overflow-hidden"
          initial={{ width: alwaysShowText ? "auto" : 0, opacity: alwaysShowText ? 1 : 0 }}
          animate={{
            width: showText ? "auto" : 0,
            opacity: showText ? 1 : 0
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <span className={cn(
            "text-sm font-medium whitespace-nowrap pr-3",
            isActive ? "text-white font-medium" : "text-zinc-300 group-hover:text-white"
          )}>
            {text}
          </span>
        </m.div>
      </m.button>
    </LazyMotion>
  );
} 