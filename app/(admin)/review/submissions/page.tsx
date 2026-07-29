import Link from "next/link";
import { updateSubmissionReview } from "@/lib/actions/review-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const statuses = ["pending", "in_review", "accepted", "resolved", "rejected"] as const;
const openStatuses = new Set(["pending", "in_review", "rejected"]);

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_review: "In review",
  accepted: "Accepted",
  resolved: "Resolved",
  rejected: "Rejected",
};

const submissionTypeLabels: Record<string, string> = {
  report_wrong_info: "Report wrong info",
  suggest_event: "Suggest event",
  suggest_place: "Suggest place",
  general_feedback: "General feedback",
};

type Submission = {
  id: string;
  title: string | null;
  submission_type: string | null;
  mode: string | null;
  status: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  message: string | null;
  created_at: string | null;
  admin_notes: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function preview(value: string | null) {
  if (!value) return "No message";
  return value.length > 140 ? `${value.slice(0, 140)}...` : value;
}

function labelFor(value: string | null, labels: Record<string, string>, fallback: string) {
  if (!value) return fallback;
  return labels[value] ?? value;
}

async function getSubmissions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, title, submission_type, mode, status, submitted_by_name, submitted_by_email, message, created_at, admin_notes")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load submissions: ${error.message}`);
  }

  return (data ?? []) as Submission[];
}

function SubmissionCard({ submission }: { submission: Submission }) {
  return (
    <article className="card">
      <div className="top-row compact-row">
        <div>
          <span className="badge">{labelFor(submission.status, statusLabels, "Unknown")}</span>
          <h2>{submission.title ?? "Untitled submission"}</h2>
        </div>
        <span className="muted">{formatDateTime(submission.created_at)}</span>
      </div>

      <div className="review-meta">
        <span>{labelFor(submission.submission_type, submissionTypeLabels, "Unknown type")}</span>
        <span>{submission.mode ?? "unknown mode"}</span>
        <span>{submission.submitted_by_name ?? "Anonymous"}</span>
        <span>{submission.submitted_by_email ?? "No email"}</span>
      </div>

      <p>{preview(submission.message)}</p>

      <form action={updateSubmissionReview} className="field">
        <input type="hidden" name="id" value={submission.id} />
        <label>Status</label>
        <select name="status" defaultValue={submission.status ?? "pending"}>
          {statuses.map((status) => (
            <option value={status} key={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
        <label>Admin notes</label>
        <textarea name="admin_notes" defaultValue={submission.admin_notes ?? ""} />
        <p className="muted">Accepted and resolved tickets require admin notes before saving.</p>
        <button className="button" type="submit">Save ticket</button>
      </form>
    </article>
  );
}

function TicketSection({ title, submissions, emptyMessage }: { title: string; submissions: Submission[]; emptyMessage: string }) {
  return (
    <section>
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="badge">{submissions.length}</span>
      </div>

      <div className="grid review-list">
        {submissions.map((submission) => <SubmissionCard submission={submission} key={submission.id} />)}
        {submissions.length === 0 ? <div className="card">{emptyMessage}</div> : null}
      </div>
    </section>
  );
}

export default async function SubmissionsReviewPage() {
  const submissions = await getSubmissions();
  const openSubmissions = submissions.filter((submission) => openStatuses.has(submission.status ?? ""));
  const closedSubmissions = submissions.filter((submission) => !openStatuses.has(submission.status ?? ""));

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Submissions</h1>
          <p className="muted">Review community and admin-submitted data issues.</p>
        </div>
        <Link className="button secondary" href="/review">Back</Link>
      </div>

      <div className="review-sections">
        <TicketSection title="Open tickets" submissions={openSubmissions} emptyMessage="No open tickets." />
        <TicketSection title="Closed tickets" submissions={closedSubmissions} emptyMessage="No closed tickets yet." />
      </div>
    </>
  );
}
