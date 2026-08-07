import Link from "next/link";
import { getGroupedDatabaseMetrics } from "@/lib/analytics/database-metrics";

function DataTable({ rows, title }: { rows: Array<{ label: string; value: number }>; title: string }) {
  return (
    <section className="card data-table">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="badge">{rows.length}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2}>No rows found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AnalyticsDatabasePage() {
  const metrics = await getGroupedDatabaseMetrics();

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Database Analytics</h1>
          <p className="muted">Grouped database counts from current MACT Supabase tables.</p>
        </div>
        <Link className="button secondary" href="/analytics">Back to analytics</Link>
      </div>

      <div className="detail-grid">
        <DataTable title="Places by mode" rows={metrics.placesByMode} />
        <DataTable title="Food places by category" rows={metrics.foodPlacesByCategory} />
        <DataTable title="Prayer places by category" rows={metrics.prayerPlacesByCategory} />
        <DataTable title="Submissions by status" rows={metrics.submissionsByStatus} />
        <DataTable title="Submissions by type" rows={metrics.submissionsByType} />
        <DataTable title="Events by type" rows={metrics.eventsByType} />
        <DataTable title="Announcements by mode" rows={metrics.announcementsByMode} />
        <DataTable title="Announcements by priority" rows={metrics.announcementsByPriority} />
      </div>
    </>
  );
}
