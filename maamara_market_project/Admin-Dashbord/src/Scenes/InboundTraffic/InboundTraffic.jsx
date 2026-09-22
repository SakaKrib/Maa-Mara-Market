import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import api from "../../Services/Api";

const emptyData = {
  summary: { page_views: 0, unique_visitors: 0, sessions: 0, countries: 0, pages: 0, events: 0 },
  trend: [],
  pages: [],
  countries: [],
  sources: [],
  devices: [],
  goals: [],
  recent_sessions: [],
};

const Stat = ({ label, value, detail }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold tracking-tight text-card-foreground">{Number(value || 0).toLocaleString()}</p>
    {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
  </div>
);

const InboundTraffic = () => {
  const [data, setData] = useState(emptyData);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get(`/api/admin/inbound-traffic/?days=${days}`);
        if (active) setData({ ...emptyData, ...(response.data || {}) });
      } catch (error) {
        console.error("Inbound traffic analytics load failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [days]);

  const trendData = [{
    id: "Page views",
    data: (data.trend || []).map((row) => ({ x: row.date, y: Number(row.page_views || 0) })),
  }];

  const countryData = (data.countries || []).slice(0, 10).map((row) => ({
    country: row.country_code || "Unknown",
    visits: Number(row.count || 0),
  }));

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to="/admin-dashboard" className="text-xs font-semibold text-primary hover:underline">← Dashboard</Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">Customer intelligence</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-card-foreground sm:text-3xl">Inbound traffic</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Understand where visitors come from, which pages they use, and how far they progress through the storefront.
          </p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Page views" value={data.summary.page_views} />
        <Stat label="Unique visitors" value={data.summary.unique_visitors} />
        <Stat label="Sessions" value={data.summary.sessions} />
        <Stat label="Countries" value={data.summary.countries} />
        <Stat label="Pages visited" value={data.summary.pages} />
        <Stat label="Tracked events" value={data.summary.events} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traffic trend</p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground">Pages viewed over time</h2>
          </div>
          <div className="h-[320px]">
            {trendData[0].data.length ? (
              <ResponsiveLine
                data={trendData}
                margin={{ top: 20, right: 20, bottom: 55, left: 55 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, stacked: false }}
                curve="monotoneX"
                enableArea
                enablePoints={false}
                axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -35 }}
                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                enableGridX={false}
                colors={{ scheme: "paired" }}
                theme={{ axis: { ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } }, domain: { line: { stroke: "hsl(var(--border))" } } }, grid: { line: { stroke: "hsl(var(--border))" } } }}
              />
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{loading ? "Loading traffic..." : "No traffic recorded yet."}</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visitor geography</p>
          <h2 className="mt-1 text-lg font-bold text-card-foreground">Where visitors come from</h2>
          <div className="mt-3 h-[280px]">
            {countryData.length ? (
              <ResponsiveBar
                data={countryData}
                keys={["visits"]}
                indexBy="country"
                margin={{ top: 10, right: 10, bottom: 45, left: 45 }}
                padding={0.3}
                enableLabel={false}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{ tickSize: 0, tickPadding: 6 }}
                colors={{ scheme: "paired" }}
                theme={{ axis: { ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } }, domain: { line: { stroke: "hsl(var(--border))" } } }, grid: { line: { stroke: "hsl(var(--border))" } } }}
              />
            ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No country data yet.</div>}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page engagement</p>
          <h2 className="mt-1 text-lg font-bold text-card-foreground">Pages visitors actually visit</h2>
          <div className="mt-4 divide-y divide-border">
            {(data.pages || []).slice(0, 20).map((row) => (
              <div key={row.path} className="flex items-center justify-between gap-4 py-2.5">
                <span className="truncate text-sm text-card-foreground">{row.path}</span>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{Number(row.count || 0).toLocaleString()} views</span>
              </div>
            ))}
            {!data.pages?.length && <p className="py-4 text-sm text-muted-foreground">Page data will appear as customers browse.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer goals</p>
          <h2 className="mt-1 text-lg font-bold text-card-foreground">How visitors progress</h2>
          <div className="mt-4 space-y-3">
            {(data.goals || []).map((goal) => {
              const max = Math.max(...(data.goals || []).map((item) => Number(item.count || 0)), 1);
              return (
                <div key={goal.key}>
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span className="text-card-foreground">{goal.label}</span>
                    <span className="font-semibold text-muted-foreground">{Number(goal.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (Number(goal.count || 0) / max) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-[11px] text-muted-foreground">Goals are based on storefront milestones currently instrumented: product interest, cart, checkout, and successful payment.</p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {[
          ["Traffic sources", data.sources || [], "source"],
          ["Devices", data.devices || [], "device_type"],
        ].map(([title, rows, field]) => (
          <section key={title} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <div className="mt-3 space-y-2">
              {rows.slice(0, 10).map((row) => (
                <div key={row[field]} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span className="truncate text-sm text-card-foreground">{row[field] || "Unknown"}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{Number(row.count || 0).toLocaleString()}</span>
                </div>
              ))}
              {!rows.length && <p className="text-sm text-muted-foreground">No data yet.</p>}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visitor journeys</p>
        <h2 className="mt-1 text-lg font-bold text-card-foreground">Recent sessions and pages visited</h2>
        <div className="mt-4 space-y-2">
          {(data.recent_sessions || []).slice(0, 20).map((session) => (
            <details key={session.session_id} className="rounded-xl border border-border bg-muted p-3">
              <summary className="cursor-pointer text-sm font-semibold text-card-foreground">
                {new Date(session.started_at).toLocaleString()} • {session.page_count} pages
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.pages.map((path, index) => (
                  <span key={`${session.session_id}-${index}`} className="rounded-lg bg-card px-2 py-1 text-xs text-muted-foreground">{path}</span>
                ))}
              </div>
            </details>
          ))}
          {!data.recent_sessions?.length && <p className="text-sm text-muted-foreground">Visitor journeys will appear after sessions are recorded.</p>}
        </div>
      </section>
    </section>
  );
};

export default InboundTraffic;
