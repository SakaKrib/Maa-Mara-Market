import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Check, Edit3, Eye, Plus, Trash2, Users, X } from "lucide-react";
import api from "../../../../Services/Api";
import RichTextEditor from "../../../../cmponents/RichTextEditor/RichTextEdit";
import NativeAwareSelect from "../../../../components/NativeAwareSelect";
import AppSnackbar from "../../../../../components/ui/app-snackbar";
import DatePicker from "../../../../../components/ui/date-picker";

const emptyForm = {
  title: "", department: "", location: "", employment_type: "full_time",
  description: "", requirements: "", responsibilities: "", salary: "",
  application_deadline: "", is_active: true,
};

const AdminPostCareer = ({ open = true, onClose }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState("jobs");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingJob, setDeletingJob] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const showSnackbar = (message) => setSnackbar({ open: true, message });

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
      showSnackbar("Job saved successfully.");
      await loadJobs();
      setTab("jobs");
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.detail || "Could not save the job.");
      showSnackbar(error.response?.data?.detail || "Could not save the job.");
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

  const deleteJob = (id) => {
    const job = jobs.find((item) => String(item.id) === String(id));
    setDeleteConfirmation(job || { id, title: "this job posting" });
  };

  const confirmDeleteJob = async () => {
    if (!deleteConfirmation || deletingJob) return;
    setDeletingJob(true);
    try {
      await api.delete(`/api/careers/${deleteConfirmation.id}/`);
      setDeleteConfirmation(null);
      await loadJobs();
      setMessage("Job deleted.");
      showSnackbar("Job deleted.");
    } catch (error) {
      console.error(error);
      setMessage("Could not delete the job.");
      showSnackbar("Could not delete the job.");
    } finally {
      setDeletingJob(false);
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
    <div className="fixed inset-x-0 z-[80] overflow-y-auto bg-background/80 p-2 backdrop-blur-sm sm:p-4" style={{ top: "calc(72px + env(safe-area-inset-top, 0px))", bottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}>
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : navigate("/admin-dashboard"))}
          aria-label="Close careers"
          className="absolute right-3 top-3 z-10 rounded-xl p-2 text-muted-foreground hover:bg-muted"
        >
          <X size={18} />
        </button>
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

      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />

      {deleteConfirmation && <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingJob) setDeleteConfirmation(null); }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-job-title" aria-describedby="delete-job-description" className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-card-foreground shadow-2xl sm:rounded-2xl sm:p-6">
          <div className="mb-4 flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><Trash2 size={20} /></span><div className="min-w-0 flex-1"><h2 id="delete-job-title" className="text-lg font-bold">Delete this position?</h2><p className="mt-1 break-words text-sm text-muted-foreground">{deleteConfirmation.title || "Selected job posting"}</p></div><button type="button" aria-label="Close delete confirmation" disabled={deletingJob} onClick={() => setDeleteConfirmation(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"><X size={19} /></button></div>
          <p id="delete-job-description" className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6">This job posting will be removed from careers. This action cannot be undone.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={deletingJob} onClick={() => setDeleteConfirmation(null)} className="min-h-11 rounded-[20px] border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50">Keep position</button><button type="button" disabled={deletingJob} onClick={confirmDeleteJob} className="min-h-11 rounded-[20px] bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-50">{deletingJob ? "Deleting…" : "Delete position"}</button></div>
        </section>
      </div>}

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
            <label>Employment type<NativeAwareSelect
              value={form.employment_type}
              onChange={(event) => setForm({ ...form, employment_type: event.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              options={[
                { value: "full_time", label: "Full time" },
                { value: "part_time", label: "Part time" },
                { value: "contract", label: "Contract" },
                { value: "internship", label: "Internship" },
                { value: "remote", label: "Remote" },
              ]}
            /></label>
            <div>
              <span>Application deadline</span>
              <DatePicker
                name="application_deadline"
                value={form.application_deadline || ""}
                onChange={(e) => setForm({ ...form, application_deadline: e.target.value })}
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 3}
                placeholder="Select deadline"
                label="Choose application deadline"
                clearable
              />
            </div>
          </div>
          <div>
            <span className="mm-admin-editor-label">Description</span>
            <RichTextEditor
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
              placeholder="Describe the role, team, and what the successful candidate will be doing."
            />
          </div>
          <div>
            <span className="mm-admin-editor-label">Requirements</span>
            <RichTextEditor
              value={form.requirements}
              onChange={(value) => setForm({ ...form, requirements: value })}
              placeholder="List the skills, experience, qualifications, or capabilities required."
            />
          </div>
          <div>
            <span className="mm-admin-editor-label">Responsibilities</span>
            <RichTextEditor
              value={form.responsibilities}
              onChange={(value) => setForm({ ...form, responsibilities: value })}
              placeholder="Describe the key responsibilities and day-to-day expectations."
            />
          </div>
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
