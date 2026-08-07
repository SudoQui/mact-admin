import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const openSubmissionStatuses = new Set(["pending", "in_review", "rejected"]);

type CountMetric = {
  label: string;
  value: number;
};

type DetailRecord = Record<string, string | boolean | number | null>;

type PlaceReviewRow = {
  id: string;
  mode: string | null;
  food_details?: DetailRecord | DetailRecord[] | null;
  prayer_details?: DetailRecord | DetailRecord[] | null;
};

type CommunityEventMetricRow = {
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
};

type AnnouncementMetricRow = {
  visible_from: string | null;
  visible_until: string | null;
  is_active: boolean | null;
};

type SubmissionMetricRow = {
  status: string | null;
  submission_type: string | null;
};

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type FilterableQuery = PromiseLike<unknown> & {
  eq(column: string, value: unknown): FilterableQuery;
  gte(column: string, value: string): FilterableQuery;
  lt(column: string, value: string): FilterableQuery;
};

export type AnalyticsOverviewMetrics = {
  databaseContent: CountMetric[];
  reviewHealth: CountMetric[];
  communityOperations: CountMetric[];
};

export type GroupedDatabaseMetrics = {
  placesByMode: CountMetric[];
  foodPlacesByCategory: CountMetric[];
  prayerPlacesByCategory: CountMetric[];
  submissionsByStatus: CountMetric[];
  submissionsByType: CountMetric[];
  eventsByType: CountMetric[];
  announcementsByMode: CountMetric[];
  announcementsByPriority: CountMetric[];
};

function firstDetail(detail: DetailRecord | DetailRecord[] | null | undefined) {
  return Array.isArray(detail) ? detail[0] : detail;
}

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpired(value: string | null | undefined, now = new Date()) {
  const date = validDate(value);
  return !!date && date < now;
}

function isWithinDays(value: string | null | undefined, days: number, now = new Date()) {
  const date = validDate(value);
  if (!date) return false;

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + days);
  return date >= now && date <= threshold;
}

function getWeekRange(now = new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

function getMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { start, end };
}

