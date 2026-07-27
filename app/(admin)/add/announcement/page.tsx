import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { addAnnouncement } from "@/lib/actions/add-actions";
import { priorities, whatsNewModes, whatsNewTypes } from "@/lib/validation/schemas";

function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option value={value} key={value}>{value}</option>);
}

export default async function AddAnnouncementPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  return (
    <>
      <div className="top-row">
        <div>
          <h1>Add Announcement</h1>
          <p className="muted">Creates a `whats_new_items` row for the app inbox.</p>
        </div>
        <Link className="button secondary" href="/add">Back</Link>
      </div>

      {params.created ? <div className="status">Created {params.created}. The form has been cleared.</div> : null}

      <form action={addAnnouncement} className="form">
        <section className="card">
          <h2>Announcement details</h2>
          <div className="field-grid">
            <div className="field"><label>Mode</label><select name="mode" defaultValue="global"><Options values={whatsNewModes} /></select></div>
            <div className="field"><label>Item type</label><select name="item_type" defaultValue="announcement"><Options values={whatsNewTypes} /></select></div>
            <div className="field"><label>Priority</label><select name="priority" defaultValue="normal"><Options values={priorities} /></select></div>
            <div className="field"><label>Active</label><select name="is_active" defaultValue="true"><option value="true">true</option><option value="false">false</option></select></div>
            <div className="field"><label>Visible from optional</label><input name="visible_from" type="datetime-local" /></div>
            <div className="field"><label>Visible until optional</label><input name="visible_until" type="datetime-local" /></div>
          </div>
          <div className="field"><label>Title</label><input name="title" maxLength={160} required /></div>
          <div className="field"><label>Body</label><textarea name="body" maxLength={4000} required /></div>
        </section>

        <section className="card">
          <h2>Optional links</h2>
          <div className="field-grid">
            <div className="field"><label>Location name</label><input name="location_name" /></div>
            <div className="field"><label>Suburb</label><input name="suburb" /></div>
            <div className="field"><label>Linked place ID</label><input name="linked_place_id" /></div>
            <div className="field"><label>Linked event ID</label><input name="linked_event_id" /></div>
            <div className="field"><label>Action label</label><input name="action_label" placeholder="View details" /></div>
            <div className="field"><label>Action URL</label><input name="action_url" type="url" /></div>
          </div>
        </section>

        <div className="button-row"><SubmitButton>Create Announcement</SubmitButton></div>
      </form>
    </>
  );
}
