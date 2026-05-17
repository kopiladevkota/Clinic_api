import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { getAvailableSlots } from "../../services/api";

function BookAppointment() {
  const [doctors, setDoctors]     = useState([]);
  const [slots, setSlots]         = useState([]);
  const [slotInfo, setSlotInfo]   = useState(null);   // { day, start, end }
  const [slotsMsg, setSlotsMsg]   = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [message, setMessage]     = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    doctor: "",
    date: "",
    time: "",
    description: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    API.get("clinic/doctors/")
      .then((res) => setDoctors(res.data))
      .catch(console.error);
  }, []);

  // Fetch available slots whenever doctor OR date changes
  useEffect(() => {
    if (formData.doctor && formData.date) {
      fetchSlots(formData.doctor, formData.date);
    } else {
      setSlots([]);
      setSlotInfo(null);
      setSlotsMsg("");
    }
    // Reset selected time if doctor/date changed
    setFormData((prev) => ({ ...prev, time: "" }));
  }, [formData.doctor, formData.date]);

  const fetchSlots = async (doctorId, date) => {
    setLoadingSlots(true);
    setSlots([]);
    setSlotInfo(null);
    setSlotsMsg("");
    try {
      const res = await getAvailableSlots(doctorId, date);
      setSlots(res.data.slots || []);
      setSlotInfo(res.data.availability || null);
      if (res.data.slots?.length === 0) {
        setSlotsMsg(res.data.message || "No available slots for this day.");
      }
    } catch (err) {
      setSlotsMsg("Could not load slots. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const showMsg = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.time) {
      showMsg("Please select a time slot.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await API.post("clinic/appointment/", { ...formData });
      showMsg("Appointment booked successfully!", "success");
      setFormData({ doctor: "", date: "", time: "", description: "" });
      setTimeout(() => navigate("/dashboard/patient"), 1500);
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to book appointment.", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  // Today's date as min value (can't book in the past)
  const today = new Date().toISOString().split("T")[0];

  const selectedDoctor = doctors.find((d) => String(d.id) === String(formData.doctor));

  return (
    <div className="container mt-5" style={{ maxWidth: 760 }}>
      <button className="btn btn-outline-secondary btn-sm mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0">📅 Book New Appointment</h5>
        </div>
        <div className="card-body">
          {message.text && (
            <div className={`alert alert-${message.type} py-2`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Doctor + Date */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">1. Choose Doctor</label>
                <select
                  name="doctor"
                  className="form-select"
                  value={formData.doctor}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id} disabled={!doc.is_available}>
                      Dr. {doc.username} — {doc.specialization}
                      {!doc.is_available ? " (Unavailable)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">2. Choose Date</label>
                <input
                  type="date"
                  name="date"
                  className="form-control"
                  value={formData.date}
                  onChange={handleChange}
                  min={today}
                  required
                />
              </div>
            </div>

            {/* Step 2: Available Slots */}
            <div className="mb-3">
              <label className="form-label fw-semibold">3. Select Available Time Slot</label>

              {/* Doctor's availability info */}
              {slotInfo && (
                <div className="alert alert-info py-2 small mb-2">
                  Dr. {selectedDoctor?.username} is available on {slotInfo.day}s from{" "}
                  <strong>{slotInfo.start}</strong> to <strong>{slotInfo.end}</strong>
                </div>
              )}

              {loadingSlots && (
                <div className="text-muted small">
                  <span className="spinner-border spinner-border-sm me-2" /> Loading available slots...
                </div>
              )}

              {!loadingSlots && !formData.doctor && !formData.date && (
                <div className="text-muted small border rounded p-3 bg-light">
                  Select a doctor and date to see available time slots.
                </div>
              )}

              {!loadingSlots && slotsMsg && (
                <div className="alert alert-warning py-2 small">{slotsMsg}</div>
              )}

              {!loadingSlots && slots.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`btn btn-sm ${
                        formData.time === slot
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => setFormData((prev) => ({ ...prev, time: slot }))}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}

              {formData.time && (
                <div className="mt-2">
                  <span className="badge bg-success">
                    ✅ Selected: {formData.time}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-3">
              <label className="form-label fw-semibold">4. Describe your symptoms (optional)</label>
              <textarea
                name="description"
                className="form-control"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                placeholder="Briefly describe your concern..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary px-4"
              disabled={submitting || !formData.time}
            >
              {submitting ? "Booking..." : "Confirm Appointment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;
