import React, { useState, useEffect } from 'react';
import { Shield, Eye } from 'lucide-react';

interface CompanyLogoProps {
  src?: string | null;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  src,
  alt = "Intelligent Monitoring System Logo",
  className = "w-12 h-12 rounded-xl object-contain shadow-md bg-white border border-gray-200/60 p-0.5",
  style
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error whenever src property changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Sanitize src to ignore known broken static asset paths
  const cleanSrc = src && 
    src !== '/src/assets/logo.png' && 
    !src.includes('/src/assets') && 
    !src.includes('app_icon') &&
    src.trim() !== '' 
      ? src 
      : '/logo.png';

  if (!hasError && cleanSrc) {
    return (
      <img
        src={cleanSrc}
        alt={alt}
        className={className}
        style={style}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }

  // High quality SVG Brand emblem fallback if image fails to load or path is invalid
  return (
    <div 
      className={`${className.replace(/object-contain|object-cover/, '')} flex items-center justify-center bg-gradient-to-br from-indigo-700 via-blue-600 to-indigo-900 text-white shadow-md relative overflow-hidden group border border-indigo-400/30`}
      style={style}
      title={alt}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-400/20 via-transparent to-transparent animate-pulse" />
      <div className="relative flex items-center justify-center w-full h-full p-1">
        <Shield className="w-4/5 h-4/5 text-white drop-shadow-md" />
        <Eye className="w-2/5 h-2/5 text-cyan-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm" />
      </div>
    </div>
  );
};

export default CompanyLogo;
