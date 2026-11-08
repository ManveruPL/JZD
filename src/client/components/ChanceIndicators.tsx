import React from 'react';

interface ChanceIndicatorsProps {
  chances: number;
  maxChances?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ChanceIndicators: React.FC<ChanceIndicatorsProps> = ({
  chances,
  maxChances = 3,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center space-x-1.5" title={`${chances} / ${maxChances} szanse`}>
      {Array.from({ length: maxChances }).map((_, index) => {
        const isActive = index < chances;
        const isLastChance = chances === 1 && isActive;

        return (
          <div
            key={index}
            className={`rounded-full transition-all duration-300 ${sizeClasses[size]} ${
              isActive
                ? isLastChance
                  ? 'bg-status-warning glow-amber ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-status-success glow-emerald ring-1 ring-emerald-400/50'
                : 'bg-zinc-800 border border-zinc-700/60 opacity-40'
            }`}
          />
        );
      })}
    </div>
  );
};
