"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireWriteRole } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "./audit";

const submissionStatuses = ["pending", "in_review", "accepted", "resolved", "rejected"] as const;

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalUuid = z.preprocess(emptyToNull, z.uuid().nullable()).optional();

const updateSubmissionReviewSchema = z.object({
  id: z.uuid(),
  status: z.enum(submissionStatuses),
  admin_notes: z.string().trim().nullable().optional(),
});

const reportIssueSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  mode: z.enum(["food", "prayer", "community"]),
  submission_type: z.enum(["report_wrong_info", "suggest_event", "suggest_place", "general_feedback"]),
  related_place_id: optionalUuid,
  related_event_id: optionalUuid,
  message: z.string().trim().min(1, "Message is required."),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  admin_notes: z.string().trim().nullable().optional(),
});

export type EventStatusActionState = {
  ok: boolean;
  message: string | null;
};

const eventStatusActionSchema = z.object({
  id: z.uuid(),
});

const announcementStatusActionSchema = z.object({
  id: z.uuid(),
});

const deleteCommunityEventSchema = eventStatusActionSchema.extend({
  delete_scope: z.enum(["occurrence", "series"]).default("occurrence"),
});

const cancelCommunityEventSchema = eventStatusActionSchema.extend({
  cancellation_note: z.string().trim().min(1, "Cancellation note is required."),
});

function rawForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function getSubmissionBefore(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id, title, status, admin_notes")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load submission: ${error.message}`);
  }

  if (!data) {
    throw new Error("Submission was not found.");
  }

  return data;
}

async function getAnnouncementBefore(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("whats_new_items")
    .select("id, title, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load announcement: ${error.message}`);
  }

  if (!data) {
    throw new Error("Announcement was not found.");
  }

  return data;
}

async function getCommunityEventBefore(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("community_events")
    .select("id, title, event_status, cancellation_note, cancelled_at, cancelled_by")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load community event: ${error.message}`);
  }

  if (!data) {
    throw new Error("Community event was not found.");
  }

  return data;
}

async function getCommunityEventDeleteTarget(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("community_events")
    .select("id, title, recurrence_series_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load community event: ${error.message}`);
  }

  if (!data) {
    throw new Error("Community event was not found.");
  }

  return data as unknown as { id: string; title: string | null; recurrence_series_id: string | null };
}

async function getCommunityEventsForDelete(input: { id: string; delete_scope: "occurrence" | "series" }) {
  const target = await getCommunityEventDeleteTarget(input.id);
  const supabase = createSupabaseAdminClient();
  const query = supabase
    .from("community_events")
    .select("id, title, slug, starts_at, recurrence_series_id, event_status, cancellation_note, cancelled_at, cancelled_by")
    .order("starts_at", { ascending: true });

  const { data, error } = input.delete_scope === "series" && target.recurrence_series_id
    ? await query.eq("recurrence_series_id", target.recurrence_series_id)
    : await query.eq("id", input.id);

  if (error) {
    throw new Error(`Could not load community events for delete: ${error.message}`);
  }

  return {
    target,
    events: (data ?? []) as unknown as Array<Record<string, unknown>>,
  };
}

async function applyCommunityEventCancellation(input: { id: string; cancellation_note: string }, adminEmail: string) {
  const supabase = createSupabaseAdminClient();
  const { data: event, error } = await supabase
    .from("community_events")
    .update({
      event_status: "cancelled",
      cancellation_note: input.cancellation_note,
      cancelled_at: new Date().toISOString(),
      cancelled_by: adminEmail,
    })
    .eq("id", input.id)
    .select("id, title, event_status, cancellation_note, cancelled_at, cancelled_by")
    .single();

  if (error || !event) {
    throw new Error(error?.message || "Could not cancel event.");
  }

  return event;
}

async function applyCommunityEventRestore(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data: event, error } = await supabase
    .from("community_events")
    .update({
      event_status: "scheduled",
      cancellation_note: null,
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq("id", id)
    .select("id, title, event_status, cancellation_note, cancelled_at, cancelled_by")
    .single();

  if (error || !event) {
    throw new Error(error?.message || "Could not restore event.");
  }

  return event;
}

export async function updateSubmissionReview(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = updateSubmissionReviewSchema.parse(rawForm(formData));
  const before = await getSubmissionBefore(input.id);
  const adminNotes = input.admin_notes?.trim() || null;
  const isClosing = input.status === "accepted" || input.status === "resolved";

  if (isClosing && !adminNotes) {
    throw new Error("Add admin notes before closing a ticket.");
  }

  if (before.status === input.status && (before.admin_notes ?? null) === adminNotes) {
    revalidatePath("/review/submissions");
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: submission, error } = await supabase
    .from("submissions")
    .update({
      status: input.status,
      admin_notes: adminNotes,
    })
    .eq("id", input.id)
    .select("id, title, status, admin_notes")
    .single();

  if (error || !submission) {
    throw new Error(error?.message || "Could not update submission.");
  }

  await writeAuditLog({
    admin,
    action: "submission.review_updated",
    entityType: "submission",
    entityId: submission.id,
    beforeData: before,
    afterData: submission,
  });

  revalidatePath("/review/submissions");
  revalidatePath("/review/event-submissions");
}

async function updateAnnouncementActiveState(formData: FormData, isActive: boolean) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = announcementStatusActionSchema.parse(rawForm(formData));
  const before = await getAnnouncementBefore(input.id);
  const supabase = createSupabaseAdminClient();
  const { data: announcement, error } = await supabase
    .from("whats_new_items")
    .update({ is_active: isActive })
    .eq("id", input.id)
    .select("id, title, is_active")
    .single();

  if (error || !announcement) {
    throw new Error(error?.message || "Could not update announcement.");
  }

  await writeAuditLog({
    admin,
    action: isActive ? "whats_new_item.reactivated" : "whats_new_item.deactivated",
    entityType: "whats_new_item",
    entityId: announcement.id,
    beforeData: before,
    afterData: announcement,
  });

  revalidatePath("/review/announcements");
}

