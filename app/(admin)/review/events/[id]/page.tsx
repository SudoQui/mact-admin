import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { cancelCommunityEventFromDetail, deleteCommunityEventFromDetail, restoreCommunityEventFromDetail } from "@/lib/actions/review-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatCanberraDateTime } from "@/lib/utils/canberra-time";
import { communityEventTagLabels } from "@/lib/validation/schemas";

const supabaseProjectUrl = "https://supabase.com/dashboard/project/vogcmwmwttaisxomxtbo";

type CommunityEvent = {
  id: string;
  title: string | null;
  event_type: string | null;
  event_tags: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  location_name: string | null;
  address: string | null;
  suburb: string | null;
  linked_place_id: string | null;
  is_active: boolean | null;
  description: string | null;
  organizer_name: string | null;
  host_name: string | null;
  cost: string | null;
  registration_url: string | null;
  external_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  details_last_updated: string | null;
  created_at: string | null;
  event_status: string | null;
  cancellation_note: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  recurrence_series_id: string | null;
};

const eventSelectBase = [
  "id",
  "title",
  "event_type",
  "starts_at",
  "ends_at",
  "location_name",
  "address",
  "suburb",
  "linked_place_id",
  "is_active",
  "description",
  "organizer_name",
  "host_name",
  "cost",
  "registration_url",
  "external_url",
  "contact_name",
  "contact_phone",
  "contact_email",
  "details_last_updated",
  "created_at",
  "event_status",
  "cancellation_note",
  "cancelled_at",
  "cancelled_by",
  "recurrence_series_id",
].join(", ");

const eventSelect = `event_tags, ${eventSelectBase}`;

function valueOrFallback(value: string | null | undefined) {
  return value?.trim() || "Not set";
}

function tagLabel(tag: string) {
  return communityEventTagLabels[tag as keyof typeof communityEventTagLabels] ?? tag;
}

function EventTagBadges({ tags }: { tags: string[] | null }) {
  if (!tags?.length) return <p className="muted">No audience tags selected.</p>;

  return (
    <div className="tag-badges">
      {tags.map((tag) => <span className="badge tag-badge" key={tag}>{tagLabel(tag)}</span>)}
    </div>
  );
}

function isCancelled(event: CommunityEvent) {
  return event.event_status === "cancelled";
}

