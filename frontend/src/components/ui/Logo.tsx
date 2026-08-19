import React from 'react';
import pLogo from '../../assets/p-logo-transparent-bg.png';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
}) => {
  const textTheme = variant === 'light' ? 'text-white' : 'text-slate-800';

  // Centrally control the relative proportions of P logo to text
  const sizeClasses = {
    sm: {
      container: 'gap-1.5',
      image: 'h-7 w-auto',
      text: 'text-sm',
    },
    md: {
      container: 'gap-2.5',
      image: 'h-10 w-auto',
      text: 'text-base tracking-normal',
    },
    lg: {
      container: 'gap-3',
      image: 'h-12 w-auto',
      text: 'text-lg tracking-normal',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      <img src={pLogo} alt="Phonetic Logo" className={`object-contain ${currentSize.image}`} />
      <span className={`font-bold ${textTheme} ${currentSize.text}`}>
        PHONETIC
      </span>
    </div>
  );
};

