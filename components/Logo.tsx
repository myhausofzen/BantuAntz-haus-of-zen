import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  imgClassName?: string;
  variant?: 'light' | 'dark' | 'auto';
  showText?: boolean;
}

// Primary referenced asset and remote media fallback
const LOCAL_LOGO = '/logo_transparency.png';
export const REMOTE_BRAND_LOGO = 'https://items-images-production.s3.us-west-2.amazonaws.com/files/0eb2eb56c73174e1ca9abff8890c49c60ac3fd1f/original.png';

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  imgClassName = "",
  variant = 'auto'
}) => {
  const [imgSrc, setImgSrc] = useState<string>(LOCAL_LOGO);
  const [failedOnce, setFailedOnce] = useState<boolean>(false);

  const handleError = () => {
    if (!failedOnce) {
      setFailedOnce(true);
      setImgSrc(REMOTE_BRAND_LOGO);
    }
  };

  // Detect dark context for enhanced contrast filter
  const isDark = variant === 'dark' || (variant === 'auto' && (
    className.includes('text-stone-50') || 
    className.includes('text-white') || 
    className.includes('text-stone-200')
  ));

  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={imgSrc}
        alt="Haus of Zen"
        onError={handleError}
        className={`h-10 sm:h-12 md:h-14 w-auto max-w-[200px] object-contain transition-all duration-300 ${
          isDark 
            ? 'filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.45)] brightness-110' 
            : 'filter drop-shadow-sm'
        } ${imgClassName}`}
      />
    </div>
  );
};