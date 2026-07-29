import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CommunityEvent = {
  id: string;
  title: string | null;
  event_type: string | null;
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

type SearchParams = {
  view?: string;
  month?: string;
};

const eventSelect = [
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

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) return "No time";
  return new Intl.DateTimeFormat("en-AU", { timeStyle: "short" }).format(new Date(value));
}

function formatMonthHeading(monthDate: Date) {
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(monthDate);
}

function monthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function calendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function isSameDay(date: Date, value: string | null) {
  if (!value) return false;
  const eventDate = new Date(value);
  return (
    eventDate.getFullYear() === date.getFullYear() &&
    eventDate.getMonth() === date.getMonth() &&
    eventDate.getDate() === date.getDate()
  );
}

function isCancelled(event: CommunityEvent) {
  return event.event_status === "cancelled";
}

function statusLabel(event: CommunityEvent) {
  return isCancelled(event) ? "Cancelled" : "Scheduled";
}

function locationLabel(event: CommunityEvent) {
  return [event.location_name, event.address, event.suburb].filter(Boolean).join(", ") || "Not set";
}

async function getEvents() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("community_events")
    .select(eventSelect)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load community events: ${error.message}`);
  }

  return (data ?? []) as unknown as CommunityEvent[];
}

function StatusBadge({ event }: { event: CommunityEvent }) {
  return (
    <span className={isCancelled(event) ? "status-badge status-badge-cancelled" : "status-badge status-badge-scheduled"}>
      {statusLabel(event)}
    </span>
  );
}

function ViewToggle({ view, month }: { view: string; month: string }) {
  return (
    <div className="view-toggle">
      <Link className={view === "calendar" ? "button" : "button secondary"} href={`/review/events?view=calendar&month=${month}`}>
        Calendar
      </Link>
      <Link className={view === "list" ? "button" : "button secondary"} href="/review/events?view=list">
        List
      </Link>
    </div>
  );
}

function CalendarView({ events, monthDate }: { events: CommunityEvent[]; monthDate: Date }) {
  const month = monthParam(monthDate);
  const previousMonth = monthParam(addMonths(monthDate, -1));
  const nextMonth = monthParam(addMonths(monthDate, 1));

  return (
    <section className="card">
      <div className="calendar-toolbar">
        <Link className="button secondary" href={`/review/events?view=calendar&month=${previousMonth}`}>Previous</Link>
        <h2>{formatMonthHeading(monthDate)}</h2>
        <Link className="button secondary" href={`/review/events?view=calendar&month=${nextMonth}`}>Next</Link>
      </div>

      <div className="calendar-grid">
        {weekdayLabels.map((weekday) => (
          <div className="calendar-day calendar-day-muted" key={weekday}>{weekday}</div>
        ))}
        {calendarDays(monthDate).map((day) => {
          const dayEvents = events.filter((event) => isSameDay(day, event.starts_at));
          const inCurrentMonth = day.getMonth() === monthDate.getMonth();

          return (
            <div className={inCurrentMonth ? "calendar-day" : "calendar-day calendar-day-muted"} key={day.toISOString()}>
              <span className="calendar-day-number">{day.getDate()}</span>
              {dayEvents.map((event) => (
                <Link
                  className={isCancelled(event) ? "calendar-event calendar-event-cancelled" : "calendar-event"}
                  href={`/review/events/${event.id}`}
                  key={event.id}
                >
                  <strong>{event.title ?? "Untitled event"}</strong>
                  <span>{formatTime(event.starts_at)}</span>
                  <StatusBadge event={event} />
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ListView({ events }: { events: CommunityEvent[] }) {
  return (
    <section className="event-list">
      {events.map((event) => (
        <Link className="card event-list-item" href={`/review/events/${event.id}`} key={event.id}>
          <div>
            <h2>{event.title ?? "Untitled event"}</h2>
            <p className="muted">{formatDateTime(event.starts_at)}</p>
          </div>
          <span className="badge">{event.event_type ?? "unknown"}</span>
          <p>{locationLabel(event)}</p>
          <StatusBadge event={event} />
        </Link>
      ))}
      {events.length === 0 ? <div className="card">No community events found.</div> : null}
    </section>
  );
}

export default async function EventsReviewPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const view = params.view === "list" ? "list" : "calendar";
  const monthDate = parseMonth(params.month);
  const month = monthParam(monthDate);
  const events = await getEvents();

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Community Events</h1>
          <p className="muted">Manage event occurrences without hard deleting rows.</p>
        </div>
        <Link className="button secondary" href="/review">Back</Link>
      </div>

      <ViewToggle view={view} month={month} />

      {view === "calendar" ? <CalendarView events={events} monthDate={monthDate} /> : <ListView events={events} />}
    </>
  );
}