async function exactCount(
  supabase: SupabaseAdminClient,
  table: string,
  applyFilters: (query: FilterableQuery) => FilterableQuery = (query) => query,
) {
  const { count, error } = (await applyFilters(
    supabase.from(table).select("id", { count: "exact", head: true }) as unknown as FilterableQuery,
  )) as {
    count: number | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Could not count ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function selectRows<T>(
  supabase: SupabaseAdminClient,
  table: string,
  columns: string,
  applyFilters?: (query: FilterableQuery) => FilterableQuery,
) {
  const query = supabase.from(table).select(columns) as unknown as FilterableQuery;
  const { data, error } = (await (applyFilters ? applyFilters(query) : query)) as {
    data: T[] | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Could not load ${table}: ${error.message}`);
  }

  return (data ?? []) as T[];
}

function foodHasUnknownHalalFields(detail: DetailRecord | null | undefined) {
  if (!detail) return true;
  return [
    detail.halal_meat_coverage,
    detail.hand_slaughtered,
    detail.pork_status,
    detail.alcohol_status,
    detail.cross_contamination_risk,
    detail.verification_source,
  ].includes("unknown");
}

function prayerHasUnknownFacilityFields(detail: DetailRecord | null | undefined) {
  if (!detail) return true;
  return [
    detail.women_area,
    detail.wudu,
    detail.bathrooms_available,
    detail.parking_available,
    detail.wheelchair_accessible,
    detail.public_access,
    detail.capacity_level,
    detail.prayer_place_type,
  ].includes("unknown");
}

function locationNeedsReview(place: PlaceReviewRow, now = new Date()) {
  if (place.mode === "food") {
    const detail = firstDetail(place.food_details);
    return (
      foodHasUnknownHalalFields(detail)
      || detail?.confidence_level === "low"
      || isExpired(detail?.halal_certificate_expiry as string | null | undefined, now)
      || isWithinDays(detail?.halal_certificate_expiry as string | null | undefined, 30, now)
    );
  }

  if (place.mode === "prayer") {
    const detail = firstDetail(place.prayer_details);
    return prayerHasUnknownFacilityFields(detail) || detail?.confidence_level === "low";
  }

  return false;
}

function eventAlreadyEnded(event: CommunityEventMetricRow, now = new Date()) {
  const endDate = validDate(event.ends_at) ?? validDate(event.starts_at);
  return event.is_active === true && !!endDate && endDate < now;
}

function isAnnouncementScheduled(item: AnnouncementMetricRow, now = new Date()) {
  const visibleFrom = validDate(item.visible_from);
  return item.is_active === true && !!visibleFrom && visibleFrom > now;
}

function isAnnouncementExpired(item: AnnouncementMetricRow, now = new Date()) {
  return item.is_active === true && isExpired(item.visible_until, now);
}

function isAnnouncementVisible(item: AnnouncementMetricRow, now = new Date()) {
  const visibleFrom = validDate(item.visible_from);
  const visibleUntil = validDate(item.visible_until);
  return (
    item.is_active === true
    && (!visibleFrom || visibleFrom <= now)
    && (!visibleUntil || visibleUntil >= now)
  );
}

function countBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = getKey(row)?.trim() || "Not set";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts, ([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export async function getAnalyticsOverviewMetrics(): Promise<AnalyticsOverviewMetrics> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const weekRange = getWeekRange(now);
  const monthRange = getMonthRange(now);

  const [
    activePlaces,
    activeFoodPlaces,
    activePrayerPlaces,
    activeEvents,
    activeAnnouncements,
    pendingSubmissions,
    submissions,
    reviewPlaces,
    foodDetails,
    prayerDetails,
    activeEventDates,
    announcements,
    eventsThisWeek,
    eventsThisMonth,
  ] = await Promise.all([
    exactCount(supabase, "places", (query) => query.eq("is_active", true)),
    exactCount(supabase, "places", (query) => query.eq("is_active", true).eq("mode", "food")),
    exactCount(supabase, "places", (query) => query.eq("is_active", true).eq("mode", "prayer")),
    exactCount(supabase, "community_events", (query) => query.eq("is_active", true)),
    exactCount(supabase, "whats_new_items", (query) => query.eq("is_active", true)),
    exactCount(supabase, "submissions", (query) => query.eq("status", "pending")),
    selectRows<SubmissionMetricRow>(supabase, "submissions", "status, submission_type"),
    selectRows<PlaceReviewRow>(supabase, "places", "id, mode, food_details(*), prayer_details(*)"),
    selectRows<DetailRecord>(supabase, "food_details", "halal_meat_coverage, hand_slaughtered, pork_status, alcohol_status, cross_contamination_risk, verification_source, confidence_level, halal_certificate_expiry"),
    selectRows<DetailRecord>(supabase, "prayer_details", "women_area, wudu, bathrooms_available, parking_available, wheelchair_accessible, public_access, capacity_level, prayer_place_type, confidence_level"),
    selectRows<CommunityEventMetricRow>(supabase, "community_events", "starts_at, ends_at, is_active", (query) => query.eq("is_active", true)),
    selectRows<AnnouncementMetricRow>(supabase, "whats_new_items", "visible_from, visible_until, is_active"),
    exactCount(supabase, "community_events", (query) => query
      .eq("is_active", true)
      .gte("starts_at", weekRange.start.toISOString())
      .lt("starts_at", weekRange.end.toISOString())),
    exactCount(supabase, "community_events", (query) => query
      .eq("is_active", true)
      .gte("starts_at", monthRange.start.toISOString())
      .lt("starts_at", monthRange.end.toISOString())),
  ]);

  const openTickets = submissions.filter((submission) => openSubmissionStatuses.has(submission.status ?? "")).length;
  const closedTickets = submissions.length - openTickets;
  const locationsNeedingReview = reviewPlaces.filter((place) => locationNeedsReview(place, now)).length;
  const announcementActiveCount = announcements.filter((item) => isAnnouncementVisible(item, now)).length;
  const announcementScheduledCount = announcements.filter((item) => isAnnouncementScheduled(item, now)).length;
  const announcementExpiredCount = announcements.filter((item) => isAnnouncementExpired(item, now)).length;

  return {
    databaseContent: [
      { label: "Active places", value: activePlaces },
      { label: "Active food places", value: activeFoodPlaces },
      { label: "Active prayer places", value: activePrayerPlaces },
      { label: "Active community events", value: activeEvents },
      { label: "Active announcements", value: activeAnnouncements },
      { label: "Pending submissions", value: pendingSubmissions },
      { label: "Open tickets", value: openTickets },
      { label: "Closed tickets", value: closedTickets },
      { label: "Locations needing review", value: locationsNeedingReview },
      { label: "Events this week", value: eventsThisWeek },
      { label: "Events this month", value: eventsThisMonth },
    ],
    reviewHealth: [
      { label: "Food places with unknown halal fields", value: foodDetails.filter(foodHasUnknownHalalFields).length },
      { label: "Prayer places with unknown facility fields", value: prayerDetails.filter(prayerHasUnknownFacilityFields).length },
      { label: "Low confidence food records", value: foodDetails.filter((detail) => detail.confidence_level === "low").length },
      { label: "Expired halal certificates", value: foodDetails.filter((detail) => isExpired(detail.halal_certificate_expiry as string | null | undefined, now)).length },
      { label: "Certificates expiring within 30 days", value: foodDetails.filter((detail) => isWithinDays(detail.halal_certificate_expiry as string | null | undefined, 30, now)).length },
      { label: "Events already ended but still active", value: activeEventDates.filter((event) => eventAlreadyEnded(event, now)).length },
      { label: "Active announcements already expired", value: announcementExpiredCount },
    ],
    communityOperations: [
      { label: "Event submissions pending", value: submissions.filter((submission) => submission.submission_type === "suggest_event" && submission.status === "pending").length },
      { label: "Reports pending", value: submissions.filter((submission) => submission.submission_type === "report_wrong_info" && submission.status === "pending").length },
      { label: "Announcements active", value: announcementActiveCount },
      { label: "Announcements scheduled", value: announcementScheduledCount },
      { label: "Announcements expired", value: announcementExpiredCount },
    ],
  };
}

export async function getGroupedDatabaseMetrics(): Promise<GroupedDatabaseMetrics> {
  const supabase = createSupabaseAdminClient();
  const [places, submissions, events, announcements] = await Promise.all([
    selectRows<{ mode: string | null; category: string | null }>(supabase, "places", "mode, category"),
    selectRows<{ status: string | null; submission_type: string | null }>(supabase, "submissions", "status, submission_type"),
    selectRows<{ event_type: string | null }>(supabase, "community_events", "event_type"),
    selectRows<{ mode: string | null; priority: string | null }>(supabase, "whats_new_items", "mode, priority"),
  ]);

  return {
    placesByMode: countBy(places, (place) => place.mode),
    foodPlacesByCategory: countBy(places.filter((place) => place.mode === "food"), (place) => place.category),
    prayerPlacesByCategory: countBy(places.filter((place) => place.mode === "prayer"), (place) => place.category),
    submissionsByStatus: countBy(submissions, (submission) => submission.status),
    submissionsByType: countBy(submissions, (submission) => submission.submission_type),
    eventsByType: countBy(events, (event) => event.event_type),
    announcementsByMode: countBy(announcements, (announcement) => announcement.mode),
    announcementsByPriority: countBy(announcements, (announcement) => announcement.priority),
  };
}
