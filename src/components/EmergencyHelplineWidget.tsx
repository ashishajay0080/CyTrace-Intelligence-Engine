import React, { useState } from 'react';
import { Phone, ExternalLink, ShieldAlert, FileText, Check, Copy, Printer, AlertTriangle } from 'lucide-react';

interface Helpline {
  name: string;
  number: string;
  category: string;
  iconColor: string;
}

interface EmergencyHelplineWidgetProps {
  onAddAuditLog: (action: string, details: string, status: 'SUCCESS' | 'WARNING' | 'ALERT') => void;
}

export default function EmergencyHelplineWidget({ onAddAuditLog }: EmergencyHelplineWidgetProps) {
  const [complaintForm, setComplaintForm] = useState({
    suspectName: '',
    suspectPhone: '',
    transactionId: '',
    bankAccount: '',
    complaintText: 'Unknown actors calling from Deoghar hotbeds pretending to be bank executives, extracted OTP under pressure.',
    reporterName: 'Officer-in-Charge, Deoghar Cyber Cell',
    sourcePlatform: 'WhatsApp / UPI Transfer',
    amountDefrauded: '45,000'
  });

  const [copied, setCopied] = useState(false);
  const [draftGenerated, setDraftGenerated] = useState(false);

  // Real-world Indian cyber-defense & emergency helplines
  const helplines: Helpline[] = [
    { name: "National Cyber Crime Helpline", number: "1930", category: "CYBER", iconColor: "text-rose-500 bg-rose-950/50 border-rose-900/60" },
    { name: "Emergency Integration Response (ERSS)", number: "112", category: "GENERAL", iconColor: "text-amber-500 bg-amber-950/50 border-amber-900/60" },
    { name: "Deoghar Police HQ Control Room", number: "06432222100", category: "LOCAL", iconColor: "text-indigo-400 bg-indigo-950/50 border-indigo-900/60" },
    { name: "Jharkhand State Cyber PS (Ranchi)", number: "06512782010", category: "CYBER", iconColor: "text-emerald-400 bg-emerald-950/50 border-emerald-900/60" },
    { name: "Women Helpline Cell", number: "1091", category: "GENERAL", iconColor: "text-pink-400 bg-pink-950/50 border-pink-900/60" },
    { name: "Child Support Services", number: "1098", category: "GENERAL", iconColor: "text-cyan-400 bg-cyan-950/50 border-cyan-900/60" },
  ];

  // Official Online Legal portals
  const portalLinks = [
    { name: "National Cyber Crime Complaint Portal", desc: "For direct online financial/identity reporting", url: "https://cybercrime.gov.in" },
    { name: "Jharkhand Police e-FIR System", desc: "Official digital FIR lodging platform for residents", url: "https://police.jharkhand.gov.in" },
    { name: "Zero FIR Filing Procedure Guide", desc: "File FIR at any police station regardless of jurisdiction", url: "https://cybercrime.gov.in/Webform/Filing_Guide.aspx" },
  ];

  const handleCopyComplaint = () => {
    const textToCopy = `
=============================================
JHARKHAND POLICE CYBER CELL OFFICIAL COMPLAINT DRAFT
=============================================
DATE OF RECORD: ${new Date().toLocaleDateString('en-IN')}
CYBER UNIT: Deoghar Strategic Crime Cell
COMPLAINT SUBMISSION TYPE: SWIFT CYBER RECOVERY DRAFT

1. SUSPECT METADATA:
   - Reported Suspect Phone: ${complaintForm.suspectPhone || 'UNDER_INVESTIGATION'}
   - Identified Alias/Name: ${complaintForm.suspectName || 'PENDING_OSINT'}
   - Operating Platform Involved: ${complaintForm.sourcePlatform}

2. FINANCIAL EXTRACTION DETAILS:
   - Approximate Defrauded Amount: INR ${complaintForm.amountDefrauded || 'N/A'}
   - Target Bank Account/UPI ID: ${complaintForm.bankAccount || 'N/A'}
   - Transaction ID Reference: ${complaintForm.transactionId || 'N/A'}

3. FACTUAL SUMMARY DESCRIPTION:
   ${complaintForm.complaintText}

4. OFFICIATING RECOVERY SUBMITTER:
   - Submitting Agent: ${complaintForm.reporterName}
   - Authentication Status: FORENSICALLY AUDITED

=============================================
CONFIDENAL LAW ENFORCEMENT RECORD FOR LEGAL COMPLIANCE
=============================================
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    onAddAuditLog("Swit Cyber Crime Complaint Generated & Copied", `Compiled draft for ${complaintForm.amountDefrauded} INR involving suspect phone ${complaintForm.suspectPhone}`, "SUCCESS");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
    onAddAuditLog("Cyber Complaint Sent to System Printer Stream", "Requested print preview layout for legal evidence package", "SUCCESS");
  };

  return (
    <div className="flex flex-col gap-6" id="emergency-helpline-widget">
      
      {/* Tap-to-Dial Emergency Panels */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
        <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-rose-500 animate-pulse" />
          Tactical Support Contacts (1-Tap Dial)
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {helplines.map((sub, i) => (
            <a 
              key={i}
              href={`tel:${sub.number}`}
              onClick={() => onAddAuditLog(`Direct Call Initiated`, `Operator clicked support number for ${sub.name} [${sub.number}]`, 'WARNING')}
              className="flex items-center justify-between p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg group transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${sub.iconColor} group-hover:scale-105 transition-transform`}>
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">{sub.number}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{sub.name}</div>
                </div>
              </div>
              <span className="text-[10px] bg-slate-800 font-mono text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200 px-2 py-0.5 rounded transition-all">
                DIAL
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Online Legal Procedure Portals */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          Online Legal & Zero FIR Access
        </h2>
        
        <div className="flex flex-col gap-3">
          {portalLinks.map((portal, i) => (
            <a
              key={i}
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onAddAuditLog("Portal Link Redirect Clicked", `Opened secure third-party URL: ${portal.url}`, "SUCCESS")}
              className="flex items-start justify-between p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-850 hover:border-slate-700/80 rounded-lg group transition-all duration-200"
            >
              <div className="flex-1 pr-2">
                <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 transition-colors flex items-center gap-1.5 leading-snug">
                  {portal.name}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                  {portal.desc}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 mt-0.5 flex-shrink-0 transition-colors" />
            </a>
          ))}
        </div>

        {/* Legal Action Zero FIR Quick Guide Card */}
        <div className="mt-4 p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-lg flex gap-3 text-left">
          <AlertTriangle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300">
              Zero FIR Command Protocol
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Section 173 CrPC allows filing any cyber FIR (especially Deoghar/Jamtara OTP fraud cases) at any station. It gets registered with serial <strong>No. 00</strong> and is securely transferred to Jharkhand Cyber headquarters immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Cyber Crime Reporting Tool Module */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all">
        <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-emerald-400" />
          Rapid Cyber Evidence Draft Tool
        </h2>
        <p className="text-[11px] text-slate-400 mb-4 font-sans leading-relaxed">
          Produce standardised evidence complaints to upload directly to the National Cyber Crime Portal or share with field teams.
        </p>

        <div className="space-y-3.5" id="complaint-rapid-builder">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Target Suspect Phone Number
            </label>
            <input 
              type="text" 
              className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded p-2 focus:outline-none focus:border-indigo-500 font-mono" 
              placeholder="+91-XXXXX-XXXXX"
              value={complaintForm.suspectPhone}
              onChange={(e) => setComplaintForm({...complaintForm, suspectPhone: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
                Suspect Display Name
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded p-2 focus:outline-none focus:border-indigo-500" 
                placeholder="UPI Account Node Name"
                value={complaintForm.suspectName}
                onChange={(e) => setComplaintForm({...complaintForm, suspectName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
                Amount Defrauded (INR)
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded p-2 focus:outline-none focus:border-indigo-500 font-mono" 
                placeholder="e.g. 50,000"
                value={complaintForm.amountDefrauded}
                onChange={(e) => setComplaintForm({...complaintForm, amountDefrauded: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
                Beneficiary Bank & AC
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded p-2 focus:outline-none focus:border-indigo-500" 
                placeholder="State Bank / Gramin Bank"
                value={complaintForm.bankAccount}
                onChange={(e) => setComplaintForm({...complaintForm, bankAccount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
                UTR / Transaction ID
              </label>
              <input 
                type="text" 
                className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded p-2 focus:outline-none focus:border-indigo-500 font-mono" 
                placeholder="UTR258814..."
                value={complaintForm.transactionId}
                onChange={(e) => setComplaintForm({...complaintForm, transactionId: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-bold">
              Incident Narrative / Statement
            </label>
            <textarea 
              className="w-full bg-slate-950 border border-slate-850 text-slate-300 text-xs rounded p-2 focus:outline-none focus:border-indigo-500 h-20 resize-none font-sans" 
              value={complaintForm.complaintText}
              onChange={(e) => setComplaintForm({...complaintForm, complaintText: e.target.value})}
            />
          </div>

          <div className="flex gap-2.5 pt-1.5">
            <button
              onClick={handleCopyComplaint}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-mono text-[11px] font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/30"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  COPIED DRAFT
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  COPY COMPLAINT
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] font-mono transition-transform duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              PRINT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
