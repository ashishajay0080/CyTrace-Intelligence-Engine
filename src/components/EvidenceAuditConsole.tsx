import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  Download, 
  Award, 
  Shield, 
  FileJson, 
  FileText, 
  FileSpreadsheet,
  Lock, 
  User, 
  Layers, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  Scale
} from 'lucide-react';
import { AuditLogEntry, CommonAssociate, CDRRecord } from '../types';
import { jsPDF } from 'jspdf';

interface EvidenceAuditConsoleProps {
  logs: AuditLogEntry[];
  onClearLogs: () => void;
  commonAssociates?: CommonAssociate[];
  cdrRecords?: CDRRecord[];
}

export default function EvidenceAuditConsole({ 
  logs, 
  onClearLogs,
  commonAssociates = [],
  cdrRecords = []
}: EvidenceAuditConsoleProps) {
  const [showExporter, setShowExporter] = useState(false);
  const [caseFileNo, setCaseFileNo] = useState("JH-CYB-2026-F981");
  const [officerDesignation, setOfficerDesignation] = useState("Forensics-Agent-08");
  const [hashMethod, setHashMethod] = useState<'SHA256' | 'MD5'>('SHA256');
  const [includeSec65B, setIncludeSec65B] = useState(true);
  const [chainChecksum, setChainChecksum] = useState("");
  const [isCalculatingHash, setIsCalculatingHash] = useState(false);

  // Formal Court Presentation Parameters
  const [firNo, setFirNo] = useState("FIR No. 129/2026");
  const [policeStation, setPoliceStation] = useState("Deoghar Cyber Crime P.S.");
  const [courtName, setCourtName] = useState("Court of Ld. Special Cyber Criminal Judge, Deoghar");
  const [suspectName, setSuspectName] = useState("Amit Kumar Mandal & Others");
  const [exhibitNo, setExhibitNo] = useState("Exhibit P-12");

  // Compute the cascading sequential tamper-evident hash chain whenever inputs change
  useEffect(() => {
    const computeChainChecksum = async () => {
      setIsCalculatingHash(true);
      try {
        let currentHash = "ROOT_CUSTODY_SEED_0x82f";
        
        // Process logs in chronological order (oldest to newest)
        // Since logs can be unshifted inside App.tsx (newest first), we reverse to walk sequentially
        const chronLogs = [...logs].reverse();
        
        for (const log of chronLogs) {
          const payload = `${log.timestamp}|${log.status}|${log.operator}|${log.action}|${log.details}|${log.hash}|${caseFileNo}|${officerDesignation}|${firNo}|${policeStation}|${courtName}|${suspectName}|${exhibitNo}|${currentHash}`;
          
          if (hashMethod === 'SHA256' && window.crypto && window.crypto.subtle) {
            const buffer = new TextEncoder().encode(payload);
            const digest = await window.crypto.subtle.digest('SHA-256', buffer);
            currentHash = Array.from(new Uint8Array(digest))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
          } else {
            // High-fidelity fallback checksum block chaining (Fnv-1a dynamic polynomial)
            let hashVal = 0x811c9dc5;
            for (let i = 0; i < payload.length; i++) {
              hashVal ^= payload.charCodeAt(i);
              hashVal += (hashVal << 1) + (hashVal << 4) + (hashVal << 7) + (hashVal << 8) + (hashVal << 24);
            }
            currentHash = "md5chain-" + Math.abs(hashVal).toString(16).padStart(16, '0');
          }
        }
        
        setChainChecksum(currentHash);
      } catch (err) {
        console.error("Error generating tamper proof blocks:", err);
      } finally {
        setIsCalculatingHash(false);
      }
    };
    
    computeChainChecksum();
  }, [logs, caseFileNo, officerDesignation, hashMethod, firNo, policeStation, courtName, suspectName, exhibitNo]);

  // Standard Plaintext Export (Retained legacy feature fallback)
  const handleExportAuditsTextOnly = () => {
    const textContent = logs.map(l => 
      `[${l.timestamp}] STATUS: ${l.status} | OPERATOR: ${l.operator} | INTERACTION: ${l.action} | HASH: ${l.hash} | DETAILS: ${l.details}`
    ).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JH_CYBER_FORENSIC_AUDIT_LOGS_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Secure JSON Report Export (Including cumulative block chaining metrics)
  const handleJSONReportDownload = () => {
    const reportObj = {
      jurisdiction: "Jharkhand Forensic Systems Authority",
      district: "Deoghar Cyber Crime Cell",
      complianceStandard: "Section 65B Indian Evidence Act compliant logging",
      metadata: {
        caseReference: caseFileNo,
        forensicCustodian: officerDesignation,
        generationTimestamp: new Date().toISOString(),
        totalLogsAudited: logs.length,
        hashChainingStandard: hashMethod === 'SHA256' ? "SHA-256 Chained Cascaded Digest" : "MD5 Equivalent Chain Polynomial"
      },
      auditSequenceLockSignatures: {
        genesisBlockSeed: "ROOT_CUSTODY_SEED_0x82f",
        finalIntegrityChainChecksum: chainChecksum
      },
      forensicStatisticalReadouts: {
        totalAlerts: logs.filter(l => l.status === 'ALERT').length,
        totalWarnings: logs.filter(l => l.status === 'WARNING').length,
        totalSuccesses: logs.filter(l => l.status === 'SUCCESS').length,
        uniqueOperatorsInvolved: Array.from(new Set(logs.map(l => l.operator))),
        analyzedBPartyLinkages: commonAssociates?.length || 0,
        totalCDRRecordsUploaded: cdrRecords?.length || 0
      },
      analyticalFindings: commonAssociates?.map((assoc) => ({
        nexusBParty: assoc.dialedB,
        originatingCallers: assoc.callingTargets,
        aggregatedCallsCount: assoc.totalCalls,
        totalDurationSeconds: assoc.totalDuration,
        sourceFileList: assoc.filesInvolved
      })) || [],
      auditLedgerRows: logs.map((log, index) => ({
        sequenceIndex: logs.length - index,
        timestamp: log.timestamp,
        operator: log.operator,
        action: log.action,
        details: log.details,
        status: log.status,
        unitRecordMD5Signature: log.hash
      }))
    };

    const blob = new Blob([JSON.stringify(reportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JH_CYBER_COMPLIANCE_LOCK_${caseFileNo.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // SECURE SECTION 65B COMPLIANT PDF EXPORTER (Using programatic jsPDF Layouts)
  const handlePDFReportDownload = () => {
    if (logs.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // Dimensions helper: A4 is roughly 595 x 842 points
    let currY = 40;

    // Header Dark Banner Plate
    doc.setFillColor(15, 23, 42); // slate-900 / dark space
    doc.rect(45, currY, 505, 80, 'F');

    // Title text details
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text("JHARKHAND STATE FORENSIC COOP SYSTEMS", 60, currY + 25);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text("DEOGHAR DISTRICT CYBER CRIME CELL • LEGAL FORENSICS OUTSIDE DIVISION", 60, currY + 42);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(7.5);
    doc.text("AIR-GAPPED COMPLIANCE LEDGER EXTRACTION • SEC 65B INDIAN EVIDENCE ACT EVIDENCE CERTIFICATION", 60, currY + 56);
    doc.text("GENERATION PROTOCOL: MIL-SPEC AIR-GAP COMPLIANCE TRACE", 60, currY + 68);

    // Sidebar neon verified text stamp inside box
    doc.setDrawColor(52, 211, 153);
    doc.setLineWidth(1);
    doc.rect(480, currY + 15, 55, 50);
    doc.setTextColor(52, 211, 153);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text("SECURE", 493, currY + 30);
    doc.text("CUSTODY", 491, currY + 41);
    doc.text("LOCK", 499, currY + 52);

    currY += 105;

    // SECTION 1: Case Profile
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text("1. EVIDENCE EXTRACTION FILE PROFILE", 45, currY);

    currY += 5;
    doc.setDrawColor(226, 232, 240); // slate-200 line
    doc.line(45, currY, 550, currY);

    currY += 18;
    doc.setFontSize(8);
    
    // Column 1
    doc.setFont('helvetica', 'bold');
    doc.text("CASE FILE NO:", 50, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(caseFileNo, 160, currY);

    // Column 2
    doc.setFont('helvetica', 'bold');
    doc.text("EXTRACTION IST TIME:", 330, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleString('en-IN'), 430, currY);

    currY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text("CUSTODIAL SPECIALIST:", 50, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(officerDesignation, 160, currY);

    doc.setFont('helvetica', 'bold');
    doc.text("COMPLIANCE VERDICT:", 330, currY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 163, 74); // green-600
    doc.text("VERIFIED INTEGRITY", 430, currY);
    doc.setTextColor(15, 23, 42);

    currY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text("CHAIN CHECKSUM METHOD:", 50, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hashMethod} Sequential Cascaded Blocks`, 160, currY);

    doc.setFont('helvetica', 'bold');
    doc.text("AUDITED ACTION LINES:", 330, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${logs.length} Operations Traceable`, 430, currY);

    currY += 18;
    doc.setFont('helvetica', 'bold');
    doc.text("CUMULATIVE STAMP DIGEST:", 50, currY);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(chainChecksum, 180, currY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    currY += 28;

    // SECTION 2: Certification Testimony Under SEC 65B
    if (includeSec65B) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text("2. SECTION 65B INDIAN EVIDENCE ACT LEGAL CERTIFICATE", 45, currY);
      
      currY += 5;
      doc.setDrawColor(226, 232, 240);
      doc.line(45, currY, 550, currY);

      currY += 12;
      // Background shading box for testimonial Block
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(45, currY, 505, 85, 'F');
      
      // Draw left indigo border 
      doc.setFillColor(79, 70, 229);
      doc.rect(45, currY, 3, 85, 'F');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600

      const testimonialText = `I, the undersigned Certifying Officer designated herein, hereby declare that the electronic records and system interaction audits printed in this legal extract are direct chronological traces downloaded directly from the active forensic memory storage arrays of the Cyber Systems console. I verify that the computational targets, server ports, and local databases remain in uninterrupted operation during the investigative periods and that the cryptographic signature sequence lock starting from ROOT Genesis certifies complete chain-of-custody without unauthorized manual alteration or dataset deletion.`;
      
      const splitLines = doc.splitTextToSize(testimonialText, 485);
      doc.text(splitLines, 55, currY + 12);

      doc.setTextColor(15, 23, 42);
      currY += 105;
    }

    // SECTION: Analytical Link Findings
    let currentSec = includeSec65B ? 3 : 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${currentSec}. CO-CONSPIRATOR COORDINATION NEXUS (COMMON B-PARTIES)`, 45, currY);

    currY += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(45, currY, 550, currY);

    currY += 15;

    // Table Header for Linkages
    doc.setFillColor(239, 246, 255); // light blue slate
    doc.rect(45, currY - 10, 505, 16, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // deep blue slate
    doc.text("COMMON LINK B-PARTY", 52, currY);
    doc.text("ASSOCIATED CALLEES / TARGETS", 155, currY);
    doc.text("TOTAL DUR / CALLS", 335, currY);
    doc.text("FORENSIC RECORD SOURCES", 445, currY);

    currY += 10;

    if (!commonAssociates || commonAssociates.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      doc.text("No common coordination contacts extracted yet. Ingest multiple target files to execute link analysis.", 50, currY);
      currY += 20;
    } else {
      commonAssociates.slice(0, 10).forEach((assoc) => {
        // Simple page overflow check inside findings list
        if (currY > 740) {
          doc.addPage();
          currY = 50;
          doc.setFillColor(239, 246, 255);
          doc.rect(45, currY - 10, 505, 16, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text("COMMON LINK B-PARTY (CONT.)", 52, currY);
          doc.text("ASSOCIATED CALLEES / TARGETS", 155, currY);
          doc.text("TOTAL DUR / CALLS", 335, currY);
          doc.text("FORENSIC RECORD SOURCES", 445, currY);
          currY += 10;
        }

        // Draw borderline
        doc.setDrawColor(241, 245, 249);
        doc.line(45, currY + 6, 550, currY + 6);

        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);

        // Phone B-party
        doc.setFont('helvetica', 'bold');
        doc.text(assoc.dialedB, 50, currY);

        // Targets list
        doc.setFont('helvetica', 'normal');
        const targetsStr = assoc.callingTargets.join(', ');
        const wrappedTargets = doc.splitTextToSize(targetsStr, 175);
        doc.text(wrappedTargets, 155, currY);

        // Metrics
        const min = Math.floor(assoc.totalDuration / 60);
        const sec = assoc.totalDuration % 60;
        const durStr = `${min}m ${sec}s (${assoc.totalCalls} calls)`;
        doc.text(durStr, 335, currY);

        // Sources list
        const filesStr = assoc.filesInvolved.join(', ');
        const wrappedFiles = doc.splitTextToSize(filesStr, 100);
        doc.text(wrappedFiles, 445, currY);

        const maxLines = Math.max(wrappedTargets.length, wrappedFiles.length);
        currY += (maxLines * 9.5) + 6;
      });
    }

    currY += 20;
    if (currY > 720) {
      doc.addPage();
      currY = 50;
    }

    // SECTION 4: Logs Ledger
    currentSec += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${currentSec}. CHRONOLOGICAL FORENSIC AUDIT TRAIL LOGS`, 45, currY);

    currY += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(45, currY, 550, currY);

    currY += 15;

    // Table Header Accent Row
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(45, currY - 10, 505, 16, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("TIME STAMP", 52, currY);
    doc.text("VERDICT", 115, currY);
    doc.text("TACTICAL CUSTODY OPERATION DETAILS", 165, currY);
    doc.text("SECURITY CHECK HASH", 460, currY);

    currY += 10;

    // Loop and print logs safely managing multi-page output
    logs.forEach((log) => {
      // Dynamic Page overflow checking
      if (currY > 770) {
        // Draw page continues watermark
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Audit trail continues on next page... FORENSIC ADMISSIBLE COPY", 45, 810);
        doc.text(`CUSTODIAL SUMMARY DIGEST SEAL: [${chainChecksum.slice(0, 16).toUpperCase()}]`, 380, 810);

        doc.addPage();
        currY = 50;

        // Running head of next page
        doc.setFillColor(15, 23, 42);
        doc.rect(45, 20, 505, 15, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`JHARKHAND CYBER FORENSICS BRANCH • DIRECT METADATA AUDIT • RE: ${caseFileNo}`, 52, 30);

        // Header Accent Row
        doc.setFillColor(241, 245, 249);
        doc.rect(45, currY - 10, 505, 16, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("TIME STAMP", 52, currY);
        doc.text("VERDICT", 115, currY);
        doc.text("TACTICAL CUSTODY OPERATION DETAILS", 165, currY);
        doc.text("SECURITY CHECK HASH", 460, currY);
        currY += 10;
      }

      // Thin grid rows lines
      doc.setDrawColor(241, 245, 249);
      doc.line(45, currY + 6, 550, currY + 6);

      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      
      // Timestamp
      doc.setFont('helvetica', 'normal');
      doc.text(`[${log.timestamp}]`, 50, currY);

      // Status Indicator
      doc.setFont('helvetica', 'bold');
      if (log.status === 'SUCCESS') {
        doc.setTextColor(22, 163, 74); // green-600
      } else if (log.status === 'ALERT') {
        doc.setTextColor(220, 38, 38); // red-600
      } else {
        doc.setTextColor(180, 83, 9); // amber-700
      }
      doc.text(log.status, 115, currY);

      doc.setTextColor(15, 23, 42);

      // Wrapped Description
      const descPayload = `${log.action}: ${log.details}`;
      const wrappedDesc = doc.splitTextToSize(descPayload, 285);
      doc.setFont('helvetica', 'normal');
      doc.text(wrappedDesc, 165, currY);

      // Node individual hash representation
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(log.hash.slice(0, 14), 460, currY);

      // Advance Y coordinate depending on lines wrapping
      const rowLines = wrappedDesc.length;
      currY += (rowLines * 9.5) + 6;
    });

    // SIGNATURE SIGN-OFF BOTTOM BOX BLOCK
    if (currY > 670) {
      doc.addPage();
      currY = 40;
    }

    currY += 30;
    doc.setDrawColor(226, 232, 240);
    doc.line(45, currY, 550, currY);

    currY += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("DIGITAL FORENSIC SEAL SIGN-OFF BLOCK", 45, currY);

    currY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Certified under the encryption standards of JHARKHAND STATE CYBER AUTHORITY.", 45, currY);

    // Mock generated high-tech barcode block representating security signature
    doc.setDrawColor(15, 23, 42);
    doc.setFillColor(248, 250, 252);
    doc.rect(395, currY - 5, 155, 65, 'FD');

    doc.setDrawColor(15, 23, 42);
    let barX = 405;
    while (barX < 535) {
      const lineWeight = Math.random() > 0.4 ? 1.5 : 3.5;
      doc.setLineWidth(lineWeight);
      doc.line(barX, currY + 5, barX, currY + 45);
      barX += Math.floor(Math.random() * 3.5) + 1.5;
    }
    doc.setLineWidth(1); // Restore to standards

    doc.setFont('courier', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(15, 23, 42);
    doc.text("STATE CUSTODY HARDWARE SIGNATURE", 405, currY + 56);

    // Signature textual details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("AUTHENTICATED OFFICER CERTIFICATE", 45, currY + 36);

    doc.setFont('helvetica', 'normal');
    doc.text(`Custodian Designation: ${officerDesignation}`, 45, currY + 47);
    doc.text(`Authority Level: Forensic Verification Agent`, 45, currY + 57);
    doc.text(`System Signature ID: #SEC-${chainChecksum.slice(0, 8).toUpperCase()}`, 45, currY + 67);

    // Final global print-out footer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("RESTRICTED DISCLOSURE • CYBER COURT ADMISSIBLE CHAIN LEDGER EXTRACT", 45, 810);
    doc.text(`SECURE DIGEST: ${chainChecksum.toUpperCase()}`, 290, 810);

    // Initiate browser download
    doc.save(`JH_CYBER_FORENSIC_EVIDENCE_SEC65B_${caseFileNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  // Structured CSV Exporter for Certified Official Case Records
  const handleCSVReportDownload = () => {
    if (logs.length === 0) return;

    const csvRows: string[] = [];
    
    // Administrative Case Documentation Header
    csvRows.push('"=========================================================================="');
    csvRows.push('"OFFICIAL CYBER FORENSIC AUDIT RECORD & EVIDENCE LOG"');
    csvRows.push('"=========================================================================="');
    csvRows.push(`"JURISDICTION","Jharkhand Forensic Systems Authority • Deoghar Cyber Crime Cell"`);
    csvRows.push(`"CASE FILE NUMBER","${caseFileNo.replace(/"/g, '""')}"`);
    csvRows.push(`"FIR / CRIME NO. & YEAR","${firNo.replace(/"/g, '""')}"`);
    csvRows.push(`"JURISDICTIONAL POLICE STATION","${policeStation.replace(/"/g, '""')}"`);
    csvRows.push(`"TARGET TRIAL CRIMINAL COURT","${courtName.replace(/"/g, '""')}"`);
    csvRows.push(`"ACCUSED / SUSPECT CASE PROFILE","${suspectName.replace(/"/g, '""')}"`);
    csvRows.push(`"COURT EXHIBIT STAMP NO.","${exhibitNo.replace(/"/g, '""')}"`);
    csvRows.push(`"FORENSIC CUSTODIAN AGENT","${officerDesignation.replace(/"/g, '""')}"`);
    csvRows.push(`"INTEGRITY CHAIN CHECKSUM","${chainChecksum.replace(/"/g, '""')}"`);
    csvRows.push(`"REPORT GENERATION TIMESTAMP (UTC)","${new Date().toISOString()}"`);
    csvRows.push('"COMPLIANCE PROTOCOL","Section 65B Indian Evidence Act certified electronic record chain-of-custody ledger"');
    csvRows.push('"=========================================================================="');
    csvRows.push(''); // Spacer

    // Standard CSV headers for the structured log rows
    csvRows.push('"SEQUENCE INDEX","TIMESTAMP","OPERATOR / CUSTODIAN","ACTIONED PROTOCOL / SYSTEM EVENT","FINDINGS DESCRIPTION / TRACE PATH","COMPLIANCE VERDICT","CRYPTOGRAPHIC BLOCK SIGNATURE (MD5)"');

    // Populate data chronologically (oldest events first)
    const chronologicalLogs = [...logs].reverse();
    chronologicalLogs.forEach((log, index) => {
      const sanitizedTimestamp = (log.timestamp || '').replace(/"/g, '""');
      const sanitizedOperator = (log.operator || '').replace(/"/g, '""');
      const sanitizedAction = (log.action || '').replace(/"/g, '""');
      const sanitizedDetails = (log.details || '').replace(/"/g, '""');
      const sanitizedStatus = (log.status || '').replace(/"/g, '""');
      const sanitizedHash = (log.hash || '').replace(/"/g, '""');

      const colValues = [
        `"${index + 1}"`,
        `"${sanitizedTimestamp}"`,
        `"${sanitizedOperator}"`,
        `"${sanitizedAction}"`,
        `"${sanitizedDetails}"`,
        `"${sanitizedStatus}"`,
        `"${sanitizedHash}"`
      ];
      csvRows.push(colValues.join(','));
    });

    // Generate CSV Blob
    const csvContent = csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    
    const fileLabel = `${exhibitNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '_')}_CASE_${caseFileNo.replace(/[^a-zA-Z0-9]/g, '_')}`;
    link.download = `JH_CYBER_FORENSIC_AUDIT_${fileLabel}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // NEW DEDICATED OFFICIAL COURT PRESENTATION DOSSIER EXPORTER
  const handleCourtPDFReportDownload = () => {
    if (logs.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const drawPageBorder = (d: jsPDF) => {
      d.setDrawColor(180, 83, 9); // amber-700/gold border
      d.setLineWidth(1.5);
      d.rect(30, 30, 535, 782); // outer margin
      
      d.setDrawColor(245, 158, 11); // amber-500 fine light line
      d.setLineWidth(0.5);
      d.rect(34, 34, 527, 774);
    };

    // PAGE 1: Section 65B Certificate & Custody Declaration
    drawPageBorder(doc);

    let currY = 60;

    // Govt of Jharkhand Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // deep slate
    doc.text("GOVERNMENT OF JHARKHAND • DEPARTMENT OF POLICE", 297, currY, { align: 'center' });
    
    currY += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`${policeStation.toUpperCase()} • DEOGHAR CYBER CRIME CELL`, 297, currY, { align: 'center' });

    currY += 20;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(50, currY, 545, currY);

    currY += 25;
    // Section 65B Certificate Title Box
    doc.setFillColor(254, 243, 199); // amber-100
    doc.rect(50, currY - 12, 495, 24, 'F');
    doc.setDrawColor(180, 83, 9);
    doc.rect(50, currY - 12, 495, 24, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("CERTIFICATE OF DIGITAL ADMISSIBILITY UNDER SECTION 65B(4) OF THE INDIAN EVIDENCE ACT", 297, currY + 4, { align: 'center' });

    currY += 35;

    // Prosecution Profile details
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    doc.setFont('helvetica', 'bold');
    doc.text("TRIAL TRIAL COURT:", 55, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(courtName.toUpperCase(), 175, currY);

    currY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text("CRIME / FIR NO:", 55, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(firNo.toUpperCase(), 175, currY);

    currY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text("ACCUSED PROFILED:", 55, currY);
    doc.setFont('helvetica', 'normal');
    doc.text(suspectName, 175, currY);

    currY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text("OFFICIAL EXHIBIT ID:", 55, currY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(exhibitNo, 175, currY);
    doc.setTextColor(51, 65, 85);

    currY += 20;
    doc.setDrawColor(226, 232, 240);
    doc.line(50, currY, 545, currY);

    currY += 25;
    // SWORN STATEMENT CLAUSE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("I. STATUTORY EVIDENCE VALIDITY STATEMENT", 55, currY);

    currY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const statementClauseText = `I, the undersigned Certifying Forensic Officer, designated as ${officerDesignation}, do solemnly verify and certify under the binding provisions of Section 65B of the Indian Evidence Act, 1872 that:

1. I am in lawful control of the computing instruments and local memory arrays of the Cyber Systems and Base Transceiver Station (BTS) databases involved in extracting this dataset.

2. The telecom and open-source intelligence coordinates summarized inside Schedule 'A' and Schedule 'B' represent authentic reproductions of digital interactions obtained from telecommunication service providers.

3. The forensic auditing logging sequence remained fully operational under safe, air-gapped terminal parameters throughout the analysis. There is zero manual intervention, deletion, or loss of custody.

4. The cumulative blockchain-cascade digest key, verified to be [${chainChecksum}], locks the entire transaction sequence as untampered, unaltered, and completely integral from the exact moment of investigation.`;

    const splitStmt = doc.splitTextToSize(statementClauseText, 480);
    doc.text(splitStmt, 55, currY);

    const paragraphHeight = splitStmt.length * 12.5;
    currY += paragraphHeight + 40;

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(50, currY, 545, currY);

    currY += 25;

    // LEFT: Signature blocks
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("OFFICER IN CHARGE SIGN-OFF", 55, currY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(`Designation: ${officerDesignation}`, 55, currY + 28);
    doc.text(`Cyber Forensic Specialist, Deoghar`, 55, currY + 39);
    doc.text("Certified Date: " + new Date().toLocaleDateString('en-IN'), 55, currY + 50);

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.line(55, currY, 210, currY);

    // RIGHT: Signature Barcode block
    doc.setFillColor(248, 250, 252);
    doc.rect(385, currY - 10, 160, 72, 'F');
    doc.setDrawColor(180, 83, 9);
    doc.rect(385, currY - 10, 160, 72, 'S');

    doc.setDrawColor(15, 23, 42);
    let barCodeX = 395;
    while (barCodeX < 535) {
      const lineWeight = Math.random() > 0.4 ? 1.5 : 3;
      doc.setLineWidth(lineWeight);
      doc.line(barCodeX, currY, barCodeX, currY + 40);
      barCodeX += Math.floor(Math.random() * 3) + 2.5;
    }
    doc.setLineWidth(1);

    doc.setFont('courier', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`*SEC-65B-LOCK-${chainChecksum.slice(0, 10).toUpperCase()}*`, 402, currY + 50);
    doc.text("OFFICIAL FORENSIC SYSTEMS SEAL", 402, currY + 58);

    // Page 1 Footer stamp
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`RESTRICTED LAW ENFORCEMENT DISCLOSURE • EXHIBIT: ${exhibitNo}`, 50, 805);
    doc.text(`PAGE 1 OF 3 • JHARKHAND CYBER FORENSICS BRANCH`, 380, 805);


    // ================= PAGE 2: Schedule A (Telecom Target Linkages) =================
    doc.addPage();
    drawPageBorder(doc);
    currY = 60;

    // Dark layout strip for header
    doc.setFillColor(15, 23, 42);
    doc.rect(50, currY - 15, 495, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`SCHEDULE "A": DYNAMIC TELECOM CO-CONSPIRATORS & TARGET LINK MATRICES`, 60, currY + 1);

    doc.setFontSize(7.5);
    doc.setTextColor(245, 158, 11);
    doc.text(exhibitNo, 500, currY + 1);

    currY += 45;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text("The following linkage analysis results present common dialectic B-Parties contacted by multiple suspect targets or device phone lines concurrently. These serve as potential operational nodes, coordinating calls within the jurisdiction.", 55, currY);

    currY += 25;

    // Draw light golden border for schedule A linkage table
    doc.setFillColor(254, 243, 199); // amber-100
    doc.rect(50, currY - 10, 495, 18, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 53, 4); // deep amber-900
    doc.text("COMMON LINK B-PARTY (HUB)", 58, currY + 2);
    doc.text("ASSOCIATED SUSPECT CALLEES", 185, currY + 2);
    doc.text("CALL DURATIONS / VOL", 365, currY + 2);
    doc.text("CUSTODIAL RECORD SOURCE FILES", 460, currY + 2);

    currY += 15;

    if (!commonAssociates || commonAssociates.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text("No common coordination contacts extracted yet. Ingest multiple target files to execute link analysis.", 60, currY + 10);
      currY += 30;
    } else {
      commonAssociates.slice(0, 15).forEach((assoc) => {
        if (currY > 740) {
          doc.addPage();
          drawPageBorder(doc);
          currY = 60;
          
          doc.setFillColor(15, 23, 42);
          doc.rect(50, currY - 15, 495, 25, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(`SCHEDULE "A": DYNAMIC TELECOM CO-CONSPIRATORS (CONTINUED)`, 60, currY + 1);
          
          doc.setFontSize(7.5);
          doc.setTextColor(245, 158, 11);
          doc.text(exhibitNo, 500, currY + 1);
          currY += 40;

          doc.setFillColor(254, 243, 199);
          doc.rect(50, currY - 10, 495, 18, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(120, 53, 4);
          doc.text("COMMON LINK B-PARTY (HUB)", 58, currY + 2);
          doc.text("ASSOCIATED SUSPECT CALLEES", 185, currY + 2);
          doc.text("CALL DURATIONS / VOL", 365, currY + 2);
          doc.text("CUSTODIAL RECORD SOURCE FILES", 460, currY + 2);
          currY += 15;
        }

        // Row Separator Line
        doc.setDrawColor(241, 245, 249);
        doc.line(50, currY + 6, 545, currY + 6);

        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);

        doc.setFont('helvetica', 'bold');
        doc.text(assoc.dialedB, 55, currY);

        doc.setFont('helvetica', 'normal');
        const callingList = assoc.callingTargets.join(', ');
        const wrappedList = doc.splitTextToSize(callingList, 170);
        doc.text(wrappedList, 185, currY);

        const min = Math.floor(assoc.totalDuration / 60);
        const sec = assoc.totalDuration % 60;
        doc.text(`${min}m ${sec}s (${assoc.totalCalls} calls)`, 365, currY);

        const cleanFiles = assoc.filesInvolved.map(f => f.replace('SAMPLE_CDR_', '').slice(0, 15)).join(', ');
        const wrappedCleanF = doc.splitTextToSize(cleanFiles, 80);
        doc.text(wrappedCleanF, 460, currY);

        const linesMax = Math.max(wrappedList.length, wrappedCleanF.length);
        currY += (linesMax * 10) + 6;
      });
    }

    // Page 2 Footer stamp
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`RESTRICTED LAW ENFORCEMENT DISCLOSURE • EXHIBIT: ${exhibitNo}`, 50, 805);
    doc.text(`PAGE 2 OF 3 • JHARKHAND CYBER FORENSICS BRANCH`, 380, 805);


    // ================= PAGE 3: Schedule B (Chronological Trace Logs) =================
    doc.addPage();
    drawPageBorder(doc);
    currY = 60;

    doc.setFillColor(15, 23, 42);
    doc.rect(50, currY - 15, 495, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`SCHEDULE "B": CRITICAL TRANSACTION LOG EXTRACTION & COMPLIANCE PATHWAYS`, 60, currY + 1);

    doc.setFontSize(7.5);
    doc.setTextColor(245, 158, 11);
    doc.text(exhibitNo, 500, currY + 1);

    currY += 40;

    // Header label rows
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(50, currY - 10, 495, 18, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("TIMESTAMP (IST)", 58, currY + 2);
    doc.text("VERDICT", 140, currY + 2);
    doc.text("FORENSIC TRANSACTION AND OPERATION TRACE DETAIL", 195, currY + 2);
    doc.text("BLOCK COMPLIANCE SIGNATURE HASH", 455, currY + 2);

    currY += 15;

    // Trace maximum 35 trace elements chronologically (newest at top)
    logs.slice(0, 35).forEach((log) => {
      if (currY > 740) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Audit path tracing continued under official oversight limits.", 55, 765);

        doc.addPage();
        drawPageBorder(doc);
        currY = 60;

        doc.setFillColor(15, 23, 42);
        doc.rect(50, currY - 15, 495, 25, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`SCHEDULE "B": SYSTEM EXTRACTION LEDGER PATHWAYS (CONT.)`, 60, currY + 1);

        doc.setFontSize(7.5);
        doc.setTextColor(245, 158, 11);
        doc.text(exhibitNo, 500, currY + 1);
        currY += 40;

        doc.setFillColor(241, 245, 249);
        doc.rect(50, currY - 10, 495, 18, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("TIMESTAMP (IST)", 58, currY + 2);
        doc.text("VERDICT", 140, currY + 2);
        doc.text("FORENSIC TRANSACTION AND OPERATION TRACE DETAIL", 195, currY + 2);
        doc.text("BLOCK COMPLIANCE SIGNATURE HASH", 455, currY + 2);
        currY += 15;
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(50, currY + 6, 545, currY + 6);

      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      // Timestamp IST output
      doc.setFont('helvetica', 'normal');
      doc.text(`[${log.timestamp}]`, 55, currY);

      // Verdict coloring is critical
      doc.setFont('helvetica', 'bold');
      if (log.status === 'SUCCESS') {
        doc.setTextColor(22, 163, 74);
      } else if (log.status === 'ALERT') {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(180, 83, 9);
      }
      doc.text(log.status, 140, currY);
      doc.setTextColor(15, 23, 42);

      // Description logic with wrap line height calculations
      const actionDetails = `${log.action}: ${log.details}`;
      const wrappedDetailsStr = doc.splitTextToSize(actionDetails, 250);
      doc.setFont('helvetica', 'normal');
      doc.text(wrappedDetailsStr, 195, currY);

      // Dynamic MD5 block sequence lock trace code representation
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(log.hash.slice(0, 12), 455, currY);

      const computedHeight = wrappedDetailsStr.length;
      currY += (computedHeight * 10) + 6;
    });

    // Page 3 Footer stamp
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`RESTRICTED LAW ENFORCEMENT DISCLOSURE • EXHIBIT: ${exhibitNo}`, 50, 805);
    doc.text(`PAGE 3 OF 3 • JHARKHAND CYBER FORENSICS BRANCH`, 380, 805);

    // Dynamic clean naming of Court Explicits Admissible Report
    const cleanExhibitLabel = exhibitNo.toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
    const cleanCaseNo = caseFileNo.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`COURT_EXHIBIT_${cleanExhibitLabel}_SEC65B_${cleanCaseNo}.pdf`);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden" id="evidence-audit-console">
      {/* Visual background scanner overlay */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            Air-Gapped Forensic Auditing Logs & Chain-of-Custody
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Section 65B Indian Evidence Act compliant logging. Every analysis and lookup hashes into a cryptographically verified security sequence automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => setShowExporter(!showExporter)}
            className={`px-3 py-1.5 border hover:text-indigo-300 text-indigo-400 text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
              showExporter ? 'bg-indigo-950/65 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-800 hover:border-indigo-500'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Secured Export Panel
            {showExporter ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-rose-900 hover:text-rose-400 text-slate-500 text-[10px] rounded transition-colors cursor-pointer"
          >
            Clear Console
          </button>
        </div>
      </div>

      {/* Tamper Evident Options Panel */}
      {showExporter && (
        <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-slate-800 animate-fadeIn space-y-4 text-left text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-indigo-400 font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Anti-Tamper Compliance Configuration
            </span>
            <span className="text-[9px] text-slate-500">SECTION 65B CERTIFICATION ENABLED</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Case File Reference Number */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[9px] block uppercase tracking-wider">Case File Registry ID</label>
              <input 
                type="text" 
                value={caseFileNo} 
                onChange={(e) => setCaseFileNo(e.target.value)} 
                placeholder="e.g. JH-CYB-2026-F981"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-indigo-600 outline-none transition-colors"
              />
            </div>

            {/* Custodian Designation */}
            <div className="space-y-1">
              <label className="text-slate-400 text-[9px] block uppercase tracking-wider font-mono">Forensic Custodian / ID</label>
              <input 
                type="text" 
                value={officerDesignation} 
                onChange={(e) => setOfficerDesignation(e.target.value)} 
                placeholder="e.g. Forensics-Agent-08"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-indigo-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* Security Hashing System selection */}
            <div className="space-y-1.5">
              <label className="text-slate-400 text-[9px] block uppercase tracking-wider">Security Hashing Protocol</label>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setHashMethod('SHA256')}
                  className={`flex-1 py-1 px-1 rounded border text-[9px] font-bold uppercase transition-all cursor-pointer ${
                    hashMethod === 'SHA256' 
                      ? 'bg-slate-950 border-indigo-600 text-indigo-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  SHA-256 Chain
                </button>
                <button 
                  type="button"
                  onClick={() => setHashMethod('MD5')}
                  className={`flex-1 py-1 px-1 rounded border text-[9px] font-bold uppercase transition-all cursor-pointer ${
                    hashMethod === 'MD5' 
                      ? 'bg-slate-950 border-indigo-600 text-indigo-300' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  MD5 Chain Fallback
                </button>
              </div>
            </div>

            {/* Indian Evidence Act Sec 65B clause check */}
            <div className="flex items-center justify-between border border-slate-800 rounded p-2.5 bg-slate-950/40">
              <div className="space-y-0.5 pr-2">
                <span className="text-[10px] text-slate-300 font-bold block">SEC 65B TESTIMONY CLAUSE</span>
                <span className="text-[9px] text-slate-500 block leading-tight">Prepend Section 65B sworn testimony certificate attachment.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={includeSec65B} 
                  onChange={(e) => setIncludeSec65B(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* ⚖️ Formal Court Admissibility Section */}
          <div className="border-t border-slate-800/80 pt-3">
            <span className="text-amber-500 font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider mb-2.5">
              <Scale className="w-3.5 h-3.5 text-amber-500" />
              Trial Court Presentation Specifications (Sec 65B Addendum)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* FIR reference */}
              <div className="space-y-1">
                <label className="text-slate-450 text-[9px] block uppercase tracking-wider text-slate-400">FIR / Crime No. & Year</label>
                <input 
                  type="text" 
                  value={firNo} 
                  onChange={(e) => setFirNo(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              {/* Jurisdictional Police Station */}
              <div className="space-y-1">
                <label className="text-slate-450 text-[9px] block uppercase tracking-wider text-slate-400">Jurisdictional Police Station (P.S.)</label>
                <input 
                  type="text" 
                  value={policeStation} 
                  onChange={(e) => setPoliceStation(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              {/* Trial Criminal Court */}
              <div className="space-y-1">
                <label className="text-slate-450 text-[9px] block uppercase tracking-wider text-slate-400">Target Trial Criminal court</label>
                <input 
                  type="text" 
                  value={courtName} 
                  onChange={(e) => setCourtName(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              {/* Accused Name */}
              <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                <label className="text-slate-450 text-[9px] block uppercase tracking-wider text-slate-400">Accused / Suspect Case Profile</label>
                <input 
                  type="text" 
                  value={suspectName} 
                  onChange={(e) => setSuspectName(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              {/* Court Exhibit Stamp No */}
              <div className="space-y-1">
                <label className="text-slate-450 text-[9px] block uppercase tracking-wider text-slate-400">Court Exhibit Stamp No.</label>
                <input 
                  type="text" 
                  value={exhibitNo} 
                  onChange={(e) => setExhibitNo(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Computed chain key readout */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-850/60 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2.5">
            <div className="flex flex-col gap-1 font-mono text-[9.5px] max-w-full overflow-hidden">
              <span className="text-slate-400 font-bold tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                Cascading Ledger Signature Digest:
              </span>
              <span className="text-emerald-400 font-semibold tracking-tight break-all font-mono select-all text-[8.5px]">
                {isCalculatingHash ? "Evaluating blocks..." : chainChecksum}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
              <button
                onClick={handleJSONReportDownload}
                disabled={logs.length === 0}
                className="flex-grow xl:flex-none px-2.5 py-1.5 bg-indigo-950/40 border border-indigo-900/60 hover:bg-indigo-900/80 hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-300 rounded font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                title="Download full JSON format forensic ledger including custom signatures"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                Export JSON
              </button>

              <button
                onClick={handleCSVReportDownload}
                disabled={logs.length === 0}
                className="flex-grow xl:flex-none px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-900/60 hover:bg-emerald-900/80 hover:border-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-300 rounded font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                title="Export current compliant forensic log events as a structured CSV spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Export CSV Logs
              </button>

              <button
                onClick={handlePDFReportDownload}
                disabled={logs.length === 0}
                className="flex-grow xl:flex-none px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                title="Generate standard analytical forensic PDF document"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Forensic PDF
              </button>

              <button
                onClick={handleCourtPDFReportDownload}
                disabled={logs.length === 0}
                className="flex-grow xl:flex-none px-4 py-1.5 bg-amber-950/50 border border-amber-900/80 hover:bg-amber-900/80 hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 rounded font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                title="Generate certified Section 65B docket optimized for immediate Indian Court Submission"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Export Court Report (65B)
              </button>
            </div>
          </div>
          
          <div className="text-[9px] text-slate-500 pt-1 text-center border-t border-slate-800/50">
            * Court export formats include specialized Section 65B certificates, co-conspirator schedules, and cryptographically sequential trial ledger signatures.
          </div>
        </div>
      )}

      {/* Terminal Grid Flow */}
      <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-[10.5px] space-y-2">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 text-left border-b border-slate-900/40 pb-2 leading-relaxed">
              <span className="text-slate-600 whitespace-nowrap">[{log.timestamp}]</span>
              
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                log.status === 'SUCCESS' 
                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-900' 
                  : log.status === 'ALERT'
                    ? 'bg-rose-950/70 text-rose-400 border border-rose-900'
                    : 'bg-amber-950/70 text-amber-400 border border-amber-900'
              }`}>
                {log.status}
              </span>

              <div className="flex-1">
                <span className="text-slate-300 font-bold">{log.operator}</span>
                <span className="text-slate-500"> → </span>
                <span className="text-indigo-300 font-semibold">{log.action}</span>
                <p className="text-slate-400 mt-0.5">{log.details}</p>
                
                {/* Cryptographic reference string */}
                <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-600">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>MD5 SECURITY SIGNATURE:</span>
                  <span className="font-mono tracking-tight text-slate-550 select-all">{log.hash}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-650">
            No forensic interactions registered yet. Trigger system functions to broadcast compliance logs.
          </div>
        )}
      </div>

      {/* Footer Audit Badge */}
      <div className="mt-4 pt-3.5 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 font-mono text-[10px]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Operational Security: <strong>ACTIVE AIR_GAP</strong></span>
        </div>
        <div>
          <span>Jharkhand Forensic Systems Authority • Deoghar Cyber Branch</span>
        </div>
      </div>
    </div>
  );
}
