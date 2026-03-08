// Device states - mirrors firmware SystemState enum in main.cpp
export type DeviceState =
  | 'STANDBY'
  | 'WAIT_FINGER'
  | 'READING_VITALS'
  | 'DISPENSING'
  | 'RESULT'
  | 'BLOCKED';

// Mirrors firmware MedicineSchedule struct
export interface Schedule {
  id: number;
  hour: number;
  minute: number;
  trayA: number;
  trayB: number;
  trayC: number;
  trayD: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  hour: number;
  minute: number;
  trayA: number;
  trayB: number;
  trayC: number;
  trayD: number;
}

export interface TrayStatus {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  pillCount: number;
  capacity: number;
  lowThreshold: number;
  isLow: boolean;
}

export interface VitalsReading {
  heartRate: number;
  spo2: number;
  safe: boolean;
  readAt: string;
}

export interface DispenseEvent {
  id: number;
  scheduleId: number | null;
  trayA: number;
  trayB: number;
  trayC: number;
  trayD: number;
  success: boolean;
  dispensedAt: string;
}

export type AlertType =
  | 'vitals_unsafe'
  | 'dispense_failure'
  | 'sensor_error'
  | 'tray_low'
  | 'device_blocked';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: number;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  acknowledged: boolean;
  createdAt: string;
}

export interface DeviceStatusResponse {
  state: DeviceState;
  deviceTime: string;
  nextDose: Schedule | null;
  lastDispense: DispenseEvent | null;
  lastVitals: VitalsReading | null;
  trays: TrayStatus[];
  activeAlerts: Alert[];
}
