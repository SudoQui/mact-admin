"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireWriteRole } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addAnnouncementSchema, addEventSchema, addFoodSchema, addPrayerSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "./audit";

function rawForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function assertSlugAvailable(table: "places" | "community_events", slug: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();

  if (error) {
    throw new Error(`Could not check slug: ${error.message}`);
  }

  if (data) {
    throw new Error(`Slug already exists: ${slug}`);
  }
}

async function assertLinkedPlaceAvailable(linkedPlaceId: string | null | undefined) {
  if (!linkedPlaceId) return;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("places")
    .select("id")
    .eq("id", linkedPlaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error("Could not validate the linked MACT place.");
  }

  if (!data) {
    throw new Error("Linked MACT place was not found.");
  }
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeLocal(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-") + `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateSlug(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function parseEventDate(value: string, fieldName: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date and time.`);
  }

  return date;
}

function addOccurrenceInterval(date: Date, frequency: "daily" | "weekly" | "fortnightly" | "monthly", offset: number) {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(next.getDate() + offset);
  }

  if (frequency === "weekly") {
    next.setDate(next.getDate() + offset * 7);
  }

  if (frequency === "fortnightly") {
    next.setDate(next.getDate() + offset * 14);
  }

  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + offset);
  }

  return next;
}

type EventInput = ReturnType<typeof addEventSchema.parse>;

function buildEventRows(input: EventInput) {
  const isRepeating = input.repeat_frequency !== "none" && input.repeat_count > 1;
  const startsAt = isRepeating ? parseEventDate(input.starts_at, "Starts at") : null;
  const endsAt = isRepeating && input.ends_at ? parseEventDate(input.ends_at, "Ends at") : null;
  const durationMs = startsAt && endsAt ? endsAt.getTime() - startsAt.getTime() : null;

  return Array.from({ length: input.repeat_count }, (_, index) => {
    const occurrenceStart = startsAt && input.repeat_frequency !== "none"
      ? addOccurrenceInterval(startsAt, input.repeat_frequency, index)
      : null;
    const occurrenceEnd = occurrenceStart && durationMs !== null
      ? new Date(occurrenceStart.getTime() + durationMs)
      : null;
    const slug = isRepeating && occurrenceStart ? `${input.slug}-${formatDateSlug(occurrenceStart)}` : input.slug;

    return {
      title: input.title,
      slug,
      host_name: input.host_name ?? null,
      event_type: input.event_type,
      starts_at: occurrenceStart ? formatDateTimeLocal(occurrenceStart) : input.starts_at,
      ends_at: occurrenceEnd ? formatDateTimeLocal(occurrenceEnd) : input.ends_at ?? null,
      address: input.address ?? null,
      suburb: input.suburb ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      cost: input.cost ?? null,
      registration_url: input.registration_url ?? null,
      description: input.description || "",
      is_active: input.is_active,
      details_last_updated: input.details_last_updated ?? null,
      linked_place_id: input.linked_place_id ?? null,
      organizer_name: input.organizer_name,
      location_name: input.location_name ?? null,
      external_url: input.external_url ?? null,
      contact_name: input.contact_name ?? null,
      contact_phone: input.contact_phone ?? null,
      contact_email: input.contact_email ?? null,
    };
  });
}

export async function addFoodPlace(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = addFoodSchema.parse(rawForm(formData));
  await assertSlugAvailable("places", input.slug);

  const supabase = createSupabaseAdminClient();

  const { data: place, error: placeError } = await supabase
    .from("places")
    .insert({
      mode: "food",
      category: input.category,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      cuisine: input.cuisine ?? null,
      address: input.address,
      suburb: input.suburb ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      is_active: input.is_active,
    })
    .select("id, name, slug")
    .single();

  if (placeError || !place) {
    throw new Error(placeError?.message || "Could not create place.");
  }

  const { error: foodError } = await supabase.from("food_details").insert({
    place_id: place.id,
    halal_meat_coverage: input.halal_meat_coverage,
    halal_certified: input.halal_certified,
    halal_certificate_expiry: input.halal_certificate_expiry ?? null,
    hand_slaughtered: input.hand_slaughtered,
    pork_status: input.pork_status,
    alcohol_status: input.alcohol_status,
    cross_contamination_risk: input.cross_contamination_risk,
    verification_source: input.verification_source,
    confidence_level: input.confidence_level,
    halal_notes: input.halal_notes ?? null,
    details_last_updated: input.details_last_updated ?? null,
    no_pork: input.pork_status === "none_served",
    sells_pork: input.pork_status === "served",
    no_alcohol: input.alcohol_status === "none_served",
    sells_alcohol: input.alcohol_status === "served",
  });

  if (foodError) {
    await supabase.from("places").update({ is_active: false }).eq("id", place.id);
    throw new Error(`Place was created but food details failed. The place was deactivated. ${foodError.message}`);
  }

  await writeAuditLog({
    admin,
    action: "place.created",
    entityType: "food_place",
    entityId: place.id,
    afterData: { place, food_details: input },
  });

  revalidatePath("/add/food");
  redirect(`/add/food?created=${encodeURIComponent(place.name)}`);
}

