import Link from "next/link";
import { LinkedPlaceLocationPicker } from "@/components/LinkedPlaceLocationPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { addCommunityEvent } from "@/lib/actions/add-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { communityEventTagLabels, communityEventTags, eventTypes, recurrenceSeriesModes, repeatFrequencies } from "@/lib/validation/schemas";

function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option value={value} key={value}>{value}</option>);
}

async function getActivePlaces() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("places")
    .select("id, name, mode, category, suburb, address, latitude, longitude")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(`Could not load active places: ${error.message}`);
  }

  return data ?? [];
}

export default async function AddEventPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const places = await getActivePlaces();

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
          <h2>Audience and tags</h2>
          <p className="muted">Select every tag that applies. For example, an event can be a Class for Women and Youth.</p>
          <div className="tag-checkbox-grid">
            {communityEventTags.map((tag) => (
              <label className="tag-checkbox" key={tag}>
                <input name="event_tags" type="checkbox" value={tag} />
                <span>{communityEventTagLabels[tag]}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Repeat</h2>
          <div className="field-grid">
            <div className="field"><label>Repeat frequency</label><select name="repeat_frequency" defaultValue="none"><Options values={repeatFrequencies} /></select></div>
            <div className="field"><label>Repeat count</label><input name="repeat_count" type="number" defaultValue="1" min="1" max="52" /></div>
            <div className="field">
              <label>Recurrence series</label>
              <select name="recurrence_series_mode" defaultValue="none">
                <Options values={recurrenceSeriesModes} />
              </select>
            </div>
            <div className="field">
              <label>Existing series ID</label>
              <input name="recurrence_series_id" placeholder="Required only when recurrence series is existing" />
            </div>
          </div>
          <p className="muted">Repeated rows automatically share a generated series ID. Use Existing to attach this occurrence to a series you already created.</p>
        </section>

        <section className="card">
          <h2>Location and links</h2>
          <p className="muted">Choose a linked MACT place when the event is hosted at a known Food or Prayer location. Use manual location fields for one off venues.</p>
          <p className="muted">Selecting a linked place prefills the location fields. You can still edit them before saving.</p>
          <div className="field-grid">
            <LinkedPlaceLocationPicker places={places} />
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
