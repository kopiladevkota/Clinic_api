import { useEffect, useState } from "react";
import API, { getAppointmentStats } from "../services/api";
import { Link } from "react-router-dom";
import AppointmentTable from "../components/appointments/AppointmentTable";
import { useAuth } from "../components/AuthManager";

function StatCard({ label, value, color, icon }) {
  const colors = {
    blue:   { bg: "#e8f4fd", border: "#3498db", text: "#2980b9" },
    green:  { bg: "#e8f8f0", border: "#2ecc71", text: "#27ae60" },
    orange: { bg: "#fef5e7", border: "#f39c12", text: "#e67e22" },
    red:    { bg: "#fdf0ef", border: "#e74c3c", text: "#c0392b" },
    purple: { bg: "#f4f0fb", border: "#9b59b6", text: "#8e44ad" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="col-6 col-md-4 col-lg-2">
      <div className="card border-0 shadow-sm h-100" style={{ borderLeft: `4px solid ${c.border}`, background: c.bg }}>
        <div className="card-body text-center py-3 px-2">
          <div style={{ fontSize: "1.4rem" }}>{icon}</div>
          <div className="fw-bold" style={{ fontSize: "1.6rem", color: c.text }}>{value ?? "—"}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </div>
  );
}

function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile]           = useState(null);
  const [stats, setStats]               = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
    fetchStats();
  }, []);

  const fetchProfile = () => {
    API.get("profile/").then((res) => setProfile(res.data)).catch(console.error);
  };

  const fetchAppointments = () => {
    API.get("clinic/appointment/").then((res) => setAppointments(res.data)).catch(console.error);
  };

  const fetchStats = () => {
    getAppointmentStats().then((res) => setStats(res.data)).catch(console.error);
  };

  const handleUpdate = (id, data) => {
    API.patch(`clinic/appointment/${id}/`, data)
      .then(() => { fetchAppointments(); fetchStats(); })
      .catch(console.error);
  };

  const handleCancel = (id) => {
    API.patch(`clinic/appointment/${id}/`, { status: "cancelled" })
      .then(() => { fetchAppointments(); fetchStats(); })
      .catch(console.error);
  };

  return (
    <div className="container-fluid px-4" style={{ background: "#f8f9fa", minHeight: "100vh" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center py-3 mb-3 border-bottom bg-white px-2 rounded-bottom shadow-sm">
        <div>
          <h4 className="mb-0 fw-bold">🧑‍⚕️ Patient Dashboard</h4>
          {profile && <small className="text-muted">Welcome back, {profile.username}!</small>}
        </div>
        <div className="d-flex gap-2">
          <Link to="/book-appointment" className="btn btn-primary btn-sm">+ Book Appointment</Link>
          <Link to="/profile" className="btn btn-outline-secondary btn-sm">Edit Profile</Link>
          <button onClick={logout} className="btn btn-outline-danger btn-sm">Logout</button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <StatCard label="Total"     value={stats.total}     color="blue"   icon="📋" />
          <StatCard label="Today"     value={stats.today}     color="purple" icon="📅" />
          <StatCard label="Pending"   value={stats.pending}   color="orange" icon="⏳" />
          <StatCard label="Approved"  value={stats.approved}  color="green"  icon="✅" />
          <StatCard label="Completed" value={stats.completed} color="blue"   icon="🏁" />
          <StatCard label="Cancelled" value={stats.cancelled} color="red"    icon="❌" />
        </div>
      )}

      {/* Appointment History */}
      <h6 className="fw-semibold mb-2">My Appointment History</h6>
      <AppointmentTable
        appointments={appointments}
        onUpdate={handleUpdate}
        onCancel={handleCancel}
        role="patient"
      />
    </div>
  );
}

export default PatientDashboard;
