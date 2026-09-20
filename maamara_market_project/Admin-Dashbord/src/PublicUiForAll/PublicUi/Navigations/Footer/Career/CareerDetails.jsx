import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Briefcase, CalendarDays, MapPin, Clock3, Upload, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import api from "../../../../../Services/Api";

const CareerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cover_letter: "", cv: null });

  useEffect(() => {
    api.get(`/api/opening/${id}/`)
      .then((response) => setJob(response.data))
      .catch((error) => {
        console.error("Failed to load vacancy:", error);
        setMessage("This vacancy could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.cv) {
      setMessage("Please complete your name, email, phone number and CV.");
      return;
    }
    const payload = new FormData();
    payload.append("vacancy", job.id);
    payload.append("full_name", form.full_name.trim());
    payload.append("email", form.email.trim());
    payload.append("phone", form.phone.trim());
    payload.append("cover_letter", form.cover_letter.trim());
    payload.append("cv", form.cv);
    try {
      setSubmitting(true);
      await api.post("/api/careers/apply/", payload, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage("Application submitted successfully.");
      setForm({ full_name: "", email: "", phone: "", cover_letter: "", cv: null });
      setTimeout(() => setFormOpen(false), 900);
    } catch (error) {
      console.error("Application submission failed:", error);
      setMessage(error.response?.data?.detail || "Application could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="mm-careers-page"><div className="mm-careers-container mm-careers-empty">Loading vacancy…</div></main>;
  if (!job) return <main className="mm-careers-page"><div className="mm-careers-container mm-careers-empty"><h2>Vacancy not found</h2><button className="mm-careers-primary" onClick={() => navigate("/careers/jobs")}>Back to careers</button></div></main>;

  return (
    <main className="mm-careers-page">
      <section className="mm-careers-detail-hero">
        <div className="mm-careers-container">
          <button type="button" className="mm-careers-back" onClick={() => navigate("/careers/jobs")}><ArrowLeft size={16} /> All careers</button>
          <span className="mm-careers-eyebrow">Open position</span>
          <h1>{job.title}</h1>
          <div className="mm-careers-meta mm-careers-detail-meta">
            <span><MapPin size={15} />{job.location}</span>
            <span><Briefcase size={15} />{String(job.department || "").replaceAll("_", " ")}</span>
            <span><Clock3 size={15} />{String(job.employment_type || "").replaceAll("_", " ")}</span>
          </div>
        </div>
      </section>

      <section className="mm-careers-container mm-careers-detail-layout">
        <div className="mm-careers-detail-main">
          <article className="mm-careers-content-card">
            <span>Role overview</span>
            <h2>Job description</h2>
            <div className="mm-careers-richtext" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description || "") }} />
          </article>
          {job.responsibilities && (
            <article className="mm-careers-content-card">
              <span>What you’ll do</span>
              <h2>Responsibilities</h2>
              <div className="mm-careers-richtext" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.responsibilities) }} />
            </article>
          )}
          {job.requirements && (
            <article className="mm-careers-content-card">
              <span>What you bring</span>
              <h2>Requirements</h2>
              <div className="mm-careers-richtext" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.requirements) }} />
            </article>
          )}
        </div>

        <aside className="mm-careers-summary-card">
          <span>Position summary</span>
          <h2>{job.title}</h2>
          <dl>
            <div><dt>Department</dt><dd>{job.department}</dd></div>
            <div><dt>Location</dt><dd>{job.location}</dd></div>
            <div><dt>Employment</dt><dd>{String(job.employment_type || "").replaceAll("_", " ")}</dd></div>
            {job.salary && <div><dt>Salary</dt><dd>{job.salary}</dd></div>}
            {job.application_deadline && <div><dt>Deadline</dt><dd><CalendarDays size={15} />{job.application_deadline}</dd></div>}
          </dl>
          <button type="button" className="mm-careers-primary mm-careers-wide-button" onClick={() => setFormOpen(true)}>Apply for this role</button>
        </aside>
      </section>

      {formOpen && (
        <div className="mm-careers-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFormOpen(false)}>
          <section className="mm-careers-modal" role="dialog" aria-modal="true" aria-labelledby="career-detail-application">
            <button className="mm-careers-modal-close" type="button" onClick={() => setFormOpen(false)} aria-label="Close"><X size={19} /></button>
            <span className="mm-careers-eyebrow">Job application</span>
            <h2 id="career-detail-application">Apply for {job.title}</h2>
            <form onSubmit={submitApplication} className="mm-careers-form">
              <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
              <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
              <label>Cover letter<textarea rows="5" value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} /></label>
              <div className="mm-careers-upload">
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { setMessage("CV must be smaller than 5 MB."); return; }
                  setForm({ ...form, cv: file }); setMessage("");
                }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={16} />{form.cv ? "Change CV" : "Upload CV"}</button>
                {form.cv && <span>{form.cv.name}</span>}
              </div>
              {message && <div className="mm-careers-alert">{message}</div>}
              <div className="mm-careers-form-actions">
                <button type="button" className="mm-careers-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
                <button className="mm-careers-primary" disabled={submitting} type="submit">{submitting ? "Submitting…" : "Submit application"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default CareerDetails;
