"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DeviceStatusResponse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ControlsPage() {
  const { data, mutate } = useSWR<DeviceStatusResponse>("/api/device/status", fetcher, { refreshInterval: 3000 });
  const [dispenseForm, setDispenseForm] = useState({ trayA: 0, trayB: 0, trayC: 0, trayD: 0 });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleReset = async () => {
    if (!confirm("Reset device from BLOCKED state?")) return;
    try {
      const res = await fetch("/api/device/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", data.message);
        mutate();
      } else {
        showMessage("error", data.error);
      }
    } catch {
      showMessage("error", "Network error.");
    }
  };

  const handleManualDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dispenseForm.trayA + dispenseForm.trayB + dispenseForm.trayC + dispenseForm.trayD === 0) {
      showMessage("error", "Select at least one pill to dispense.");
      return;
    }
    try {
      const res = await fetch("/api/device/manual-dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispenseForm),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", data.message);
        setDispenseForm({ trayA: 0, trayB: 0, trayC: 0, trayD: 0 });
        mutate();
      } else {
        showMessage("error", data.error);
      }
    } catch {
      showMessage("error", "Network error.");
    }
  };

  const handleSyncTime = async () => {
    try {
      const res = await fetch("/api/device/sync-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: new Date().toISOString() }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", "Clock synced successfully.");
        mutate();
      } else {
        showMessage("error", data.error);
      }
    } catch {
      showMessage("error", "Network error.");
    }
  };

  const isBlocked = data?.state === "BLOCKED";
  const isStandby = data?.state === "STANDBY";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Device Controls</h1>

      {/* Status Message */}
      {message && (
        <div className={`rounded-lg p-4 text-sm font-medium ${
          message.type === "success" ? "bg-safe-light text-safe" : "bg-critical-light text-critical"
        }`}>
          {message.text}
        </div>
      )}

      {/* Current State */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500 mb-1">Current Device State</p>
        <p className={`text-2xl font-bold ${
          isBlocked ? 'text-critical' : isStandby ? 'text-safe' : 'text-warning'
        }`}>
          {data?.state || 'Loading...'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reset Device */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Reset Device</h2>
          <p className="text-sm text-gray-500">
            Reset the device from BLOCKED state back to STANDBY.
            Only available when device is blocked due to unsafe vitals.
          </p>
          <button
            onClick={handleReset}
            disabled={!isBlocked}
            className={`w-full py-3 rounded-lg font-medium text-sm transition-colors ${
              isBlocked
                ? 'bg-critical text-white hover:bg-red-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isBlocked ? 'Reset Device' : 'Device Not Blocked'}
          </button>
        </div>

        {/* Manual Dispense */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Manual Dispense</h2>
          <p className="text-sm text-gray-500">
            Manually trigger a dispense cycle. Only available in STANDBY.
          </p>
          <form onSubmit={handleManualDispense} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(['trayA', 'trayB', 'trayC', 'trayD'] as const).map(tray => (
                <div key={tray}>
                  <label className="block text-xs text-gray-500 mb-1">{tray.replace('tray', 'Tray ')}</label>
                  <input
                    type="number" min={0} max={10}
                    value={dispenseForm[tray]}
                    onChange={e => setDispenseForm({ ...dispenseForm, [tray]: parseInt(e.target.value) || 0 })}
                    disabled={!isStandby}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={!isStandby}
              className={`w-full py-3 rounded-lg font-medium text-sm transition-colors ${
                isStandby
                  ? 'bg-medical-600 text-white hover:bg-medical-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isStandby ? 'Dispense Now' : 'Not in STANDBY'}
            </button>
          </form>
        </div>

        {/* Sync Clock */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Sync Device Clock</h2>
          <p className="text-sm text-gray-500">
            Synchronize the device RTC with your browser&apos;s current time.
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400">Device Time</p>
              <p className="text-lg font-mono text-gray-900">
                {data?.deviceTime ? new Date(data.deviceTime + 'Z').toLocaleTimeString() : '--:--:--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Browser Time</p>
              <p className="text-lg font-mono text-gray-900">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncTime}
            className="w-full py-3 bg-medical-600 text-white rounded-lg hover:bg-medical-700 font-medium text-sm transition-colors"
          >
            Sync Now
          </button>
        </div>
      </div>
    </div>
  );
}
