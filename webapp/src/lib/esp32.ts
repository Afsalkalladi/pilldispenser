// ESP32 HTTP client for communicating with the device
// The ESP32 runs as a WiFi AP at 192.168.4.1

const ESP32_BASE_URL = process.env.ESP32_URL || 'http://192.168.4.1';
const FETCH_TIMEOUT = 5000; // 5 seconds

interface ESP32Status {
  state: string;
  deviceTime: string;
  heartRate: number;
  spo2: number;
  vitalsSafe: boolean;
  lastDispenseSuccess: boolean;
  lastDispenseTime: string;
  hasDispensed: boolean;
  trayA: number;
  trayB: number;
  trayC: number;
  trayD: number;
}

interface ESP32Schedule {
  index: number;
  hour: number;
  minute: number;
  trayA: number;
  trayB: number;
  trayC: number;
  trayD: number;
}

interface ESP32Trays {
  A: { pillCount: number; capacity: number; isLow: boolean };
  B: { pillCount: number; capacity: number; isLow: boolean };
  C: { pillCount: number; capacity: number; isLow: boolean };
  D: { pillCount: number; capacity: number; isLow: boolean };
}

async function esp32Fetch(path: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${ESP32_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getESP32Status(): Promise<ESP32Status> {
  const res = await esp32Fetch('/status');
  return res.json();
}

export async function getESP32Schedules(): Promise<ESP32Schedule[]> {
  const res = await esp32Fetch('/schedules');
  return res.json();
}

export async function addESP32Schedule(schedule: { hour: number; minute: number; trayA: number; trayB: number; trayC: number; trayD: number }): Promise<void> {
  await esp32Fetch('/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schedule),
  });
}

export async function deleteESP32Schedule(index: number): Promise<void> {
  await esp32Fetch(`/schedules?index=${index}`, { method: 'DELETE' });
}

export async function clearESP32Schedules(): Promise<void> {
  await esp32Fetch('/schedules?all=1', { method: 'DELETE' });
}

export async function resetESP32(): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await esp32Fetch('/reset', { method: 'POST' });
  return res.json();
}

export async function manualDispenseESP32(trays: { trayA: number; trayB: number; trayC: number; trayD: number }): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await esp32Fetch('/manual-dispense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trays),
  });
  return res.json();
}

export async function syncTimeESP32(time: { year: number; month: number; day: number; hour: number; minute: number; second: number }): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await esp32Fetch('/sync-time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(time),
  });
  return res.json();
}

export async function readVitalsESP32(): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await esp32Fetch('/read-vitals', { method: 'POST' });
  return res.json();
}

export async function getESP32Trays(): Promise<ESP32Trays> {
  const res = await esp32Fetch('/trays');
  return res.json();
}

export async function refillTrayESP32(tray: string): Promise<void> {
  await esp32Fetch('/trays/refill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tray }),
  });
}

// Sync all enabled schedules from SQLite to ESP32
export async function syncSchedulesToESP32(schedules: { hour: number; minute: number; trayA: number; trayB: number; trayC: number; trayD: number }[]): Promise<void> {
  // Clear all existing schedules on ESP32
  await clearESP32Schedules();

  // Add each schedule
  for (const sched of schedules) {
    await addESP32Schedule(sched);
  }
}

// Check if ESP32 is reachable
export async function isESP32Connected(): Promise<boolean> {
  try {
    await esp32Fetch('/status');
    return true;
  } catch {
    return false;
  }
}
