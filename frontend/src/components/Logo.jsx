import { Link } from 'react-router-dom';

export default function Logo({ 
  size = 'md', 
  showText = true, 
  subtitle = null, 
  to = '/', 
  className = '',
  animated = false 
}) {
  // Dimension mapping
  const sizeMap = {
    xs: { box: 'h-7 w-7', icon: 'h-4 w-4', text: 'text-base', sub: 'text-[9px]' },
    sm: { box: 'h-9 w-9', icon: 'h-5 w-5', text: 'text-lg', sub: 'text-[10px]' },
    md: { box: 'h-10 w-10', icon: 'h-6 w-6', text: 'text-xl', sub: 'text-[11px]' },
    lg: { box: 'h-12 w-12', icon: 'h-7 w-7', text: 'text-2xl', sub: 'text-xs' },
    xl: { box: 'h-16 w-16', icon: 'h-9 w-9', text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Tech Logo Icon Emblem */}
      <div className={`relative ${currentSize.box} rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-emerald-950 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/40 group overflow-hidden`}>
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-cyan-500/30 opacity-70 blur-sm group-hover:opacity-100 transition-opacity" />
        
        {/* Render Vector Graphic */}
        <img 
          src="/app_logo.png" 
          alt="Geo-Attend Logo" 
          className={`relative z-10 w-full h-full object-contain rounded-xl ${animated ? 'animate-pulse' : ''}`}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 ${currentSize.text}`}>
              Geo-Attend
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          {subtitle && (
            <span className={`text-gray-400 font-medium tracking-wide mt-0.5 ${currentSize.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-block transition-transform active:scale-95">
        {content}
      </Link>
    );
  }

  return content;
}