export async function addPrayerPlace(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = addPrayerSchema.parse(rawForm(formData));
  await assertSlugAvailable("places", input.slug);

  const supabase = createSupabaseAdminClient();

  const { data: place, error: placeError } = await supabase
    .from("places")
    .insert({
      mode: "prayer",
      category: input.category,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      address: input.address,
      suburb: input.suburb ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      is_active: input.is_active,
    })
    .select("id, name, slug")
    .single();

  if (placeError || !place) {
    throw new Error(placeError?.message || "Could not create prayer place.");
  }

  const { error: prayerError } = await supabase.from("prayer_details").insert({
    place_id: place.id,
    daily_prayers: input.daily_prayers,
    jummah: input.jummah,
    women_area: input.women_area,
    wudu: input.wudu,
    parking_notes: input.parking_notes ?? null,
    prayer_times_source: input.prayer_times_source,
    details_last_updated: input.details_last_updated ?? null,
    prayer_place_type: input.prayer_place_type,
    official_prayer_times_url: input.official_prayer_times_url ?? null,
    multiple_jummah_sessions: input.multiple_jummah_sessions,
    bathrooms_available: input.bathrooms_available,
    parking_available: input.parking_available,
    wheelchair_accessible: input.wheelchair_accessible,
    public_access: input.public_access,
    capacity_level: input.capacity_level,
    access_notes: input.access_notes ?? null,
    facilities_notes: input.facilities_notes ?? null,
    prayer_notes: input.prayer_notes ?? null,
    verification_source: input.verification_source,
    confidence_level: input.confidence_level,
  });

  if (prayerError) {
    await supabase.from("places").update({ is_active: false }).eq("id", place.id);
    throw new Error(`Place was created but prayer details failed. The place was deactivated. ${prayerError.message}`);
  }

  await writeAuditLog({
    admin,
    action: "place.created",
    entityType: "prayer_place",
    entityId: place.id,
    afterData: { place, prayer_details: input },
  });

  revalidatePath("/add/prayer");
  redirect(`/add/prayer?created=${encodeURIComponent(place.name)}`);
}

export async function addCommunityEvent(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = addEventSchema.parse(rawForm(formData));
  await assertLinkedPlaceAvailable(input.linked_place_id);

  const eventRows = buildEventRows(input);

  for (const eventRow of eventRows) {
    await assertSlugAvailable("community_events", eventRow.slug);
  }

  const supabase = createSupabaseAdminClient();
  const { data: events, error } = await supabase
    .from("community_events")
    .insert(eventRows)
    .select("id, title, slug");

  if (error || !events?.length) {
    throw new Error(error?.message || "Could not create event.");
  }

  await writeAuditLog({
    admin,
    action: "community_event.created",
    entityType: "community_event",
    entityId: events.length === 1 ? events[0].id : null,
    afterData: {
      ...input,
      repeat_frequency: input.repeat_frequency,
      repeat_count: input.repeat_count,
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
      })),
    },
  });

  revalidatePath("/add/event");
  const message = events.length === 1 ? events[0].title : `${events.length} events`;
  redirect(`/add/event?created=${encodeURIComponent(message)}`);
}

export async function addAnnouncement(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = addAnnouncementSchema.parse(rawForm(formData));
  const supabase = createSupabaseAdminClient();

  const insertData: Record<string, unknown> = {
    mode: input.mode,
    item_type: input.item_type,
    title: input.title,
    body: input.body,
    location_name: input.location_name ?? null,
    suburb: input.suburb ?? null,
    linked_place_id: input.linked_place_id ?? null,
    linked_event_id: input.linked_event_id ?? null,
    action_label: input.action_label ?? null,
    action_url: input.action_url ?? null,
    priority: input.priority,
    visible_until: input.visible_until ?? null,
    is_active: input.is_active,
  };

  if (input.visible_from) {
    insertData.visible_from = input.visible_from;
  }

  const { data: item, error } = await supabase
    .from("whats_new_items")
    .insert(insertData)
    .select("id, title")
    .single();

  if (error || !item) {
    throw new Error(error?.message || "Could not create announcement.");
  }

  await writeAuditLog({
    admin,
    action: "whats_new_item.created",
    entityType: "whats_new_item",
    entityId: item.id,
    afterData: input,
  });

  revalidatePath("/add/announcement");
  redirect(`/add/announcement?created=${encodeURIComponent(item.title)}`);
}
