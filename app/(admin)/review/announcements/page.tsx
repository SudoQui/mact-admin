import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { deactivateAnnouncement, reactivateAnnouncement } from "@/lib/actions/review-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Announcement = {
  id: string;
  mode: string | null;
  item_type: string | null;
  title: string | null;
  body: string | null;
  location_name: string | null;
  suburb: string | null;
  linked_place_id: string | null;
  linked_event_id: string | null;
  action_label: string | null;
  action_url: string | null;
  priority: string | null;
  visible_from: string | null;
  visible_until: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const supabaseProjectUrl = "https://supabase.com/dashboard/project/vogcmwmwttaisxomxtbo/editor";

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function preview(value: string | null) {
  if (!value) return "No body";
  return value.length > 220 ? `${value.slice(0, 220)}...` : value;
}

function currentTimeMs() {
  return Date.now();
}

async function getAnnouncements() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whats_new_items")
    .select([
      "id",
      "mode",
      "item_type",
      "title",
      "body",
      "location_name",
      "suburb",
      "linked_place_id",
      "linked_event_id",
      "action_label",
      "action_url",
      "priority",
      "visible_from",
      "visible_until",
      "is_active",
      "created_at",
      "updated_at",
    ].join(", "))
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load announcements: ${error.message}`);
  }

  return (data ?? []) as unknown as Announcement[];
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <article className="card">
      <div className="top-row compact-row">
        <div>
          <span className="badge">{announcement.priority ?? "normal"}</span>
          <h2>{announcement.title ?? "Untitled announcement"}</h2>
        </div>
        <span className={announcement.is_active ? "status-badge status-badge-scheduled" : "status-badge status-badge-cancelled"}>
          {announcement.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="review-meta">
        <span>{announcement.mode ?? "unknown mode"}</span>
        <span>{announcement.item_type ?? "unknown type"}</span>
        <span>From: {formatDateTime(announcement.visible_from)}</span>
        <span>Until: {formatDateTime(announcement.visible_until)}</span>
      </div>

      <p>{preview(announcement.body)}</p>

      <div className="review-meta">
        {announcement.location_name ? <span>{announcement.location_name}</span> : null}
        {announcement.suburb ? <span>{announcement.suburb}</span> : null}
        {announcement.linked_place_id ? <span>Place: <code>{announcement.linked_place_id}</code></span> : null}
        {announcement.linked_event_id ? <span>Event: <code>{announcement.linked_event_id}</code></span> : null}
      </div>

      <div className="button-row">
        {announcement.is_active ? (
          <form action={deactivateAnnouncement}>
            <input type="hidden" name="id" value={announcement.id} />
            <button className="button danger" type="submit">Deactivate</button>
          </form>
        ) : (
          <form action={reactivateAnnouncement}>
            <input type="hidden" name="id" value={announcement.id} />
            <button className="button" type="submit">Reactivate</button>
          </form>
        )}
        <CopyButton value={announcement.id} />
        <a className="button secondary" href={supabaseProjectUrl} target="_blank" rel="noreferrer">Open Supabase</a>
      </div>
      <p className="copy-id">{announcement.id}</p>
    </article>
  );
}

function AnnouncementSection({
  announcements,
  emptyMessage,
  title,
}: {
  announcements: Announcement[];
  emptyMessage: string;
  title: string;
}) {
  return (
    <section>
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="badge">{announcements.length}</span>
      </div>
      <div className="grid review-list announcement-list">
        {announcements.map((announcement) => <AnnouncementCard announcement={announcement} key={announcement.id} />)}
        {announcements.length === 0 ? <div className="card">{emptyMessage}</div> : null}
      </div>
    </section>
  );
}

export default async function AnnouncementsReviewPage() {
  const announcements = await getAnnouncements();
  const now = currentTimeMs();
  const scheduled = announcements.filter((item) => item.is_active && item.visible_from && new Date(item.visible_from).getTime() > now);
  const expired = announcements.filter((item) => item.is_active && item.visible_until && new Date(item.visible_until).getTime() < now);
  const inactive = announcements.filter((item) => item.is_active === false);
  const active = announcements.filter((item) => (
    item.is_active === true
    && (!item.visible_from || new Date(item.visible_from).getTime() <= now)
    && (!item.visible_until || new Date(item.visible_until).getTime() >= now)
  ));

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Review app announcements without deleting records.</p>
        </div>
        <Link className="button secondary" href="/review">Back</Link>
      </div>

      <div className="review-sections">
        <AnnouncementSection title="Active" announcements={active} emptyMessage="No active announcements." />
        <AnnouncementSection title="Scheduled" announcements={scheduled} emptyMessage="No scheduled announcements." />
        <AnnouncementSection title="Expired" announcements={expired} emptyMessage="No expired announcements." />
        <AnnouncementSection title="Inactive" announcements={inactive} emptyMessage="No inactive announcements." />
      </div>
    </>
  );
}
