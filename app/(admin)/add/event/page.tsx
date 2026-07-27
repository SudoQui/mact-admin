import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { addCommunityEvent } from "@/lib/actions/add-actions";
import { eventTypes } from "@/lib/validation/schemas";

function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option value={value} key={value}>{value}</option>);
}

export default async function AddEventPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  return (
    <>
      <div className="top-row">
        <div>
          <h1>Add Community Event</h1>
          <p className="muted">Creates a `community_events` row. Use Canberra local time when entering dates.</p>
        </div>
        <Link className="button secondary" href="/add">Back</Link>
      </div>

      {params.created ? <div className="status">Created {params.created}. The form has been cleared.</div> : null}

      <form action={addCommunityEvent} className="form">
        <section className="card">
          <h2>Event details</h2>
          <div className="field-grid">
            <div className="field"><label>Title</label><input name="title" required /></div>
            <div className="field"><label>Slug optional</label><input name="slug" placeholder="auto generated if empty" /></div>
            <div className="field"><label>Event type</label><select name="event_type" required><Options values={eventTypes} /></select></div>
            <div className="field"><label>Organizer name</label><input name="organizer_name" defaultValue="Muslims ACT" required /></div>
            <div className="field"><label>Host name</label><input name="host_name" /></div>
            <div className="field"><label>Starts at</label><input name="starts_at" type="datetime-local" required /></div>
            <div className="field"><label>Ends at</label><input name="ends_at" type="datetime-local" /></div>
            <div className="field"><label>Active</label><select name="is_active" defaultValue="true"><option value="true">true</option><option value="false">false</option></select></div>
          </div>
          <div className="field"><label>Description</label><textarea name="description" /></div>
        </section>

        <section className="card">
          <h2>Location and links</h2>
          <div className="field-grid">
            <div className="field"><label>Linked place ID optional</label><input name="linked_place_id" /></div>
            <div className="field"><label>Location name</label><input name="location_name" /></div>
            <div className="field"><label>Address</label><input name="address" /></div>
            <div className="field"><label>Suburb</label><input name="suburb" /></div>
            <div className="field"><label>Latitude optional</label><input name="latitude" type="number" step="any" min="-90" max="90" /></div>
            <div className="field"><label>Longitude optional</label><input name="longitude" type="number" step="any" min="-180" max="180" /></div>
            <div className="field"><label>Cost</label><input name="cost" /></div>
            <div className="field"><label>Registration URL</label><input name="registration_url" type="url" /></div>
            <div className="field"><label>External URL</label><input name="external_url" type="url" /></div>
            <div className="field"><label>Contact name</label><input name="contact_name" /></div>
            <div className="field"><label>Contact phone</label><input name="contact_phone" /></div>
            <div className="field"><label>Contact email</label><input name="contact_email" type="email" /></div>
            <div className="field"><label>Details last updated</label><input name="details_last_updated" type="date" /></div>
          </div>
        </section>

        <div className="button-row"><SubmitButton>Create Event</SubmitButton></div>
      </form>
    </>
  );
}
