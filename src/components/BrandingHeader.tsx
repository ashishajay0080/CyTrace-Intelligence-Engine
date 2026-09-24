import React, { useState, useEffect } from 'react';
import { Shield, Clock, HardDrive, UserCheck, AlertOctagon, Contrast, RefreshCw } from 'lucide-react';

interface BrandingHeaderProps {
  logCount: number;
  isInvestigationMode: boolean;
  onToggleInvestigationMode: () => void;
  lastSyncTime: string;
  isSyncing: boolean;
  onReconnect: () => void;
}

export default function BrandingHeader({ 
  logCount, 
  isInvestigationMode, 
  onToggleInvestigationMode,
  lastSyncTime,
  isSyncing,
  onReconnect
}: BrandingHeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIST = (date: Date) => {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }) + ' IST';
  };

  const getDayLabel = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 p-4 md:px-6 relative overflow-hidden" id="branding-header">
      {/* Decorative tactical scanner beam effect */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-pulse" />
      <div className="absolute top-0 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        
        {/* Unit Identity Branding */}
        <div className="flex items-center gap-4">
          {/* Jharkhand/Deoghar Police Custom Stylized Emblem */}
          <div className="relative flex items-center justify-center w-16 h-16 bg-slate-900/90 border border-slate-705 rounded-xl shadow-xl hover:border-emerald-500/80 transition-all duration-300">
            {/* Custom High-Fidelity SVG Emblem representation of Jharkhand Police crest */}
            <svg viewBox="0 0 120 120" className="w-14 h-14 select-none">
              {/* Backing clean container */}
              <circle cx="60" cy="60" r="54" fill="#020617" fillOpacity="0.6" />

              {/* 1. TOP SLOGAN: "सेवा ही लक्ष्य" */}
              <text 
                x="60" 
                y="15" 
                textAnchor="middle" 
                fill="#3b82f6" 
                fontSize="7" 
                fontWeight="900" 
                fontFamily="system-ui, sans-serif"
                letterSpacing="0.2"
              >
                सेवा ही लक्ष्य
              </text>

              {/* 2. RED BACKGROUND CANOPY (ARCH SHAPE) */}
              <path 
                d="M 40 46 C 40 28, 80 28, 80 46 L 80 18 H 40 Z" 
                fill="#ef4444" 
              />
              
              {/* WHITE BOW & ARROW INSIDE REG CANOPY */}
              <path 
                d="M 43 38 Q 60 25 77 38" 
                stroke="#ffffff" 
                strokeWidth="1.5" 
                fill="none" 
              />
              <line 
                x1="60" 
                y1="38" 
                x2="60" 
                y2="19" 
                stroke="#ffffff" 
                strokeWidth="1.5" 
              />
              <polygon 
                points="60,19 57,25 63,25" 
                fill="#ffffff" 
              />

              {/* 3. THREE ARROWHEADS/FLOWERS SPLIT (BLUE/PURPLE) */}
              {/* Central vertical arrows and flower styling */}
              <g stroke="#3b82f6" strokeWidth="1" fill="none">
                <line x1="53" y1="48" x2="53" y2="43" />
                <line x1="60" y1="48" x2="60" y2="43" />
                <line x1="67" y1="48" x2="67" y2="43" />
              </g>
              <g fill="#1e3a8a">
                <circle cx="53" cy="43" r="1.5" />
                <circle cx="60" cy="43" r="1.5" />
                <circle cx="67" cy="43" r="1.5" />
                <polygon points="53,40 51,43 55,43" />
                <polygon points="60,40 58,43 62,43" />
                <polygon points="67,40 65,43 69,43" />
              </g>

              {/* 4. BLUE SHIELD WITH YELLOW MOUNTAINS & GREEN TREE */}
              <path 
                d="M 46 51 H 74 L 70 82 C 70 88, 50 88, 50 82 Z" 
                fill="#1e3a8a" 
                stroke="#ffffff" 
                strokeWidth="1.2" 
                strokeLinejoin="round"
              />
              {/* Yellow Mountains inside Shield */}
              <path 
                d="M 47 75 L 53 66 L 58 76 L 65 62 L 73 75 Q 60 84 47 75 Z" 
                fill="#eab308" 
              />
              {/* Green Tree standing in the center */}
              <rect x="59.2" y="65" width="1.6" height="12" fill="#854d0e" />
              <path d="M 60 58 L 56 65 L 64 65 Z" fill="#10b981" />
              <path d="M 60 62 L 57 68 L 63 68 Z" fill="#047857" />

              {/* 5. GOLDEN LAUREL WREATH (FLANKING SIDES) */}
              {/* Left Branch */}
              <path 
                d="M 36 94 C 20 86, 12 55, 26 26" 
                stroke="#eab308" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
                fill="none" 
              />
              {/* Left Leaves representing golden wreath folds */}
              <g fill="#eab308">
                <circle cx="28" cy="85" r="3" />
                <circle cx="23" cy="74" r="3" />
                <circle cx="21" cy="62" r="3" />
                <circle cx="21" cy="50" r="3" />
                <circle cx="23" cy="38" r="3" />
                <circle cx="27" cy="28" r="3" />
              </g>

              {/* Right Branch */}
              <path 
                d="M 84 94 C 100 86, 108 55, 94 26" 
                stroke="#eab308" 
                strokeWidth="1.8" 
                strokeLinecap="round" 
                fill="none" 
              />
              {/* Right Leaves */}
              <g fill="#eab308">
                <circle cx="92" cy="85" r="3" />
                <circle cx="97" cy="74" r="3" />
                <circle cx="99" cy="62" r="3" />
                <circle cx="99" cy="50" r="3" />
                <circle cx="97" cy="38" r="3" />
                <circle cx="93" cy="28" r="3" />
              </g>

              {/* 6. RED BOTTOM RIBBON/BANNER FOR "झारखंड पुलिस" */}
              <path 
                d="M 12 95 Q 60 115 108 95 L 105 103 Q 60 123 15 103 Z" 
                fill="#ef4444" 
                stroke="#eab308" 
                strokeWidth="0.8" 
              />
              {/* Ribbon Elegant Swallow Tail Left/Right Outer folds */}
              <path d="M 12 95 L 5 88 L 15 103 H 12" fill="#dc2626" />
              <path d="M 108 95 L 115 88 L 105 103 H 108" fill="#dc2626" />
              
              {/* Banner Hindi Text: "झारखंड पुलिस" */}
              <text 
                x="60" 
                y="110.5" 
                textAnchor="middle" 
                fill="#ffffff" 
                fontSize="6" 
                fontWeight="900" 
                fontFamily="system-ui, sans-serif"
                letterSpacing="0.1"
              >
                झारखंड पुलिस
              </text>
            </svg>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full w-3.5 h-3.5 border-2 border-slate-950 flex items-center justify-center animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-900/50 px-2 py-0.5 rounded uppercase">
                DEOGHAR CYBER CELL
              </span>
              <span className="inline-flex items-center text-[10px] font-mono font-medium text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                SECURE ENVIRONMENT
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans mt-0.5">
              JHARKHAND POLICE <span className="text-slate-400 font-light">OSINT & CDR FORENSICS</span>
            </h1>
          </div>
        </div>

        {/* Operating Meta-Widgets & Time Locks */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 font-mono">
          
          {/* System Sync & Manual Reconnect */}
          <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-left">
            <div className="text-left font-mono">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'} inline-block`} />
                SYSTEM SYNC
              </div>
              <div className="text-xs font-semibold text-emerald-400 tracking-tight">
                {isSyncing ? 'RE-POLLING...' : lastSyncTime}
              </div>
            </div>
            <button
              id="system-sync-reconnect"
              onClick={onReconnect}
              disabled={isSyncing}
              className={`p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-800 hover:bg-emerald-900/20 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center ${
                isSyncing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Force manual re-polling query for newly staged forensic CDR dumps or OSINT logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-right hidden sm:block">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block pointer-events-none" />
              Device Forensic Clock
            </div>
            <div className="text-sm font-semibold text-indigo-300 flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              {formatIST(time)}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
              CRIMINAL INVESTIGATION BLOCK
            </div>
            <div className="text-xs text-slate-300 font-medium">
              {getDayLabel(time)}
            </div>
          </div>

          {/* High-Contrast Toggle Widget */}
          <button
            onClick={onToggleInvestigationMode}
            id="investigation-mode-toggle"
            className={`px-3 py-1.5 rounded-lg font-mono text-center flex items-center gap-2 border.5 transition-all duration-350 cursor-pointer ${
              isInvestigationMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Toggle high-contrast paper-white inversion matrix for outdoor sunlight operations"
          >
            <Contrast className={`w-4 h-4 ${isInvestigationMode ? 'text-slate-950 animate-pulse' : 'text-slate-500'}`} />
            <div className="text-left">
              <div className="text-[8px] opacity-70 uppercase tracking-widest leading-none">FIELD MODE</div>
              <div className="text-[10px] font-bold tracking-tight leading-tight">
                {isInvestigationMode ? 'HIGH-CONTRAST' : 'MIDNIGHT'}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
            <div className="px-2 py-1 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-medium">AUDITED OPERATIONS</div>
              <div className="text-sm font-bold text-emerald-400">{logCount}</div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