function StatusBadge({ event }: { event: CommunityEvent }) {
  return (
    <span className={isCancelled(event) ? "status-badge status-badge-cancelled" : "status-badge status-badge-scheduled"}>
      {isCancelled(event) ? "Cancelled" : "Scheduled"}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

async function getEvent(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("community_events")
    .select(eventSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingEventTagsColumn(error.message)) {
      const fallback = await supabase
        .from("community_events")
        .select(eventSelectBase)
        .eq("id", id)
        .maybeSingle();

      if (fallback.error) {
        throw new Error(`Could not load event: ${fallback.error.message}`);
      }

      const event = fallback.data as unknown as Omit<CommunityEvent, "event_tags"> | null;
      return event ? { ...event, event_tags: [] } : null;
    }

    throw new Error(`Could not load event: ${error.message}`);
  }

  return data as unknown as CommunityEvent | null;
}

function isMissingEventTagsColumn(message: string) {
  return message.includes("community_events.event_tags") || message.includes("event_tags");
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  return (
    <>
      <div className="top-row">
        <div>
          <StatusBadge event={event} />
          <h1>{event.title ?? "Untitled event"}</h1>
          <p className="muted">{event.event_type ?? "unknown"} event</p>
          <p className="muted">Times shown in Canberra time.</p>
          <EventTagBadges tags={event.event_tags} />
        </div>
        <Link className="button secondary" href="/review/events">Back</Link>
      </div>

      <div className="detail-grid">
        <section className="card detail-section">
          <h2>Event timing</h2>
          <dl>
            <DetailItem label="Starts at" value={formatCanberraDateTime(event.starts_at)} />
            <DetailItem label="Ends at" value={formatCanberraDateTime(event.ends_at)} />
            <DetailItem label="Created at" value={formatCanberraDateTime(event.created_at)} />
            <DetailItem label="Updated at" value="Not available" />
            <DetailItem label="Details last updated" value={formatCanberraDateTime(event.details_last_updated)} />
          </dl>
        </section>

        <section className="card detail-section">
          <h2>Location</h2>
          <dl>
            <DetailItem label="Location name" value={valueOrFallback(event.location_name)} />
            <DetailItem label="Address" value={valueOrFallback(event.address)} />
            <DetailItem label="Suburb" value={valueOrFallback(event.suburb)} />
            <DetailItem label="Linked place ID" value={event.linked_place_id ?? "Not set"} />
          </dl>
          {event.linked_place_id ? <p className="copy-id">Copy linked place ID: {event.linked_place_id}</p> : null}
        </section>

        <section className="card detail-section">
          <h2>Description</h2>
          <p>{valueOrFallback(event.description)}</p>
        </section>

        <section className="card detail-section">
          <h2>Organizer and contact</h2>
          <dl>
            <DetailItem label="Organizer name" value={valueOrFallback(event.organizer_name)} />
            <DetailItem label="Host name" value={valueOrFallback(event.host_name)} />
            <DetailItem label="Contact name" value={valueOrFallback(event.contact_name)} />
            <DetailItem label="Contact phone" value={valueOrFallback(event.contact_phone)} />
            <DetailItem label="Contact email" value={valueOrFallback(event.contact_email)} />
            <DetailItem label="Cost" value={valueOrFallback(event.cost)} />
          </dl>
        </section>

        <section className="card detail-section">
          <h2>Links</h2>
          <dl>
            <DetailItem
              label="Registration URL"
              value={event.registration_url ? <a href={event.registration_url} target="_blank" rel="noreferrer">{event.registration_url}</a> : "Not set"}
            />
            <DetailItem
              label="External URL"
              value={event.external_url ? <a href={event.external_url} target="_blank" rel="noreferrer">{event.external_url}</a> : "Not set"}
            />
          </dl>
        </section>

        <section className="card detail-section">
          <h2>Series</h2>
          <p>{event.recurrence_series_id ? `Series ID: ${event.recurrence_series_id}` : "One-off event"}</p>
        </section>

        <section className="card detail-section">
          <h2>Admin actions</h2>
          <div className="button-row">
            <span className="copy-id">Copy event ID: {event.id}</span>
            <a className="button secondary" href={supabaseProjectUrl} target="_blank" rel="noreferrer">Open Supabase</a>
          </div>

          {isCancelled(event) ? (
            <>
              {event.cancellation_note ? <div className="warning">Cancellation reason: {event.cancellation_note}</div> : null}
              <form action={restoreCommunityEventFromDetail} className="form">
                <input name="id" type="hidden" value={event.id} />
                <button className="button" type="submit">Restore event</button>
              </form>
            </>
          ) : (
            <form action={cancelCommunityEventFromDetail} className="form">
              <input name="id" type="hidden" value={event.id} />
              <div className="field">
                <label>Cancellation reason</label>
                <textarea name="cancellation_note" required />
              </div>
              <button className="button danger" type="submit">Cancel event</button>
            </form>
          )}

          <div className="warning">
            Delete removes event rows from the admin database. This action cannot be undone from the dashboard.
          </div>
          <form action={deleteCommunityEventFromDetail} className="form">
            <input name="id" type="hidden" value={event.id} />
            <div className="field">
              <label>Delete scope</label>
              <select name="delete_scope" defaultValue="occurrence">
                <option value="occurrence">Delete this event only</option>
                {event.recurrence_series_id ? <option value="series">Delete all events in this series</option> : null}
              </select>
            </div>
            <button className="button danger" type="submit">Delete event</button>
          </form>
        </section>
      </div>
    </>
  );
}
