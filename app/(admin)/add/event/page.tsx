import Link from "next/link";
import { CanberraDateTimeSelector } from "@/components/CanberraDateTimeSelector";
import { LinkedPlaceLocationPicker } from "@/components/LinkedPlaceLocationPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { addCommunityEvent } from "@/lib/actions/add-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { communityEventTagLabels, communityEventTags, eventTypes, recurrenceSeriesModes, repeatFrequencies } from "@/lib/validation/schemas";

type SearchParams = {
  created?: string;
  submissionId?: string;
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
};

type EventPrefill = {
  title: string;
  description: string;
  organizerName: string;
  hostName: string;
  startsAt: string | null;
  endsAt: string | null;
  locationName: string;
  address: string;
  suburb: string;
  registrationUrl: string;
  externalUrl: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option value={value} key={value}>{value}</option>);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFrom(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = textFrom(value);
    if (text) return text;
  }

  return "";
}

function timestampFrom(value: unknown) {
  const text = textFrom(value);
  if (!text || Number.isNaN(new Date(text).getTime())) return null;
  return text;
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

async function getEventSubmission(submissionId: string | undefined) {
  if (!submissionId) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, title, status, submitted_by_name, submitted_by_email, contact, contact_type, message, suggested_data")
    .eq("id", submissionId)
    .eq("submission_type", "suggest_event")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load event submission: ${error.message}`);
  }

  if (!data) {
    throw new Error("Event submission was not found.");
  }

  return data as EventSubmission;
}

function buildPrefill(submission: EventSubmission | null): EventPrefill {
  const suggestedData = isRecord(submission?.suggested_data) ? submission.suggested_data : {};
  const suggestedDescription = textFrom(suggestedData.description);
  const message = textFrom(submission?.message);

  return {
    title: firstText(submission?.title, suggestedData.title),
    description: [message, suggestedDescription].filter(Boolean).join("\n\n"),
    organizerName: firstText(suggestedData.organizer_name, suggestedData.host_name) || "Muslims ACT",
    hostName: firstText(suggestedData.host_name),
    startsAt: timestampFrom(suggestedData.starts_at),
    endsAt: timestampFrom(suggestedData.ends_at),
    locationName: firstText(suggestedData.location_name),
    address: firstText(suggestedData.address),
    suburb: firstText(suggestedData.suburb),
    registrationUrl: firstText(suggestedData.registration_url),
    externalUrl: firstText(suggestedData.external_url),
    contactName: firstText(suggestedData.contact_name, submission?.submitted_by_name),
    contactPhone: firstText(suggestedData.contact_phone, suggestedData.phone, submission?.contact_type === "phone" ? submission.contact : ""),
    contactEmail: firstText(suggestedData.contact_email, suggestedData.email, submission?.submitted_by_email, submission?.contact_type === "email" ? submission.contact : ""),
  };
}

export default async function AddEventPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const [places, sourceSubmission] = await Promise.all([
    getActivePlaces(),
    getEventSubmission(params.submissionId),
  ]);
  const prefill = buildPrefill(sourceSubmission);

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

      {sourceSubmission ? (
        <section className="card prefill-banner">
          <span className="badge">Prefilled from event submission</span>
          <div className="review-meta">
            <span>Submission: <code>{sourceSubmission.id}</code></span>
            <span>Submitted by: {sourceSubmission.submitted_by_name ?? sourceSubmission.submitted_by_email ?? "Anonymous"}</span>
            <span>Original status: {sourceSubmission.status ?? "unknown"}</span>
            <Link href="/review/event-submissions">Back to event submissions</Link>
          </div>
        </section>
      ) : null}

      <form action={addCommunityEvent} className="form">
        {sourceSubmission ? <input type="hidden" name="source_submission_id" value={sourceSubmission.id} /> : null}
        <section className="card">
          <h2>Event details</h2>
          <div className="field-grid">
            <div className="field"><label>Title</label><input name="title" defaultValue={prefill.title} required /></div>
            <div className="field"><label>Slug optional</label><input name="slug" placeholder="auto generated if empty" /></div>
            <div className="field"><label>Event type</label><select name="event_type" required><Options values={eventTypes} /></select></div>
            <div className="field"><label>Organizer name</label><input name="organizer_name" defaultValue={prefill.organizerName} required /></div>
            <div className="field"><label>Host name</label><input name="host_name" defaultValue={prefill.hostName} /></div>
            <CanberraDateTimeSelector defaultValue={prefill.startsAt} label="Starts at" name="starts_at" required />
            <CanberraDateTimeSelector defaultValue={prefill.endsAt} label="Ends at" name="ends_at" />
            <div className="field"><label>Active</label><select name="is_active" defaultValue="true"><option value="true">true</option><option value="false">false</option></select></div>
          </div>
          <div className="field"><label>Description</label><textarea name="description" defaultValue={prefill.description} /></div>
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
            <LinkedPlaceLocationPicker
              defaultValues={{
                locationName: prefill.locationName,
                address: prefill.address,
                suburb: prefill.suburb,
              }}
              places={places}
            />
            <div className="field"><label>Cost</label><input name="cost" /></div>
            <div className="field"><label>Registration URL</label><input name="registration_url" defaultValue={prefill.registrationUrl} type="url" /></div>
            <div className="field"><label>External URL</label><input name="external_url" defaultValue={prefill.externalUrl} type="url" /></div>
            <div className="field"><label>Contact name</label><input name="contact_name" defaultValue={prefill.contactName} /></div>
            <div className="field"><label>Contact phone</label><input name="contact_phone" defaultValue={prefill.contactPhone} /></div>
            <div className="field"><label>Contact email</label><input name="contact_email" defaultValue={prefill.contactEmail} type="email" /></div>
            <div className="field"><label>Details last updated</label><input name="details_last_updated" type="date" /></div>
          </div>
        </section>

        <div className="button-row"><SubmitButton>Create Event</SubmitButton></div>
      </form>
    </>
  );
}
