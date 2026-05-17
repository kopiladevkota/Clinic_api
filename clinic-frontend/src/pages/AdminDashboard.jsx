import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthManager";
import API, { getAppointmentStats } from "../services/api";

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  const colors = {
    blue:   { bg: "#e8f4fd", border: "#3498db", text: "#2980b9" },
    green:  { bg: "#e8f8f0", border: "#2ecc71", text: "#27ae60" },
    orange: { bg: "#fef5e7", border: "#f39c12", text: "#e67e22" },
    red:    { bg: "#fdf0ef", border: "#e74c3c", text: "#c0392b" },
    purple: { bg: "#f4f0fb", border: "#9b59b6", text: "#8e44ad" },
    gray:   { bg: "#f4f6f7", border: "#95a5a6", text: "#7f8c8d" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="col-6 col-md-4 col-lg-2">
      <div className="card border-0 shadow-sm h-100" style={{ borderLeft: `4px solid ${c.border}`, background: c.bg }}>
        <div className="card-body text-center py-3 px-2">
          <div style={{ fontSize: "1.6rem" }}>{icon}</div>
          <div className="fw-bold" style={{ fontSize: "1.8rem", color: c.text }}>{value}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:     "warning",
    approved:    "success",
    completed:   "primary",
    cancelled:   "secondary",
    rejected:    "danger",
    rescheduled: "info",
  };
  return <span className={`badge bg-${map[status] || "secondary"}`}>{status}</span>;
}

