import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUpdateRegistrationSchema, type AppUpdateRegistrationInput } from "@/lib/validation/schemas";

export type AppUpdateRow = {
  id: string;
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

export type RegisterAppUpdateResult = {
  appUpdate: AppUpdateRow;
  created: boolean;
};

export function parseAppUpdateRegistration(input: unknown): AppUpdateRegistrationInput {
  return appUpdateRegistrationSchema.parse(input);
}

export function appUpdateToDatabase(input: AppUpdateRegistrationInput, registeredBy: string | null) {
  return {
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
  const row = appUpdateToDatabase(input, registeredBy);

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

  const { data, error } = await supabase
    .from("app_updates")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not register app update.");
  }

  const appUpdate = data as AppUpdateRow;
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

export function registrationErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid update registration payload.";
  }

  if (error instanceof Error) return error.message;
  return "Could not register app update.";
}
