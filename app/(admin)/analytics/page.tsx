import Link from "next/link";
import { getAnalyticsOverviewMetrics } from "@/lib/analytics/database-metrics";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="card metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </article>
  );
}

function MetricSection({ metrics, title }: { metrics: Array<{ label: string; value: number }>; title: string }) {
  return (
    <section className="analytics-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="badge">{metrics.length}</span>
      </div>
      <div className="grid">
        {metrics.map((metric) => (
          <MetricCard label={metric.label} value={metric.value} key={metric.label} />
        ))}
      </div>
    </section>
  );
}

export default async function AnalyticsPage() {
  const metrics = await getAnalyticsOverviewMetrics();

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Database-only admin metrics from Supabase.</p>
        </div>
        <Link className="button secondary" href="/analytics/database">Database breakdown</Link>
      </div>

      <div className="review-sections">
        <MetricSection title="Database content" metrics={metrics.databaseContent} />
        <MetricSection title="Review health" metrics={metrics.reviewHealth} />
        <MetricSection title="Community operations" metrics={metrics.communityOperations} />
      </div>
    </>
  );
}
