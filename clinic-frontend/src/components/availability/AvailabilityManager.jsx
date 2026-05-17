import { useEffect, useState } from "react";
import { getMyAvailability, saveAvailability, deleteAvailability } from "../../services/api";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function AvailabilityManager() {
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null); // day being saved
  const [message, setMessage] = useState({ text: "", type: "" });

  // Local form state: { monday: { start: "09:00", end: "17:00", is_available: true }, ... }
  const [form, setForm] = useState(() =>
    Object.fromEntries(DAYS.map((d) => [d, { start: "", end: "", is_available: true }]))
  );

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await getMyAvailability();
      setSlots(res.data);
      // Prefill form from existing data
      const prefilled = Object.fromEntries(
        DAYS.map((d) => [d, { start: "", end: "", is_available: true }])
      );
      res.data.forEach((slot) => {
        prefilled[slot.day] = {
          start: slot.start_time?.slice(0, 5) || "",
          end:   slot.end_time?.slice(0, 5) || "",
          is_available: slot.is_available,
          id: slot.id,
        };
      });
      setForm(prefilled);
    } catch (err) {
      console.error("Failed to load availability", err);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const handleSaveDay = async (day) => {
    const { start, end, is_available } = form[day];
    if (!start || !end) {
      showMsg(`Please set both start and end time for ${day}.`, "warning");
      return;
    }
    if (start >= end) {
      showMsg("End time must be after start time.", "warning");
      return;
    }
    setSaving(day);
    try {
      await saveAvailability({
        day,
        start_time: start,
        end_time: end,
        is_available,
      });
      showMsg(`${day.charAt(0).toUpperCase() + day.slice(1)} availability saved!`, "success");
      fetchSlots();
    } catch (err) {
      showMsg("Failed to save. Please try again.", "danger");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteDay = async (day) => {
    const slot = slots.find((s) => s.day === day);
    if (!slot) return;
    if (!window.confirm(`Remove availability for ${day}?`)) return;
    try {
      await deleteAvailability(slot.id);
      showMsg(`${day} availability removed.`, "info");
      fetchSlots();
    } catch (err) {
      showMsg("Failed to delete.", "danger");
    }
  };

  const handleChange = (day, field, value) => {
    setForm((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const isConfigured = (day) => slots.some((s) => s.day === day);

  if (loading) return <div className="text-muted small">Loading availability...</div>;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white">
        <h6 className="mb-0 fw-semibold">🗓️ My Weekly Availability</h6>
        <small className="text-muted">Set your working hours for each day. Patients will only see these time slots.</small>
      </div>
      <div className="card-body">
        {message.text && (
          <div className={`alert alert-${message.type} py-2 small`}>{message.text}</div>
        )}

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 120 }}>Day</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => {
                const f = form[day];
                const configured = isConfigured(day);
                return (
                  <tr key={day}>
                    <td className="fw-semibold text-capitalize">{day}</td>
                    <td>
                      <input
                        type="time"
                        className="form-control form-control-sm"
                        value={f.start}
                        onChange={(e) => handleChange(day, "start", e.target.value)}
                        style={{ width: 130 }}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form-control form-control-sm"
                        value={f.end}
                        onChange={(e) => handleChange(day, "end", e.target.value)}
                        style={{ width: 130 }}
                      />
                    </td>
                    <td>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={f.is_available}
                          onChange={(e) => handleChange(day, "is_available", e.target.checked)}
                        />
                      </div>
                    </td>
                    <td>
                      {configured ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">Configured</span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary border">Not set</span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSaveDay(day)}
                          disabled={saving === day}
                        >
                          {saving === day ? "Saving..." : "Save"}
                        </button>
                        {configured && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteDay(day)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityManager;
