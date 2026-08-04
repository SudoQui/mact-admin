import Link from "next/link";
import { AppUpdateCopyActions, AppUpdatesClientTools } from "@/components/AppUpdatesClientTools";
import type { AppUpdateRow } from "@/lib/app-updates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SearchParams = {
  channel?: string;
  runtime?: string;
};

const releaseSelect = [
  "id",
  "eas_update_id",
  "update_group_id",
  "channel",
  "branch",
  "runtime_version",
  "app_version",
  "android_version_code",
  "ios_build_number",
  "platforms",
  "message",
  "git_commit_sha",
  "git_branch",
  "published_at",
  "registered_at",
  "registered_by",
  "metadata",
  "is_rollback",
].join(", ");

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatAge(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return "Published just now";
  if (absMs < hour) return `Published ${Math.round(absMs / minute)} minutes ago`;
  if (absMs < day) return `Published ${Math.round(absMs / hour)} hours ago`;
  return `Published ${Math.round(absMs / day)} days ago`;
}

function formatChannel(value: string) {
  if (value === "preview") return "Preview/Beta";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatVersionBuild(update: AppUpdateRow) {
  const builds = [
    update.android_version_code ? `Android ${update.android_version_code}` : null,
    update.ios_build_number ? `iOS ${update.ios_build_number}` : null,
  ].filter(Boolean);

  return [update.app_version, builds.join(" / ")].filter(Boolean).join(" - ") || "Not supplied";
}

function diagnosticString(update: AppUpdateRow) {
  const version = update.app_version ? `MACT ${update.app_version}` : "MACT";
  const build = update.android_version_code ?? update.ios_build_number;
  const buildLabel = build ? ` (${build})` : "";
  return `${version}${buildLabel} - ${formatChannel(update.channel)} - Runtime ${update.runtime_version} - Update ${shortId(update.eas_update_id)}`;
}

function latestByChannelRuntime(updates: AppUpdateRow[]) {
  const latest = new Map<string, AppUpdateRow>();

  for (const update of updates) {
    const key = `${update.channel}:${update.runtime_version}`;
    const current = latest.get(key);
    if (!current || new Date(update.published_at).getTime() > new Date(current.published_at).getTime()) {
      latest.set(key, update);
    }
  }

  return Array.from(latest.values()).sort((left, right) => (
    new Date(right.published_at).getTime() - new Date(left.published_at).getTime()
  ));
}

function channelSummary(updates: AppUpdateRow[]) {
  const latest = new Map<string, AppUpdateRow>();

  for (const update of updates) {
    const current = latest.get(update.channel);
    if (!current || new Date(update.published_at).getTime() > new Date(current.published_at).getTime()) {
      latest.set(update.channel, update);
    }
  }

  const preferred = ["production", "preview", "beta", "development"];
  return Array.from(latest.values()).sort((left, right) => {
    const leftRank = preferred.indexOf(left.channel);
    const rightRank = preferred.indexOf(right.channel);
    if (leftRank !== rightRank) return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
    return left.channel.localeCompare(right.channel);
  });
}

async function getUpdates(params: SearchParams) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("app_updates")
    .select(releaseSelect)
    .order("published_at", { ascending: false })
    .limit(100);

  if (params.channel) query = query.eq("channel", params.channel.toLowerCase());
  if (params.runtime) query = query.eq("runtime_version", params.runtime);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load EAS updates: ${error.message}`);
  }

  return (data ?? []) as unknown as AppUpdateRow[];
}

async function getAllRecentUpdates() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_updates")
    .select(releaseSelect)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Could not load EAS updates: ${error.message}`);
  }

  return (data ?? []) as unknown as AppUpdateRow[];
}

function Badge({ children, variant }: { children: React.ReactNode; variant?: "danger" | "success" }) {
  const className = variant === "danger"
    ? "badge danger-badge"
    : variant === "success"
      ? "status-badge status-badge-scheduled"
      : "badge";
  return <span className={className}>{children}</span>;
}