export async function deactivateAnnouncement(formData: FormData) {
  await updateAnnouncementActiveState(formData, false);
}

export async function reactivateAnnouncement(formData: FormData) {
  await updateAnnouncementActiveState(formData, true);
}

export async function reportAdminIssue(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = reportIssueSchema.parse(rawForm(formData));
  const supabase = createSupabaseAdminClient();
  const suggestedData = {
    source: "admin_dashboard",
    priority: input.priority,
    ...(input.related_place_id ? { related_place_id: input.related_place_id } : {}),
    ...(input.related_event_id ? { related_event_id: input.related_event_id } : {}),
  };

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      title: input.title,
      mode: input.mode,
      submission_type: input.submission_type,
      related_place_id: input.related_place_id ?? null,
      related_event_id: input.related_event_id ?? null,
      message: input.message,
      admin_notes: input.admin_notes?.trim() || null,
      submitted_by_name: "Admin",
      submitted_by_email: admin.email,
      status: "pending",
      suggested_data: suggestedData,
    })
    .select("id, title, status")
    .single();

  if (error || !submission) {
    throw new Error(error?.message || "Could not report issue.");
  }

  await writeAuditLog({
    admin,
    action: "submission.created",
    entityType: "submission",
    entityId: submission.id,
    afterData: {
      submission,
      suggested_data: suggestedData,
    },
  });

  revalidatePath("/review/submissions");
  redirect(`/review/report-issue?created=${encodeURIComponent(submission.title)}`);
}

export async function cancelCommunityEvent(
  _previousState: EventStatusActionState,
  formData: FormData
): Promise<EventStatusActionState> {
  try {
    const admin = await requireAdmin();
    requireWriteRole(admin);

    const input = cancelCommunityEventSchema.parse(rawForm(formData));
    const before = await getCommunityEventBefore(input.id);
    const event = await applyCommunityEventCancellation(input, admin.email);

    await writeAuditLog({
      admin,
      action: "community_event.cancelled",
      entityType: "community_event",
      entityId: event.id,
      beforeData: before,
      afterData: event,
    });

    revalidatePath("/review/events");
    revalidatePath(`/review/events/${event.id}`);
    return { ok: true, message: "Event cancelled." };
  } catch (error) {
    return { ok: false, message: getActionErrorMessage(error) };
  }
}

export async function restoreCommunityEvent(
  _previousState: EventStatusActionState,
  formData: FormData
): Promise<EventStatusActionState> {
  try {
    const admin = await requireAdmin();
    requireWriteRole(admin);

    const input = eventStatusActionSchema.parse(rawForm(formData));
    const before = await getCommunityEventBefore(input.id);
    const event = await applyCommunityEventRestore(input.id);

    await writeAuditLog({
      admin,
      action: "community_event.restored",
      entityType: "community_event",
      entityId: event.id,
      beforeData: before,
      afterData: event,
    });

    revalidatePath("/review/events");
    revalidatePath(`/review/events/${event.id}`);
    return { ok: true, message: "Event restored." };
  } catch (error) {
    return { ok: false, message: getActionErrorMessage(error) };
  }
}

export async function cancelCommunityEventFromDetail(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = cancelCommunityEventSchema.parse(rawForm(formData));
  const before = await getCommunityEventBefore(input.id);
  const event = await applyCommunityEventCancellation(input, admin.email);

  await writeAuditLog({
    admin,
    action: "community_event.cancelled",
    entityType: "community_event",
    entityId: event.id,
    beforeData: before,
    afterData: event,
  });

  revalidatePath("/review/events");
  revalidatePath(`/review/events/${event.id}`);
  redirect(`/review/events/${event.id}`);
}

export async function restoreCommunityEventFromDetail(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = eventStatusActionSchema.parse(rawForm(formData));
  const before = await getCommunityEventBefore(input.id);
  const event = await applyCommunityEventRestore(input.id);

  await writeAuditLog({
    admin,
    action: "community_event.restored",
    entityType: "community_event",
    entityId: event.id,
    beforeData: before,
    afterData: event,
  });

  revalidatePath("/review/events");
  revalidatePath(`/review/events/${event.id}`);
  redirect(`/review/events/${event.id}`);
}

export async function deleteCommunityEventFromDetail(formData: FormData) {
  const admin = await requireAdmin();
  requireWriteRole(admin);

  const input = deleteCommunityEventSchema.parse(rawForm(formData));
  const { target, events } = await getCommunityEventsForDelete(input);

  if (events.length === 0) {
    throw new Error("No community events were found to delete.");
  }

  const supabase = createSupabaseAdminClient();
  const ids = events.map((event) => event.id).filter((id): id is string => typeof id === "string");
  const { error } = await supabase.from("community_events").delete().in("id", ids);

  if (error) {
    throw new Error(`Could not delete event: ${error.message}`);
  }

  await writeAuditLog({
    admin,
    action: input.delete_scope === "series" && target.recurrence_series_id
      ? "community_event.series_deleted"
      : "community_event.deleted",
    entityType: "community_event",
    entityId: input.delete_scope === "occurrence" ? input.id : null,
    beforeData: {
      delete_scope: input.delete_scope,
      recurrence_series_id: target.recurrence_series_id,
      events,
    },
  });

  revalidatePath("/review/events");
  redirect("/review/events");
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Invalid form input.";
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
