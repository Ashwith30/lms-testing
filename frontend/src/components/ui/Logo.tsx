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
  const textTheme = variant === 'light' ? 'text-white/90' : 'text-[#1a1d23]';

  const sizeClasses = {
    sm: {
      container: 'gap-1.5',
      image: 'h-7 w-auto',
      text: 'text-[13px]',
    },
    md: {
      container: 'gap-2',
      image: 'h-9 w-auto',
      text: 'text-[14px] tracking-[0.04em]',
    },
    lg: {
      container: 'gap-2.5',
      image: 'h-11 w-auto',
      text: 'text-[16px] tracking-[0.04em]',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      <img src={pLogo} alt="Phonetic Logo" className={`object-contain ${currentSize.image}`} />
      <span className={`font-semibold ${textTheme} ${currentSize.text}`}>
        PHONETIC
      </span>
    </div>
  );
};