export default async function EasUpdatesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const [updates, allUpdates] = await Promise.all([getUpdates(params), getAllRecentUpdates()]);
  const latestUpdates = latestByChannelRuntime(allUpdates);
  const summaries = channelSummary(allUpdates);
  const channelOptions = Array.from(new Set(allUpdates.map((update) => update.channel))).sort();
  const runtimeOptions = Array.from(new Set(allUpdates.map((update) => update.runtime_version))).sort();
  const latestIds = new Set(latestUpdates.map((update) => update.eas_update_id));

  return (
    <>
      <div className="top-row">
        <div>
          <h1>EAS Updates</h1>
          <p className="muted">Published update registry for release diagnostics. Publication does not imply tester installation.</p>
        </div>
        <Link className="button secondary" href="/dashboard">Back</Link>
      </div>

      {allUpdates.length === 0 ? (
        <section className="card">
          No EAS updates have been registered yet. Publish through the MACT release script or register an existing update manually.
        </section>
      ) : null}

      <section className="grid release-summary-grid">
        {summaries.map((update) => (
          <article className="card" key={update.channel}>
            <div className="section-heading">
              <h2>{formatChannel(update.channel)}</h2>
              {update.is_rollback ? <Badge variant="danger">Rollback</Badge> : null}
            </div>
            <p className="copy-id">{shortId(update.eas_update_id)} - {update.eas_update_id}</p>
            <div className="review-meta">
              <Badge>{update.runtime_version}</Badge>
              {update.app_version ? <Badge>{update.app_version}</Badge> : null}
              {update.platforms.map((platform) => <Badge key={platform}>{platform}</Badge>)}
            </div>
            <p>{update.message ?? "No update message supplied."}</p>
            <p className="muted">{formatDateTime(update.published_at)} - {formatAge(update.published_at)}</p>
            {update.git_commit_sha ? <p className="copy-id">Commit {update.git_commit_sha.slice(0, 7)}</p> : null}
          </article>
        ))}
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Update history</h2>
          <span className="badge">{updates.length}</span>
        </div>

        <form className="filter-row">
          <select name="channel" defaultValue={params.channel ?? ""}>
            <option value="">All channels</option>
            {channelOptions.map((channel) => <option key={channel} value={channel}>{formatChannel(channel)}</option>)}
          </select>
          <select name="runtime" defaultValue={params.runtime ?? ""}>
            <option value="">All runtime versions</option>
            {runtimeOptions.map((runtime) => <option key={runtime} value={runtime}>{runtime}</option>)}
          </select>
          <button className="button" type="submit">Filter</button>
          <Link className="button secondary" href="/releases/eas-updates">Reset</Link>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Published</th>
                <th>Channel</th>
                <th>Message</th>
                <th>Update ID</th>
                <th>Runtime</th>
                <th>Version/build</th>
                <th>Platforms</th>
                <th>Commit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {updates.map((update) => (
                <tr key={update.id}>
                  <td>{formatDateTime(update.published_at)}<br /><span className="muted">{formatAge(update.published_at)}</span></td>
                  <td><Badge>{formatChannel(update.channel)}</Badge></td>
                  <td>{update.message ?? "No message"}</td>
                  <td><span className="copy-id">{shortId(update.eas_update_id)}<br />{update.eas_update_id}</span></td>
                  <td>{update.runtime_version}</td>
                  <td>{formatVersionBuild(update)}</td>
                  <td>{update.platforms.map((platform) => <Badge key={platform}>{platform}</Badge>)} {!update.platforms.length ? "Not supplied" : null}</td>
                  <td>{update.git_commit_sha ? <span className="copy-id">{update.git_commit_sha.slice(0, 7)}</span> : "Not supplied"}</td>
                  <td>
                    <div className="tag-badges">
                      {latestIds.has(update.eas_update_id) ? <Badge variant="success">Latest for channel/runtime</Badge> : <Badge>Older registered update</Badge>}
                      {update.is_rollback ? <Badge variant="danger">Rollback</Badge> : null}
                    </div>
                  </td>
                  <td>
                    <AppUpdateCopyActions update={update} />
                    <details className="metadata-details">
                      <summary>Metadata</summary>
                      <pre className="suggested-data">{JSON.stringify(update.metadata, null, 2)}</pre>
                    </details>
                    <p className="copy-id">{diagnosticString(update)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AppUpdatesClientTools latestUpdates={latestUpdates} updates={allUpdates} />
    </>
  );
}
