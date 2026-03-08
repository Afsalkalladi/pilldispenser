"use client";

import useSWR from "swr";
import type { DeviceStatusResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const STATE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  STANDBY: { bg: "bg-safe-light", text: "text-safe", label: "Standby" },
  WAIT_FINGER: { bg: "bg-warning-light", text: "text-warning", label: "Waiting for Finger" },
  READING_VITALS: { bg: "bg-warning-light", text: "text-warning", label: "Reading Vitals" },
  CHECK_VITALS: { bg: "bg-warning-light", text: "text-warning", label: "Checking Vitals" },
  DISPENSING: { bg: "bg-medical-100", text: "text-medical-700", label: "Dispensing" },
  RESULT: { bg: "bg-safe-light", text: "text-safe", label: "Result" },
  BLOCKED: { bg: "bg-critical-light", text: "text-critical", label: "BLOCKED" },
};

function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr) return "--:--";
  try {
    const d = new Date(timeStr.includes('T') ? timeStr : timeStr + 'Z');
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return timeStr;
  }
}

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DeviceStatusResponse>(
    "/api/device/status",
    fetcher,
    { refreshInterval: 3000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Device Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Device Dashboard</h1>
        <div className="bg-critical-light border border-critical rounded-xl p-6">
          <p className="text-critical font-medium">Failed to connect to device. Retrying...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stateInfo = STATE_COLORS[data.state] || STATE_COLORS.STANDBY;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Device Dashboard</h1>

      {/* State Banner */}
      <div className={`${stateInfo.bg} rounded-xl p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${data.state === 'BLOCKED' ? 'bg-critical animate-pulse' : data.state === 'STANDBY' ? 'bg-safe' : 'bg-warning animate-pulse'}`} />
          <span className={`text-lg font-semibold ${stateInfo.text}`}>
            Device State: {stateInfo.label}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {formatTime(data.deviceTime)}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Next Dose */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Next Scheduled Dose</p>
          {data.nextDose ? (
            <>
              <p className="text-3xl font-bold text-gray-900">
                {padTime(data.nextDose.hour, data.nextDose.minute)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.nextDose.trayA > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">A: {data.nextDose.trayA}</span>}
                {data.nextDose.trayB > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">B: {data.nextDose.trayB}</span>}
                {data.nextDose.trayC > 0 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">C: {data.nextDose.trayC}</span>}
                {data.nextDose.trayD > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">D: {data.nextDose.trayD}</span>}
              </div>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-400">--:--</p>
          )}
        </div>

        {/* Last Dispense */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Last Dispense</p>
          {data.lastDispense ? (
            <>
              <p className="text-3xl font-bold text-gray-900">
                {formatTime(data.lastDispense.dispensedAt)}
              </p>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                data.lastDispense.success
                  ? 'bg-safe-light text-safe'
                  : 'bg-critical-light text-critical'
              }`}>
                {data.lastDispense.success ? 'Success' : 'Failed'}
              </span>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-400">No data</p>
          )}
        </div>

        {/* Heart Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Heart Rate</p>
          {data.lastVitals ? (
            <>
              <p className={`text-3xl font-bold ${data.lastVitals.safe ? 'text-safe' : 'text-critical'}`}>
                {data.lastVitals.heartRate} <span className="text-lg font-normal">BPM</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">{formatTime(data.lastVitals.readAt)}</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-400">-- BPM</p>
          )}
        </div>

        {/* SpO2 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">SpO2</p>
          {data.lastVitals ? (
            <>
              <p className={`text-3xl font-bold ${data.lastVitals.safe ? 'text-safe' : 'text-critical'}`}>
                {data.lastVitals.spo2}<span className="text-lg font-normal">%</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {data.lastVitals.spo2 >= 89 ? 'Normal range' : 'Below threshold'}
              </p>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-400">-- %</p>
          )}
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Active Alerts</p>
          <p className={`text-3xl font-bold ${data.activeAlerts.length > 0 ? 'text-critical' : 'text-safe'}`}>
            {data.activeAlerts.length}
          </p>
          {data.activeAlerts.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.activeAlerts.slice(0, 3).map(alert => (
                <p key={alert.id} className="text-xs text-gray-500 truncate">
                  {alert.message}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Device Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Device Time</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatTime(data.deviceTime)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Simulated device clock</p>
        </div>
      </div>

      {/* Tray Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Tray Levels</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.trays.map(tray => {
            const pct = tray.capacity > 0 ? (tray.pillCount / tray.capacity) * 100 : 0;
            const color = pct > 50 ? 'bg-safe' : pct > 20 ? 'bg-warning' : 'bg-critical';
            return (
              <div key={tray.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">{tray.label}</span>
                  <span className="text-sm text-gray-500">{tray.pillCount}/{tray.capacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${color} h-3 rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
