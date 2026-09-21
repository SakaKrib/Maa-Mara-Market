import React, { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, MapPin, Clock3, Search, Users, Globe2, HeartHandshake, ArrowRight, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";

const initialForm = { full_name: "", email: "", phone: "", cover_letter: "", cv: null };

const CareerPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/careers/"),
      api.get("/api/careers/stats/"),
    ])
      .then(([jobsResponse, statsResponse]) => {
        setJobs(jobsResponse.data || []);
        setStats(statsResponse.data || null);
      })
      .catch((error) => {
        console.error("Failed to load careers:", error);
        setMessage("Unable to load career opportunities.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) =>
      [job.title, job.department, job.location, job.employment_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [jobs, search]);

  const openApplication = (job) => {
    setSelectedJob(job);
    setForm(initialForm);
    setMessage("");
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!selectedJob) return;

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.cv) {
      setMessage("Please complete your name, email, phone number and CV.");
      return;
    }

    const payload = new FormData();
    payload.append("vacancy", selectedJob.id);
    payload.append("full_name", form.full_name.trim());
    payload.append("email", form.email.trim());
    payload.append("phone", form.phone.trim());
    payload.append("cover_letter", form.cover_letter.trim());
    payload.append("cv", form.cv);

    try {
      setSubmitting(true);
      await api.post("/api/careers/apply/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Application submitted successfully.");
      setForm(initialForm);
      setTimeout(() => setSelectedJob(null), 900);
    } catch (error) {
      console.error("Application submission failed:", error);
      setMessage(error.response?.data?.detail || "Application could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mm-careers-page">
      <section className="mm-careers-hero">
        <div className="mm-careers-container">
          <div className="mm-careers-hero-copy">
            <span className="mm-careers-eyebrow">Careers at Maa Mara Market</span>
            <h1>Build the future of African commerce.</h1>
            <p>
              Join a growing marketplace connecting customers, artisans, vendors and
              businesses across Africa.
            </p>
            <a className="mm-careers-hero-button" href="#open-positions">
              Explore open roles <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </section>

      <section className="mm-careers-container mm-careers-stats" aria-label="Maa Mara Market impact">
        {[
          [stats?.vendors_supported, "Vendors supported"],
          [stats?.team_members, "Team members"],
          [stats?.customers_reached, "Customers reached"],
          [stats?.region || "East Africa", "Growing presence"],
        ].map(([value, label]) => (
          <div className="mm-careers-stat" key={label}>
            <strong>{value ?? "—"}{typeof value === "number" ? "+" : ""}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="mm-careers-container mm-careers-values">
        <div className="mm-careers-section-heading">
          <span>Why Maa Mara</span>
          <h2>Work that has a real-world impact.</h2>
          <p>Bring your skills to a team building useful commerce infrastructure and meaningful opportunities.</p>
        </div>
        <div className="mm-careers-value-grid">
          {[
            [Users, "Collaborative culture", "Work alongside people who care about craft, customers and continuous improvement."],
            [Globe2, "Regional impact", "Help African entrepreneurs and local businesses reach more customers."],
            [HeartHandshake, "Meaningful work", "Build products and experiences that support livelihoods and everyday commerce."],
          ].map(([Icon, title, text]) => (
            <article className="mm-careers-value-card" key={title}>
              <span className="mm-careers-icon"><Icon size={21} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="open-positions" className="mm-careers-container mm-careers-jobs">
        <div className="mm-careers-jobs-heading">
          <div>
            <span>Opportunities</span>
            <h2>Open positions</h2>
            <p>Find a role where your experience can make a difference.</p>
          </div>
          <label className="mm-careers-search">
            <Search size={18} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs"
              aria-label="Search jobs"
            />
          </label>
        </div>

        {message && !selectedJob && <div className="mm-careers-alert">{message}</div>}

        {loading ? (
          <div className="mm-careers-empty">Loading current opportunities…</div>
        ) : filteredJobs.length === 0 ? (
          <div className="mm-careers-empty">
            <Briefcase size={34} />
            <h3>No open positions</h3>
            <p>There are no matching roles right now. Check back soon.</p>
          </div>
        ) : (
          <div className="mm-careers-job-grid">
            {filteredJobs.map((job) => (
              <article className="mm-careers-job-card" key={job.id}>
                <div className="mm-careers-job-topline">
                  <span>{job.department || "Maa Mara Market"}</span>
                  {job.application_deadline && <small>Deadline {job.application_deadline}</small>}
                </div>
                <h3>{job.title}</h3>
                <div className="mm-careers-meta">
                  <span><MapPin size={15} />{job.location}</span>
                  <span><Briefcase size={15} />{String(job.employment_type || "").replaceAll("_", " ")}</span>
                  {job.salary && <span>{job.salary}</span>}
                </div>
                <p className="mm-careers-description">{job.description}</p>
                <div className="mm-careers-job-actions">
                  <button type="button" className="mm-careers-secondary" onClick={() => navigate(`/careers/${job.id}`)}>
                    View details
                  </button>
                  <button type="button" className="mm-careers-primary" onClick={() => openApplication(job)}>
                    Apply now <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedJob && (
        <div className="mm-careers-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedJob(null)}>
          <section className="mm-careers-modal" role="dialog" aria-modal="true" aria-labelledby="career-application-title">
            <button className="mm-careers-modal-close" type="button" onClick={() => setSelectedJob(null)} aria-label="Close">
              <X size={19} />
            </button>
            <span className="mm-careers-eyebrow">Job application</span>
            <h2 id="career-application-title">Apply for {selectedJob.title}</h2>
            <p className="mm-careers-modal-subtitle">Your CV should be PDF, DOC or DOCX and no larger than 5 MB.</p>

            <form onSubmit={submitApplication} className="mm-careers-form">
              <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
              <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
              <label>Cover letter<textarea rows="5" value={form.cover_letter} onChange={(e) => setForm({ ...form, cover_letter: e.target.value })} /></label>

              <div className="mm-careers-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setMessage("CV must be smaller than 5 MB.");
                      return;
                    }
                    setForm({ ...form, cv: file });
                    setMessage("");
                  }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={16} />{form.cv ? "Change CV" : "Upload CV"}</button>
                {form.cv && <span>{form.cv.name}</span>}
              </div>

              {message && <div className="mm-careers-alert">{message}</div>}

              <div className="mm-careers-form-actions">
                <button type="button" className="mm-careers-secondary" onClick={() => setSelectedJob(null)}>Cancel</button>
                <button className="mm-careers-primary" disabled={submitting} type="submit">
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default CareerPage;
