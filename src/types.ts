export interface CommonAssociate {
  dialedB: string;
  callingTargets: string[];
  totalCalls: number;
  totalDuration: number;
  filesInvolved: string[];
}

export interface CDRRecord {
  targetA: string;
  dialedB: string;
  timestamp: string;
  duration: number; // in seconds
  lac: string;
  ci: string;
  imei?: string;
  imsi?: string;
  rawRecord?: Record<string, string>;
}

export interface TowerMetadata {
  mcc: string;
  mnc: string;
  lac: string;
  ci: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface OSResult {
  source: string;
  status: 'FOUND' | 'NOT_FOUND' | 'FLAGGED';
  details: string;
  link?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  operator: string;
  status: 'SUCCESS' | 'WARNING' | 'ALERT';
  hash: string;
  details: string;
}

export interface ExifMetadata {
  lat?: number;
  lng?: number;
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  hasCoordinates: boolean;
}
