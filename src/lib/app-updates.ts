import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  appUpdateRegistrationSchema,
  appUpdateReleaseReservationSchema,
  type AppUpdateRegistrationInput,
  type AppUpdateReleaseReservationInput,
} from "@/lib/validation/schemas";

export type AppUpdateRow = {
  id: string;
  release_number: number;
  eas_update_id: string;
  update_group_id: string | null;
  channel: string;
  branch: string | null;
  runtime_version: string;
  app_version: string | null;
  android_version_code: number | null;
  ios_build_number: string | null;
  platforms: string[];
  message: string | null;
  git_commit_sha: string | null;
  git_branch: string | null;
  published_at: string;
  registered_at: string;
  registered_by: string | null;
  metadata: Record<string, unknown>;
  is_rollback: boolean;
};

export type AppUpdateReleaseReservationRow = {
  id: string;
  release_number: number;
  reservation_token: string;
  requested_channel: string | null;
  requested_platform: string | null;
  requested_runtime_version: string | null;
  requested_app_version: string | null;
  requested_by: string | null;
  created_at: string;
  consumed_at: string | null;
  consumed_app_update_id: string | null;
  metadata: Record<string, unknown>;
};

export type RegisterAppUpdateResult = {
  appUpdate: AppUpdateRow;
  created: boolean;
};

export type ReserveAppUpdateReleaseResult = {
  reservation: AppUpdateReleaseReservationRow;
};

export function parseAppUpdateRegistration(input: unknown): AppUpdateRegistrationInput {
  return appUpdateRegistrationSchema.parse(input);
}

export function parseAppUpdateReleaseReservation(input: unknown): AppUpdateReleaseReservationInput {
  return appUpdateReleaseReservationSchema.parse(input);
}

export function appUpdateToDatabase(
  input: AppUpdateRegistrationInput,
  registeredBy: string | null,
  releaseNumber?: number,
) {
  return {
    ...(releaseNumber ? { release_number: releaseNumber } : {}),
    eas_update_id: input.easUpdateId,
    update_group_id: input.updateGroupId ?? null,
    channel: input.channel,
    branch: input.branch ?? null,
    runtime_version: input.runtimeVersion,
    app_version: input.appVersion ?? null,
    android_version_code: input.androidVersionCode ?? null,
    ios_build_number: input.iosBuildNumber ?? null,
    platforms: input.platforms,
    message: input.message ?? null,
    git_commit_sha: input.gitCommitSha ?? null,
    git_branch: input.gitBranch ?? null,
    published_at: input.publishedAt,
    registered_by: registeredBy,
    metadata: input.metadata,
    is_rollback: input.isRollback,
  };
}

export async function registerAppUpdate(input: AppUpdateRegistrationInput, registeredBy: string | null): Promise<RegisterAppUpdateResult> {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("app_updates")
    .select("*")
    .eq("eas_update_id", input.easUpdateId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not check existing update registration: ${existingError.message}`);
  }

  if (existing) {
    return {
      appUpdate: existing as AppUpdateRow,
      created: false,
    };
  }

  const reservation = input.reservationToken
    ? await getUnconsumedReservation(input.reservationToken, input)
    : null;
  const row = appUpdateToDatabase(input, registeredBy, reservation?.release_number);

  const { data, error } = await supabase
    .from("app_updates")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not register app update.");
  }

  const appUpdate = data as AppUpdateRow;
  if (reservation) {
    const { error: reservationError } = await supabase
      .from("app_update_release_reservations")
      .update({
        consumed_at: new Date().toISOString(),
        consumed_app_update_id: appUpdate.id,
      })
      .eq("id", reservation.id)
      .is("consumed_at", null)
      .select("id")
      .single();

    if (reservationError) {
      throw new Error(`App update registered, but reservation could not be consumed: ${reservationError.message}`);
    }
  }

  await supabase.from("audit_log").insert({
    admin_user_id: null,
    admin_email: registeredBy,
    action: "app_update.registered",
    entity_type: "app_update",
    entity_id: appUpdate.id,
    after_data: {
      app_update: appUpdate,
    },
  });

  return {
    appUpdate,
    created: true,
  };
}

export async function reserveAppUpdateRelease(
  input: AppUpdateReleaseReservationInput,
  requestedBy: string | null,
  reservationToken: string,
): Promise<ReserveAppUpdateReleaseResult> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_update_release_reservations")
    .insert({
      reservation_token: reservationToken,
      requested_channel: input.channel ?? null,
      requested_platform: input.platform ?? null,
      requested_runtime_version: input.runtimeVersion ?? null,
      requested_app_version: input.appVersion ?? null,
      requested_by: requestedBy,
      metadata: input.metadata,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not reserve app update release number.");
  }

  return {
    reservation: data as AppUpdateReleaseReservationRow,
  };
}

function assertReservationMatchesInput(
  reservation: AppUpdateReleaseReservationRow,
  input: AppUpdateRegistrationInput,
) {
  const platform = input.platforms.length === 1 ? input.platforms[0] : null;
  const checks = [
    ["channel", reservation.requested_channel, input.channel],
    ["platform", reservation.requested_platform, platform],
    ["runtime version", reservation.requested_runtime_version, input.runtimeVersion],
    ["app version", reservation.requested_app_version, input.appVersion ?? null],
  ] as const;

  for (const [label, reserved, submitted] of checks) {
    if (reserved && submitted && reserved !== submitted) {
      throw new Error(`Release reservation ${label} does not match this update.`);
    }
  }
}

async function getUnconsumedReservation(
  reservationToken: string,
  input: AppUpdateRegistrationInput,
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_update_release_reservations")
    .select("*")
    .eq("reservation_token", reservationToken)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not check release reservation: ${error.message}`);
  }

  if (!data) throw new Error("Release reservation was not found.");

  const reservation = data as AppUpdateReleaseReservationRow;
  if (reservation.consumed_at) {
    throw new Error("Release reservation has already been consumed.");
  }

  assertReservationMatchesInput(reservation, input);

  return reservation;
}

export function registrationErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid update registration payload.";
  }

  if (error instanceof Error) return error.message;
  return "Could not register app update.";
}
