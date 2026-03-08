"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Alert } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

type FilterType = "all" | "critical" | "warning" | "info";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "bg-critical-light", text: "text-critical", dot: "bg-critical" },
  warning: { bg: "bg-warning-light", text: "text-warning", dot: "bg-warning" },
  info: { bg: "bg-medical-100", text: "text-medical-700", dot: "bg-medical-500" },
};

const TYPE_LABELS: Record<string, string> = {
  vitals_unsafe: "Vitals Unsafe",
  dispense_failure: "Dispense Failure",
  sensor_error: "Sensor Error",
  tray_low: "Low Tray Medicine",
  device_blocked: "Device Blocked",
};

function formatDateTime(str: string): string {
  try {
    const d = new Date(str.includes('T') ? str : str + 'Z');
    return d.toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return str;
  }
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const { data: alerts, mutate } = useSWR<Alert[]>("/api/device/alerts", fetcher, { refreshInterval: 10000 });

  const handleAcknowledge = async (id: number) => {
    try {
      await fetch(`/api/device/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: true }),
      });
      mutate();
    } catch {
      // Silently fail
    }
  };

  const handleAcknowledgeAll = async () => {
    if (!alerts) return;
    const unacked = alerts.filter(a => !a.acknowledged);
    await Promise.all(
      unacked.map(a =>
        fetch(`/api/device/alerts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acknowledged: true }),
        })
      )
    );
    mutate();
  };

  const filteredAlerts = alerts?.filter(a => {
    if (filter === "all") return true;
    return a.severity === filter;
  }) || [];

  const unackedCount = alerts?.filter(a => !a.acknowledged).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        {unackedCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            Acknowledge All ({unackedCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "critical", "warning", "info"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-medical-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {!alerts ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-lg">No alerts</p>
            <p className="text-gray-300 text-sm mt-1">
              {filter !== "all" ? `No ${filter} alerts found.` : "System is running normally."}
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 flex items-start gap-4 ${
                  alert.acknowledged ? 'bg-gray-50 border-gray-200 opacity-60' : `bg-white border-gray-200`
                }`}
              >
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {TYPE_LABELS[alert.type] || alert.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(alert.createdAt)}</p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
