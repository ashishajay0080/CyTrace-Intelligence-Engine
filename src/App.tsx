import React, { useState } from 'react';
import { ShieldAlert, BookOpen, Compass, Globe, FileSpreadsheet, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import BrandingHeader from './components/BrandingHeader';
import EmergencyHelplineWidget from './components/EmergencyHelplineWidget';
import CDRAnalysis from './components/CDRAnalysis';
import GeospatialMapping from './components/GeospatialMapping';
import OSINTProfiler from './components/OSINTProfiler';
import EvidenceAuditConsole from './components/EvidenceAuditConsole';

import { CDRRecord, AuditLogEntry, CommonAssociate } from './types';

// Simple direct helper to hash characters for a realistic MD5/SHA representation
const generateHexSignature = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const positive = Math.abs(hash);
  return 'e912fd' + positive.toString(16).padStart(8, '0') + 'c40382';
};

let globalLogSeq = 0;

export default function App() {
  const [activeTab, setActiveTab] = useState<'CDR' | 'GEOSPATIAL' | 'OSINT'>('CDR');
  const [cdrRecords, setCdrRecords] = useState<CDRRecord[]>([]);
  const [analyticalLinks, setAnalyticalLinks] = useState<CommonAssociate[]>([]);
  const [isInvestigationMode, setIsInvestigationMode] = useState<boolean>(() => {
    return localStorage.getItem('investigation-mode') === 'true';
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-IN', { hour12: true, second: '2-digit' }) + ' IST';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Initialize some realistic compliance startup audits
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: "init",
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('en-IN'),
      action: "Tactical Terminal Booted Successfully",
      operator: "Deoghar Cyber Cell Admin",
      status: "SUCCESS",
      hash: "e912fd0192a2bfc40382",
      details: "Air-gapped local environment certified secure. Host port 3000 mapping complete."
    },
    {
      id: "tower-load",
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('en-IN'),
      action: "Base Transceiver Station Registry Seeded",
      operator: "Field-Officer-Deoghar",
      status: "SUCCESS",
      hash: "e912fd882fc0d1c40382",
      details: "Synchronized 9 main base stations covering Jasidih, Madhupur, and Rohini hotbed centers."
    }
  ]);

  const handleCdrDataExtracted = (records: CDRRecord[]) => {
    setCdrRecords(records);
  };

  // Add system-authenticated log item
  const handleAddAuditLog = (action: string, details: string, status: 'SUCCESS' | 'WARNING' | 'ALERT') => {
    const timeStr = new Date().toLocaleTimeString('en-IN');
    globalLogSeq += 1;
    const uniqueId = `log-${Date.now()}-${globalLogSeq}-${Math.floor(Math.random() * 1000)}`;
    const signature = generateHexSignature(action + details + timeStr + uniqueId);

    const newLog: AuditLogEntry = {
      id: uniqueId,
      timestamp: timeStr,
      action,
      operator: "Forensics-Agent-08",
      status,
      hash: signature,
      details
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleClearLogs = () => {
    setAuditLogs([]);
  };

  const handleToggleInvestigationMode = () => {
    setIsInvestigationMode(prev => {
      const newValue = !prev;
      localStorage.setItem('investigation-mode', String(newValue));
      handleAddAuditLog(
        newValue ? "Investigation Mode Enacted" : "Investigation Mode Deactivated",
        newValue 
          ? "Switched terminal to High-Contrast inversion matrix for outdoor sunlight operations"
          : "Switched terminal back to Cyber-Midnight dark mode for low-light forensics",
        newValue ? "WARNING" : "SUCCESS"
      );
      return newValue;
    });
  };

  const handleReconnect = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    handleAddAuditLog("Manual Database Re-Poll Started", "Scanning local storage systems, checking mounted thumbdrives and tower dump folders.", "WARNING");
    
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      const newSyncStr = now.toLocaleTimeString('en-IN', { hour12: true, second: '2-digit' }) + ' IST';
      setLastSyncTime(newSyncStr);
      handleAddAuditLog(
        "Forensic Database Polled",
        `Manual sync complete. Scanned directories found no new files. Existing logs, GPS nodes, and EXIF caches validated.`,
        "SUCCESS"
      );
    }, 1500);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased selection:bg-indigo-505 selection:text-white transition-all duration-300 ${isInvestigationMode ? 'investigation-mode' : ''}`} id="main-app">
      
      {/* 1. Branding Header */}
      <BrandingHeader 
        logCount={auditLogs.length} 
        isInvestigationMode={isInvestigationMode}
        onToggleInvestigationMode={handleToggleInvestigationMode}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onReconnect={handleReconnect}
      />

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Core Layout: Helplines Rail (Left) + Interactive Board (Center/Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Tactical Emergency & Digital Services Rail (4 Columns on Desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <EmergencyHelplineWidget onAddAuditLog={handleAddAuditLog} />
          </div>

          {/* Interactive Core Analytical Console (8 Columns on Desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
            {/* Interactive Tab Selectors */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex gap-1 shadow-md">
              <button
                onClick={() => {
                  setActiveTab('CDR');
                  handleAddAuditLog("Tab Transitioned", "Switched workspace focal point to Telecom CDR spreadsheet matching engine", "SUCCESS");
                }}
                className={`flex-1 py-3 px-3.5 rounded-lg font-mono text-xs font-bold leading-normal flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'CDR'
                    ? 'bg-gradient-to-r from-indigo-900 to-indigo-950 text-indigo-200 border border-indigo-700/80 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/70'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CDR & Tower Dump Parser
              </button>

              <button
                onClick={() => {
                  setActiveTab('GEOSPATIAL');
                  handleAddAuditLog("Tab Transitioned", "Switched workspace focal point to Geographic sequence track renderer", "SUCCESS");
                }}
                className={`flex-1 py-3 px-3.5 rounded-lg font-mono text-xs font-bold leading-normal flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'GEOSPATIAL'
                    ? 'bg-gradient-to-r from-indigo-900 to-indigo-950 text-indigo-200 border border-indigo-700/80 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/70'
                }`}
              >
                <Compass className="w-4 h-4" />
                Geospatial Cell-Map Tracker
              </button>

              <button
                onClick={() => {
                  setActiveTab('OSINT');
                  handleAddAuditLog("Tab Transitioned", "Switched workspace focal point to public OSINT profile indexer & EXIF forensics desk", "SUCCESS");
                }}
                className={`flex-1 py-3 px-3.5 rounded-lg font-mono text-xs font-bold leading-normal flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'OSINT'
                    ? 'bg-gradient-to-r from-indigo-900 to-indigo-950 text-indigo-200 border border-indigo-700/80 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/70'
                }`}
              >
                <Globe className="w-4 h-4" />
                OSINT Aggregator & EXIF
              </button>
            </div>

            {/* Active Workspace Viewport */}
            <div className="min-h-[450px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12, scale: 0.99, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, scale: 0.99, filter: "blur(2px)" }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full"
                >
                  {activeTab === 'CDR' && (
                    <CDRAnalysis 
                      onAddAuditLog={handleAddAuditLog} 
                      onCdrDataExtracted={handleCdrDataExtracted} 
                      onAnalyticalLinksExtracted={(links) => setAnalyticalLinks(links)}
                    />
                  )}
                  {activeTab === 'GEOSPATIAL' && (
                    <GeospatialMapping 
                      cdrRecords={cdrRecords}
                      onAddAuditLog={handleAddAuditLog} 
                    />
                  )}
                  {activeTab === 'OSINT' && (
                    <OSINTProfiler 
                      onAddAuditLog={handleAddAuditLog} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>

        {/* 2. evidentiary compliance audit stream logs */}
        <EvidenceAuditConsole 
          logs={auditLogs} 
          onClearLogs={handleClearLogs} 
          commonAssociates={analyticalLinks}
          cdrRecords={cdrRecords}
        />

      </main>
    </div>
  );
}
