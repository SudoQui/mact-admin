import Link from "next/link";
import { reportAdminIssue } from "@/lib/actions/review-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ReportIssuePage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Report an Issue</h1>
          <p className="muted">Create an admin-side submission for the review queue.</p>
        </div>
        <Link className="button secondary" href="/review">Back</Link>
      </div>

      {params.created ? <div className="status">Created {params.created}. The form has been cleared.</div> : null}

      <form action={reportAdminIssue} className="form">
        <section className="card">
          <h2>Issue details</h2>
          <div className="field-grid">
            <div className="field"><label>Title</label><input name="title" required /></div>
            <div className="field">
              <label>Mode</label>
              <select name="mode" defaultValue="community">
                <option value="food">food</option>
                <option value="prayer">prayer</option>
                <option value="community">community</option>
              </select>
            </div>
            <div className="field">
              <label>Submission type</label>
              <select name="submission_type" defaultValue="report_wrong_info">
                <option value="report_wrong_info">report_wrong_info</option>
                <option value="suggest_event">suggest_event</option>
                <option value="suggest_place">suggest_place</option>
                <option value="general_feedback">general_feedback</option>
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select name="priority" defaultValue="normal">
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </div>
            <div className="field"><label>Related place ID optional</label><input name="related_place_id" /></div>
            <div className="field"><label>Related event ID optional</label><input name="related_event_id" /></div>
          </div>
          <div className="field"><label>Message</label><textarea name="message" required /></div>
          <div className="field"><label>Admin notes optional</label><textarea name="admin_notes" /></div>
        </section>

        <div className="button-row"><SubmitButton>Report Issue</SubmitButton></div>
      </form>
    </>
  );
}
