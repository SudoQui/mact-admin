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

type EventSubmission = {
  id: string;
  title: string | null;
  status: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  contact: string | null;
  contact_type: string | null;
  message: string | null;
  suggested_data: unknown;
  created_at: string | null;
  admin_notes: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatSuggestedData(value: unknown) {
  if (!value) return "No suggested data";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Suggested data could not be formatted.";
  }
}

async function getEventSubmissions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, title, status, submitted_by_name, submitted_by_email, contact, contact_type, message, suggested_data, created_at, admin_notes")
    .eq("submission_type", "suggest_event")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load event submissions: ${error.message}`);
  }

  return (data ?? []) as EventSubmission[];
}

function StatusButton({ status }: { status: (typeof statuses)[number] }) {
  return (
    <button className={status === "rejected" ? "button danger" : "button secondary"} name="status" type="submit" value={status}>
      {statusLabels[status]}
    </button>
  );
}

function EventSubmissionCard({ submission }: { submission: EventSubmission }) {
  return (
    <article className="card">
      <div className="top-row compact-row">
        <div>
          <span className="badge">{statusLabels[submission.status ?? ""] ?? "Unknown"}</span>
          <h2>{submission.title ?? "Untitled event submission"}</h2>
        </div>
        <span className="muted">{formatDateTime(submission.created_at)}</span>
      </div>

      <div className="review-meta">
        <span>{submission.submitted_by_name ?? "Anonymous"}</span>
        <span>{submission.submitted_by_email ?? "No email"}</span>
        <span>{submission.contact ?? "No contact"}</span>
        <span>{submission.contact_type ?? "No contact type"}</span>
      </div>

      <p>{submission.message ?? "No message"}</p>

      <pre className="suggested-data">{formatSuggestedData(submission.suggested_data)}</pre>

      <form action={updateSubmissionReview} className="field">
        <input type="hidden" name="id" value={submission.id} />
        <label>Admin notes</label>
        <textarea name="admin_notes" defaultValue={submission.admin_notes ?? ""} />
        <div className="button-row">
          <button className="button" name="status" type="submit" value={submission.status ?? "pending"}>Save admin notes</button>
          <StatusButton status="in_review" />
          <StatusButton status="accepted" />
          <StatusButton status="resolved" />
          <StatusButton status="rejected" />
          <Link className="button secondary" href={`/add/event?submissionId=${submission.id}`}>Create event from submission</Link>
        </div>
      </form>
    </article>
  );
}

function TicketSection({
  emptyMessage,
  submissions,
  title,
}: {
  emptyMessage: string;
  submissions: EventSubmission[];
  title: string;
}) {
  return (
    <section className="ticket-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="badge">{submissions.length}</span>
      </div>
      <div className="grid review-list">
        {submissions.map((submission) => <EventSubmissionCard submission={submission} key={submission.id} />)}
        {submissions.length === 0 ? <div className="card">{emptyMessage}</div> : null}
      </div>
    </section>
  );
}

export default async function EventSubmissionsReviewPage() {
  const submissions = await getEventSubmissions();
  const openSubmissions = submissions.filter((submission) => openStatuses.has(submission.status ?? ""));
  const closedSubmissions = submissions.filter((submission) => !openStatuses.has(submission.status ?? ""));

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Event Submissions</h1>
          <p className="muted">Review suggested events before creating public community event rows.</p>
        </div>
        <Link className="button secondary" href="/review">Back</Link>
      </div>

      <div className="review-sections">
        <TicketSection title="Open event submissions" submissions={openSubmissions} emptyMessage="No open event submissions." />
        <TicketSection title="Closed event submissions" submissions={closedSubmissions} emptyMessage="No closed event submissions." />
      </div>
    </>
  );
}
