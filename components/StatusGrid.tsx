
import React from 'react';
import { ServiceStatus } from '../types';
import { ChevronRight } from 'lucide-react';

interface Props {
  data: { status: ServiceStatus; label: string; subLabel?: string }[];
  title: string;
  variant?: 'default' | 'small';
}

const StatusGrid: React.FC<Props> = ({ data, title, variant = 'default' }) => {
  const isSmall = variant === 'small';

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className={`font-black text-gray-500 uppercase tracking-widest ${isSmall ? 'text-[8px]' : 'text-[10px]'} italic`}>
          {title}
        </h3>
        <div className={`flex items-center gap-4 font-bold text-gray-600 uppercase ${isSmall ? 'text-[7px]' : 'text-[9px]'}`}>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> OK</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> SLOW</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> DOWN</span>
        </div>
      </div>
      
      <div className={`grid w-full ${
        isSmall 
          ? 'grid-cols-15 sm:grid-cols-30 gap-1 sm:gap-1.5' 
          : 'grid-cols-24 gap-1 sm:gap-2'
      }`}>
        {data.map((item, idx) => (
          <div
            key={idx}
            className={`aspect-square rounded-full transition-all duration-300 relative group cursor-crosshair
              ${(item.status === ServiceStatus.OPERATIONAL) ? 'bg-emerald-500 border-emerald-500/20 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : ''}
              ${item.status === ServiceStatus.SLOW ? 'bg-amber-400 border-amber-400/20 hover:bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.2)]' : ''}
              ${item.status === ServiceStatus.DOWN ? 'bg-rose-500 border-rose-500/20 hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.2)]' : ''}
              ${item.status === ServiceStatus.UNKNOWN ? 'bg-[#222] border-transparent scale-75 opacity-40' : ''}
              ${!isSmall ? 'border-[1px] scale-100 hover:scale-125 hover:z-10' : 'border-[0.5px] scale-100 hover:scale-150 hover:z-10'}
            `}
          >
            {/* Tooltip */}
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-black text-[9px] text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[100] shadow-2xl border border-white/10 scale-90 group-hover:scale-100
              ${idx < 5 ? 'left-0 translate-x-0' : ''}
              ${idx > data.length - 5 ? 'left-auto right-0 translate-x-0' : ''}
            `}>
              <p className="font-black mb-0.5 text-gray-400 uppercase tracking-tighter">{item.label}</p>
              <div className="flex items-center justify-between gap-3">
                <p className={`font-black uppercase ${item.status === ServiceStatus.OPERATIONAL ? 'text-emerald-500' : item.status === ServiceStatus.SLOW ? 'text-amber-400' : item.status === ServiceStatus.DOWN ? 'text-rose-500' : 'text-gray-500'}`}>
                  {item.status === ServiceStatus.OPERATIONAL ? 'NOMINAL' : item.status.toUpperCase()}
                </p>
                <p className="text-gray-500 font-bold">{item.subLabel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isSmall && (
        <div className="flex justify-between mt-6 text-[8px] sm:text-[9px] text-gray-700 font-black mono uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden truncate">
            <span>00:00</span>
            <div className="hidden sm:block w-4 h-px bg-gray-800"></div>
            <span className="truncate">RECORDED TIMELINE</span>
            <div className="hidden sm:block w-4 h-px bg-gray-800"></div>
            <span>23:59</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline">DATA PERSISTED</span>
            <ChevronRight className="w-2.5 h-2.5" />
          </div>
        </div>
      )}

      {isSmall && (
        <div className="flex justify-between mt-4 text-[7px] text-gray-700 font-black mono uppercase tracking-[0.2em]">
          <span>RECORDED</span>
          <span>D-{data.length} SPAN</span>
          <span>RECENT</span>
        </div>
      )}
    </div>
  );
};

export default StatusGrid;
