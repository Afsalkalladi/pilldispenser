"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Schedule, ScheduleInput } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SchedulesPage() {
  const { data: schedules, error, mutate } = useSWR<Schedule[]>("/api/device/schedules", fetcher);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ScheduleInput>({
    hour: 8, minute: 0, trayA: 0, trayB: 0, trayC: 0, trayD: 0,
  });
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (formData.trayA + formData.trayB + formData.trayC + formData.trayD === 0) {
      setFormError("At least one tray must have pills.");
      return;
    }

    try {
      if (editingId) {
        await fetch(`/api/device/schedules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        const res = await fetch("/api/device/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to create schedule.");
          return;
        }
      }
      mutate();
      setShowForm(false);
      setEditingId(null);
      setFormData({ hour: 8, minute: 0, trayA: 0, trayB: 0, trayC: 0, trayD: 0 });
    } catch {
      setFormError("Network error. Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this schedule?")) return;
    await fetch(`/api/device/schedules/${id}`, { method: "DELETE" });
    mutate();
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    await fetch(`/api/device/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    mutate();
  };

  const startEdit = (s: Schedule) => {
    setEditingId(s.id);
    setFormData({ hour: s.hour, minute: s.minute, trayA: s.trayA, trayB: s.trayB, trayC: s.trayC, trayD: s.trayD });
    setShowForm(true);
  };

  if (error) return <div className="text-critical p-4">Failed to load schedules.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Medication Schedules</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ hour: 8, minute: 0, trayA: 0, trayB: 0, trayC: 0, trayD: 0 }); }}
          className="px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 transition-colors text-sm font-medium"
          disabled={schedules && schedules.filter(s => s.hour >= 0).length >= 10}
        >
          + Add Schedule
        </button>
      </div>

      {schedules && schedules.filter(s => s.hour >= 0).length >= 10 && (
        <div className="bg-warning-light border border-warning rounded-lg p-3 text-sm text-gray-700">
          Maximum of 10 schedules reached (firmware limit).
        </div>
      )}

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit Schedule" : "Add Schedule"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Hour (0-23)</label>
                  <input
                    type="number" min={0} max={23}
                    value={formData.hour}
                    onChange={e => setFormData({ ...formData, hour: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Minute (0-59)</label>
                  <input
                    type="number" min={0} max={59}
                    value={formData.minute}
                    onChange={e => setFormData({ ...formData, minute: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(['trayA', 'trayB', 'trayC', 'trayD'] as const).map(tray => (
                  <div key={tray}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {tray.replace('tray', 'Tray ')} pills
                    </label>
                    <input
                      type="number" min={0} max={10}
                      value={formData[tray]}
                      onChange={e => setFormData({ ...formData, [tray]: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>

              {formError && (
                <p className="text-sm text-critical">{formError}</p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-medical-600 text-white rounded-lg hover:bg-medical-700 text-sm font-medium"
                >
                  {editingId ? "Update" : "Add"} Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Time</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Tray A</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Tray B</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Tray C</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Tray D</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Enabled</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!schedules ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : schedules.filter(s => s.hour >= 0).length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No schedules configured.</td></tr>
              ) : (
                schedules.filter(s => s.hour >= 0).map(s => (
                  <tr key={s.id} className={`border-b border-gray-100 ${!s.enabled ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 text-lg font-semibold text-gray-900">{padTime(s.hour, s.minute)}</td>
                    <td className="text-center px-4 py-4">
                      {s.trayA > 0 ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">{s.trayA}</span> : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="text-center px-4 py-4">
                      {s.trayB > 0 ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">{s.trayB}</span> : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="text-center px-4 py-4">
                      {s.trayC > 0 ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm font-medium">{s.trayC}</span> : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="text-center px-4 py-4">
                      {s.trayD > 0 ? <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-medium">{s.trayD}</span> : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="text-center px-4 py-4">
                      <button
                        onClick={() => handleToggle(s.id, s.enabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${s.enabled ? 'bg-safe' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.enabled ? 'translate-x-6' : ''}`} />
                      </button>
                    </td>
                    <td className="text-right px-6 py-4 space-x-2">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-sm text-medical-600 hover:text-medical-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-sm text-critical hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
