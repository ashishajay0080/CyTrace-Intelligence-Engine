import { CDRRecord, TowerMetadata } from '../types';

// Real-world coordination cell locations around Deoghar/Jharkhand Hotbeds
export const DEOGHAR_TOWERS: TowerMetadata[] = [
  { mcc: "404", mnc: "45", lac: "1280", ci: "45101", name: "Baba Baidyanath Mandir Tower (Airtel)", latitude: 24.4925, longitude: 86.6997 },
  { mcc: "404", mnc: "45", lac: "1280", ci: "45102", name: "Jasidih Junction Sector B (Airtel)", latitude: 24.5122, longitude: 86.6508 },
  { mcc: "404", mnc: "20", lac: "3920", ci: "12490", name: "Madhupur Bypass Cell-03 (Jio)", latitude: 24.2618, longitude: 86.6521 },
  { mcc: "404", mnc: "20", lac: "3920", ci: "12491", name: "Madhupur Railway Station Platform Front (Jio)", latitude: 24.2584, longitude: 86.6455 },
  { mcc: "404", mnc: "45", lac: "1280", ci: "45103", name: "Tower Chowk Deoghar Central (Airtel)", latitude: 24.4851, longitude: 86.7022 },
  { mcc: "404", mnc: "94", lac: "8840", ci: "31294", name: "Ghormara Curd Market Cell (BSNL)", latitude: 24.4124, longitude: 86.7905 },
  { mcc: "404", mnc: "20", lac: "3920", ci: "12501", name: "Satsang Nagar Area Ground Sector (Jio)", latitude: 24.4789, longitude: 86.6892 },
  { mcc: "404", mnc: "45", lac: "1280", ci: "45104", name: "Rohini Village Cyber-Hotbed Outer Cell (Airtel)", latitude: 24.4962, longitude: 86.6341 },
  { mcc: "404", mnc: "94", lac: "8840", ci: "31299", name: "Sarwan Police Post Compound (BSNL)", latitude: 24.4418, longitude: 86.8291 }
];

// Rich Sample Data for Cross-Linkage & Spatial Routing
// We simulate three distinct targets B-Party interaction to demonstrate identification of coordinated behavior
export const SAMPLE_CDR_FILE_1 = `Target_A,Dialed_B,Timestamp,Duration_Sec,LAC_CellID,IMEI,IMSI
+91-98755-12301,+91-88220-44919,2026-05-28 10:05:00,120,1280-45101,862015049928374,404452019920192
+91-98755-12301,+91-70044-88219,2026-05-28 10:15:22,85,1280-45101,862015049928374,404452019920192
+91-98755-12301,+91-99554-11100,2026-05-28 10:48:10,340,1280-45104,862015049928374,404452019920192
+91-98755-12301,+91-88220-44919,2026-05-28 11:12:05,4,1280-45102,862015049928374,404452019920192
+91-98755-12301,+91-88220-44919,2026-05-28 11:30:15,180,1280-45103,862015049928374,404452019920192
+91-98755-12301,+91-62021-99221,2026-05-28 12:10:00,1280-45103,120,862015049928374,404452019920192`;

export const SAMPLE_CDR_FILE_2 = `SUSPECT_ID,RECEIVING_PARTY,DATETIME_OCCURRED,CALL_LEN_SECONDS,CELL_TOWER_LAC_ID,DEVICE_SERIAL
+91-74889-11002,+91-70044-88219,2026-05-28 10:08:12,190,3920-12490,359920405102941
+91-74889-11002,+91-94711-33299,2026-05-28 10:42:00,22,3920-12490,359920405102941
+91-74889-11002,+91-88220-44919,2026-05-28 11:45:00,95,3920-12491,359920405102941
+91-74889-11002,+91-70044-88219,2026-05-28 12:02:11,5,3920-12491,359920405102941
+91-74889-11002,+91-62021-99221,2026-05-28 12:35:50,310,8840-31294,359920405102941`;

export const SAMPLE_CDR_FILE_3 = `CallerNum,Called_B_Party,TimestampFull,TalkTime_Sec,Tower_Info,IMEI_Hardware_Address
+91-82103-55928,+91-70044-88219,2026-05-28 10:20:11,280,1280-45104,861002930419201
+91-82103-55928,+91-99341-88910,2026-05-28 10:55:00,12,1280-45103,861002930419201
+91-82103-55928,+91-88220-44919,2026-05-28 12:20:00,102,8840-31299,861002930419201`;
