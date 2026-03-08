"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DeviceStatusResponse, TrayStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const TRAY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  B: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  C: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  D: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

export default function TraysPage() {
  const { data, mutate } = useSWR<DeviceStatusResponse>("/api/device/status", fetcher, { refreshInterval: 5000 });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRefill = async (trayId: string) => {
    try {
      const res = await fetch(`/api/device/trays/${trayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refill: true }),
      });
      if (res.ok) {
        showMessage("success", `Tray ${trayId} marked as refilled.`);
        mutate();
      } else {
        showMessage("error", "Failed to refill tray.");
      }
    } catch {
      showMessage("error", "Network error.");
    }
  };

  const handleMarkLow = async (trayId: string) => {
    try {
      const res = await fetch(`/api/device/trays/${trayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillCount: 3 }),
      });
      if (res.ok) {
        showMessage("success", `Tray ${trayId} marked as low.`);
        mutate();
      } else {
        showMessage("error", "Failed to update tray.");
      }
    } catch {
      showMessage("error", "Network error.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tray Status</h1>

      {message && (
        <div className={`rounded-lg p-4 text-sm font-medium ${
          message.type === "success" ? "bg-safe-light text-safe" : "bg-critical-light text-critical"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.trays.map((tray: TrayStatus) => {
          const pct = tray.capacity > 0 ? (tray.pillCount / tray.capacity) * 100 : 0;
          const fillColor = pct > 50 ? 'bg-safe' : pct > 20 ? 'bg-warning' : 'bg-critical';
          const colors = TRAY_COLORS[tray.id] || TRAY_COLORS.A;

          return (
            <div key={tray.id} className={`${colors.bg} rounded-xl border ${colors.border} p-6 space-y-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-xl font-bold ${colors.text}`}>Tray {tray.id}</h2>
                  <p className="text-sm text-gray-500">{tray.label}</p>
                </div>
                {tray.isLow && (
                  <span className="bg-critical-light text-critical text-xs px-2 py-1 rounded-full font-medium">
                    LOW
                  </span>
                )}
              </div>

              {/* Fill Level */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Fill Level</span>
                  <span className="font-medium text-gray-700">{tray.pillCount} / {tray.capacity} pills</span>
                </div>
                <div className="w-full bg-white/80 rounded-full h-4">
                  <div
                    className={`${fillColor} h-4 rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}% remaining</p>
              </div>

              {/* Threshold */}
              <div className="text-sm text-gray-500">
                Low threshold: {tray.lowThreshold} pills
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleRefill(tray.id)}
                  className="flex-1 py-2 bg-safe text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
                >
                  Mark Refilled
                </button>
                <button
                  onClick={() => handleMarkLow(tray.id)}
                  className="flex-1 py-2 bg-warning text-white rounded-lg hover:bg-yellow-600 text-sm font-medium transition-colors"
                >
                  Mark Low
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
