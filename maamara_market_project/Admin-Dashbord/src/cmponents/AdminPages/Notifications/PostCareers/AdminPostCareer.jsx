import { useEffect, useState } from "react";
import { Briefcase, Check, Edit3, Eye, Plus, Trash2, Users, X } from "lucide-react";
import api from "../../../../Services/Api";
import RichTextEditor from "../../../../cmponents/RichTextEditor/RichTextEdit";

const emptyForm = {
  title: "", department: "", location: "", employment_type: "full_time",
  description: "", requirements: "", responsibilities: "", salary: "",
  application_deadline: "", is_active: true,
};

const AdminPostCareer = ({ open = true, onClose }) => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState("jobs");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadJobs = () => api.get("/api/careers/").then((r) => setJobs(r.data || []));
  const loadApplications = () => api.get("/api/applications/").then((r) => setApplications(r.data || []));

  useEffect(() => {
    Promise.all([loadJobs(), loadApplications()]).catch((error) => {
      console.error("Failed to load recruitment data:", error);
      setMessage("Recruitment data could not be loaded.");
    });
  }, []);

  const saveJob = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, application_deadline: form.application_deadline || null };
      if (editingId) await api.patch(`/api/careers/${editingId}/`, payload);
      else await api.post("/api/careers/", payload);
      setForm(emptyForm);
      setEditingId(null);
      setMessage("Job saved successfully.");
      await loadJobs();
      setTab("jobs");
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.detail || "Could not save the job.");
    } finally {
      setSaving(false);
    }
  };

  const editJob = (job) => {
    setEditingId(job.id);
    setForm({
      ...emptyForm,
      ...job,
      application_deadline: job.application_deadline || "",
    });
    setTab("editor");
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Delete this job posting?")) return;
    try {
      await api.delete(`/api/careers/${id}/`);
      await loadJobs();
      setMessage("Job deleted.");
    } catch (error) {
      console.error(error);
      setMessage("Could not delete the job.");
    }
  };

  const markSeen = async (application) => {
    try {
      await api.patch(`/api/applications/${application.id}/seen/`);
      setApplications((items) => items.map((item) => item.id === application.id ? { ...item, seen: true } : item));
      setSelectedApplication({ ...application, seen: true });
    } catch (error) {
      console.error(error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[80] overflow-y-auto bg-background/80 p-2 backdrop-blur-sm sm:top-16 sm:p-4">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close careers" className="absolute right-3 top-3 z-10 rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <X size={18} />
          </button>
        )}
        <main className="mm-admin-careers">
      <div className="mm-admin-careers-header">
        <div>
          <span>Recruitment</span>
          <h1>Careers</h1>
          <p>Manage open positions and review submitted applications.</p>
        </div>
        <button className="mm-careers-primary" onClick={() => { setForm(emptyForm); setEditingId(null); setTab("editor"); }}>
          <Plus size={16} /> New position
        </button>
      </div>

      <div className="mm-admin-careers-tabs">
        <button className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}><Briefcase size={16}/> Positions</button>
        <button className={tab === "applications" ? "active" : ""} onClick={() => setTab("applications")}><Users size={16}/> Applications {applications.filter((a) => !a.seen).length ? `(${applications.filter((a) => !a.seen).length})` : ""}</button>
        <button className={tab === "editor" ? "active" : ""} onClick={() => setTab("editor")}><Edit3 size={16}/> {editingId ? "Edit position" : "Create position"}</button>
      </div>

      {message && <div className="mm-careers-alert">{message}</div>}

      {tab === "jobs" && (
        <div className="mm-admin-career-list">
          {jobs.map((job) => (
            <article key={job.id} className="mm-admin-career-row">
              <div>
                <span className={job.is_active ? "mm-admin-status active" : "mm-admin-status"}>{job.is_active ? "Active" : "Inactive"}</span>
                <h2>{job.title}</h2>
                <p>{job.department} · {job.location} · {String(job.employment_type).replaceAll("_", " ")}</p>
              </div>
              <div className="mm-admin-career-actions">
                <button onClick={() => editJob(job)}><Edit3 size={15}/> Edit</button>
                <button onClick={() => deleteJob(job.id)}><Trash2 size={15}/> Delete</button>
              </div>
            </article>
          ))}
          {!jobs.length && <div className="mm-careers-empty"><Briefcase size={32}/><h3>No positions yet</h3></div>}
        </div>
      )}

      {tab === "applications" && (
        <div className="mm-admin-applications">
          <div className="mm-admin-application-list">
            {applications.map((application) => (
              <button key={application.id} className={!application.seen ? "unseen" : ""} onClick={() => markSeen(application)}>
                <strong>{application.full_name}</strong>
                <span>{application.vacancy_title}</span>
                <small>{application.email}</small>
              </button>
            ))}
            {!applications.length && <div className="mm-careers-empty"><Users size={32}/><h3>No applications yet</h3></div>}
          </div>
          <div className="mm-admin-application-detail">
            {selectedApplication ? (
              <>
                <div className="mm-admin-detail-top"><div><span>Applicant</span><h2>{selectedApplication.full_name}</h2></div><Check size={18}/></div>
                <p><strong>Email:</strong> {selectedApplication.email}</p>
                <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                <p><strong>Position:</strong> {selectedApplication.vacancy_title}</p>
                <h3>Cover letter</h3>
                <p className="mm-admin-cover-letter">{selectedApplication.cover_letter || "No cover letter supplied."}</p>
                {selectedApplication.cv && <a href={selectedApplication.cv} target="_blank" rel="noreferrer" className="mm-careers-primary">View CV</a>}
              </>
            ) : <div className="mm-careers-empty"><Eye size={32}/><h3>Select an application</h3></div>}
          </div>
        </div>
      )}

      {tab === "editor" && (
        <form className="mm-admin-career-editor" onSubmit={saveJob}>
          <div className="mm-admin-form-grid">
            {[
              ["title","Job title"],["department","Department"],["location","Location"],["salary","Salary"],
            ].map(([key,label]) => (
              <label key={key}>{label}<input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key !== "salary"} /></label>
            ))}
            <label>Employment type<select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
              <option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="remote">Remote</option>
            </select></label>
            <label>Application deadline<input type="date" value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} /></label>
          </div>
          <label>Description<textarea rows="6" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
          <div><span className="mm-admin-editor-label">Requirements</span><RichTextEditor value={form.requirements} onChange={(value) => setForm({ ...form, requirements: value })}/></div>
          <div><span className="mm-admin-editor-label">Responsibilities</span><RichTextEditor value={form.responsibilities} onChange={(value) => setForm({ ...form, responsibilities: value })}/></div>
          <label className="mm-admin-checkbox"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}/><span>Publish this position</span></label>
          <div className="mm-careers-form-actions">
            <button type="button" className="mm-careers-secondary" onClick={() => { setForm(emptyForm); setEditingId(null); setTab("jobs"); }}>Cancel</button>
            <button className="mm-careers-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Update position" : "Publish position"}</button>
          </div>
        </form>
      )}
        </main>
      </div>
    </div>
  );
};

export default AdminPostCareer;