// ── Main Component ────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [stats, setStats]             = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers]             = useState([]);
  const [doctors, setDoctors]         = useState([]);
  const [patients, setPatients]       = useState([]);

  const [activeTab, setActiveTab]     = useState("overview");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm]   = useState("");
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, apptRes, usersRes, doctorsRes, patientsRes] = await Promise.all([
        getAppointmentStats(),
        API.get("clinic/appointment/"),
        API.get("users/"),
        API.get("clinic/doctors/"),
        API.get("clinic/patient/"),
      ]);
      setStats(statsRes.data);
      setAppointments(apptRes.data);
      setUsers(usersRes.data);
      setDoctors(doctorsRes.data);
      setPatients(patientsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.patch(`clinic/appointment/${id}/`, { status: newStatus });
      fetchAll();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    const matchSearch =
      a.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.patient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-0 px-4" style={{ background: "#f8f9fa", minHeight: "100vh" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center py-3 mb-3 border-bottom bg-white px-2 rounded-bottom shadow-sm">
        <div>
          <h4 className="mb-0 fw-bold">🏥 Admin Dashboard</h4>
          <small className="text-muted">Clinic Management System</small>
        </div>
        <button onClick={logout} className="btn btn-outline-danger btn-sm">Logout</button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <StatCard label="Total"      value={stats.total}     color="blue"   icon="📋" />
          <StatCard label="Today"      value={stats.today}     color="purple" icon="📅" />
          <StatCard label="Pending"    value={stats.pending}   color="orange" icon="⏳" />
          <StatCard label="Approved"   value={stats.approved}  color="green"  icon="✅" />
          <StatCard label="Completed"  value={stats.completed} color="blue"   icon="🏁" />
          <StatCard label="Cancelled"  value={stats.cancelled} color="red"    icon="❌" />
        </div>
      )}

      {/* Summary Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center py-3">
            <div style={{ fontSize: "2rem" }}>👨‍⚕️</div>
            <div className="fw-bold fs-4">{doctors.length}</div>
            <div className="text-muted">Registered Doctors</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center py-3">
            <div style={{ fontSize: "2rem" }}>🧑‍🤝‍🧑</div>
            <div className="fw-bold fs-4">{patients.length}</div>
            <div className="text-muted">Registered Patients</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center py-3">
            <div style={{ fontSize: "2rem" }}>👥</div>
            <div className="fw-bold fs-4">{users.length}</div>
            <div className="text-muted">Total Users</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {["overview", "appointments", "doctors", "patients", "users"].map((tab) => (
          <li key={tab} className="nav-item">
            <button
              className={`nav-link text-capitalize ${activeTab === tab ? "active fw-semibold" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          </li>
        ))}
      </ul>

      {/* ── Tab: Appointments ── */}
      {activeTab === "appointments" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex flex-wrap gap-2 align-items-center justify-content-between">
            <h6 className="mb-0 fw-semibold">All Appointments ({filteredAppointments.length})</h6>
            <div className="d-flex gap-2">
              <input
                className="form-control form-control-sm"
                placeholder="Search doctor / patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 200 }}
              />
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 150 }}
              >
                <option value="All">All Statuses</option>
                {["pending","approved","completed","cancelled","rejected","rescheduled"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>#</th><th>Patient</th><th>Doctor</th>
                  <th>Date</th><th>Time</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">No appointments found.</td></tr>
                ) : filteredAppointments.map((a) => (
                  <tr key={a.id}>
                    <td className="text-muted small">{a.id}</td>
                    <td>{a.patient_name}</td>
                    <td>{a.doctor_name}</td>
                    <td>{a.date}</td>
                    <td>{a.time?.slice(0,5)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.id, e.target.value)}
                        style={{ width: 140 }}
                      >
                        {["pending","approved","completed","cancelled","rejected","rescheduled"].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Doctors ── */}
      {activeTab === "doctors" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white"><h6 className="mb-0 fw-semibold">Doctors ({doctors.length})</h6></div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>#</th><th>Username</th><th>Specialization</th><th>Experience</th><th>Gender</th><th>Phone</th><th>Available</th></tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id}>
                    <td className="text-muted small">{d.id}</td>
                    <td className="fw-semibold">Dr. {d.username}</td>
                    <td>{d.specialization}</td>
                    <td>{d.experience}</td>
                    <td className="text-capitalize">{d.gender}</td>
                    <td>{d.phone || "—"}</td>
                    <td>
                      <span className={`badge bg-${d.is_available ? "success" : "secondary"}`}>
                        {d.is_available ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Patients ── */}
      {activeTab === "patients" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white"><h6 className="mb-0 fw-semibold">Patients ({patients.length})</h6></div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>#</th><th>Username</th><th>Age</th><th>Gender</th><th>Blood Group</th><th>Phone</th></tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td className="text-muted small">{p.id}</td>
                    <td className="fw-semibold">{p.username}</td>
                    <td>{p.age || "—"}</td>
                    <td className="text-capitalize">{p.gender}</td>
                    <td>{p.blood_group || "—"}</td>
                    <td>{p.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Users ── */}
      {activeTab === "users" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white"><h6 className="mb-0 fw-semibold">All Users ({users.length})</h6></div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>#</th><th>Username</th><th>Role</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="text-muted small">{u.id}</td>
                    <td>{u.username}</td>
                    <td>
                      <span className={`badge bg-${u.role === "admin" ? "danger" : u.role === "doctor" ? "primary" : "success"}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Overview ── */}
      {activeTab === "overview" && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">📊 Appointment Breakdown</div>
              <div className="card-body">
                {stats && Object.entries({
                  Pending: [stats.pending, "warning"],
                  Approved: [stats.approved, "success"],
                  Completed: [stats.completed, "primary"],
                  Cancelled: [stats.cancelled, "danger"],
                  Rejected: [stats.rejected, "secondary"],
                }).map(([label, [val, color]]) => (
                  <div key={label} className="mb-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span>{label}</span><span>{val}</span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className={`progress-bar bg-${color}`}
                        style={{ width: stats.total ? `${(val / stats.total) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">⚡ Quick Actions</div>
              <div className="card-body d-flex flex-column gap-2">
                <button className="btn btn-outline-primary" onClick={() => setActiveTab("appointments")}>
                  📋 Manage All Appointments
                </button>
                <button className="btn btn-outline-success" onClick={() => setActiveTab("doctors")}>
                  👨‍⚕️ View All Doctors
                </button>
                <button className="btn btn-outline-info" onClick={() => setActiveTab("patients")}>
                  🧑‍🤝‍🧑 View All Patients
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setActiveTab("users")}>
                  👥 Manage Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
