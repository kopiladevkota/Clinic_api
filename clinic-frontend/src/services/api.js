import axios from "axios";

const API = axios.create({
  baseURL: "/api/",
});

// Attach JWT token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auto-logout on expired token
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.data?.code === "token_not_valid") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;

// ── Auth / Profile ──────────────────────────────────────────
export const registerUser   = (data) => API.post("register/", data);
export const getMyProfile   = ()     => API.get("profile/");
export const updateMyProfile = (data) => API.put("profile/", data);

// ── Doctors ──────────────────────────────────────────────────
export const getDoctors      = ()      => API.get("clinic/doctors/");
export const getDoctorById   = (id)    => API.get(`clinic/doctors/${id}/`);
export const updateDoctor    = (id, data) => API.put(`clinic/doctors/${id}/`, data);

// ── Patients ─────────────────────────────────────────────────
export const getPatients     = ()      => API.get("clinic/patient/");
export const getPatientById  = (id)    => API.get(`clinic/patient/${id}/`);

// ── Appointments ─────────────────────────────────────────────
export const getAppointments    = ()           => API.get("clinic/appointment/");
export const bookAppointment    = (data)       => API.post("clinic/appointment/", data);
export const updateAppointment  = (id, data)   => API.patch(`clinic/appointment/${id}/`, data);
export const deleteAppointment  = (id)         => API.delete(`clinic/appointment/${id}/`);

// ── Appointment Stats ─────────────────────────────────────────
export const getAppointmentStats = () => API.get("clinic/appointment/stats/");

// ── Doctor Availability ───────────────────────────────────────
export const getMyAvailability    = ()        => API.get("clinic/availability/");
export const saveAvailability     = (data)    => API.post("clinic/availability/", data);
export const updateAvailability   = (id, data) => API.put(`clinic/availability/${id}/`, data);
export const deleteAvailability   = (id)      => API.delete(`clinic/availability/${id}/`);

// ── Slot-based Booking ─────────────────────────────────────────
export const getAvailableSlots = (doctorId, date) =>
  API.get(`clinic/available-slots/?doctor=${doctorId}&date=${date}`);
