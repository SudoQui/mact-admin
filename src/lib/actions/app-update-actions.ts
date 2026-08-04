"use server";

import { revalidatePath } from "next/cache";
import { parseAppUpdateRegistration, registerAppUpdate, registrationErrorMessage } from "@/lib/app-updates";
import { requireAdmin, requireWriteRole } from "@/lib/auth/require-admin";

export type ManualAppUpdateState = {
  ok: boolean;
  message: string | null;
};

function rawForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function platformsFromForm(formData: FormData) {
  return formData
    .getAll("platforms")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function parseMetadata(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return {};

  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

export async function manuallyRegisterAppUpdate(
  _previousState: ManualAppUpdateState,
  formData: FormData,
): Promise<ManualAppUpdateState> {
  try {
    const admin = await requireAdmin();
    requireWriteRole(admin);

    if (formData.get("confirm_registration") !== "true") {
      return { ok: false, message: "Confirm this manual registration before saving." };
    }

    const raw = rawForm(formData);
    const metadata = {
      ...parseMetadata(raw.metadata),
      registration_source: "manual",
    };
    const input = parseAppUpdateRegistration({
      ...raw,
      easUpdateId: raw.easUpdateId,
      updateGroupId: raw.updateGroupId,
      runtimeVersion: raw.runtimeVersion,
      appVersion: raw.appVersion,
      androidVersionCode: raw.androidVersionCode,
      iosBuildNumber: raw.iosBuildNumber,
      gitCommitSha: raw.gitCommitSha,
      gitBranch: raw.gitBranch,
      publishedAt: raw.publishedAt,
      isRollback: raw.isRollback === "true",
      platforms: platformsFromForm(formData),
      metadata,
    });
    const result = await registerAppUpdate(input, admin.email);

    revalidatePath("/releases/eas-updates");
    return {
      ok: true,
      message: result.created ? "EAS update registered." : "EAS update was already registered.",
    };
  } catch (error) {
    return { ok: false, message: registrationErrorMessage(error) };
  }
}
