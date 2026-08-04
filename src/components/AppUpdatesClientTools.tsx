"use client";

import { useActionState, useMemo, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { manuallyRegisterAppUpdate, type ManualAppUpdateState } from "@/lib/actions/app-update-actions";
import type { AppUpdateRow } from "@/lib/app-updates";

type Props = {
  latestUpdates: AppUpdateRow[];
  updates: AppUpdateRow[];
};

const initialManualState: ManualAppUpdateState = {
  ok: false,
  message: null,
};

function shortId(value: string) {
  return value.slice(0, 8);
}

function diagnosticString(update: AppUpdateRow) {
  const version = update.app_version ? `MACT ${update.app_version}` : "MACT";
  const build = update.android_version_code ?? update.ios_build_number;
  const buildLabel = build ? ` (${build})` : "";
  const channel = update.channel.charAt(0).toUpperCase() + update.channel.slice(1);
  return `${version}${buildLabel} - ${channel} - Runtime ${update.runtime_version} - Update ${shortId(update.eas_update_id)}`;
}

function parseTesterDiagnostic(value: string) {
  const parts = value.split(/\s*(?:·|-)\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 3 || !parts[0].toLowerCase().startsWith("mact ")) return null;

  const appMatch = parts[0].match(/^MACT\s+([^\s(]+)(?:\s+\(([^)]+)\))?$/i);
  const channel = parts[1]?.toLowerCase();
  const runtimePart = parts.find((part) => /^runtime\s+/i.test(part));
  const updatePart = parts.find((part) => /^update\s+/i.test(part));
  const updateId = updatePart?.replace(/^update\s+/i, "").trim().toLowerCase();

  if (!appMatch || !channel || !updateId || !/^[0-9a-f-]{4,36}$/i.test(updateId)) return null;

  return {
    appVersion: appMatch[1],
    build: appMatch[2] ?? null,
    channel,
    runtimeVersion: runtimePart?.replace(/^runtime\s+/i, "").trim() || null,
    updateId,
  };
}

function compareTesterDiagnostic(value: string, updates: AppUpdateRow[], latestUpdates: AppUpdateRow[]) {
  const parsed = parseTesterDiagnostic(value);
  if (!parsed) return "Insufficient information to compare.";

  const matchingUpdate = updates.find((update) => (
    update.eas_update_id.toLowerCase() === parsed.updateId
    || update.eas_update_id.toLowerCase().startsWith(parsed.updateId)
  ));

  if (matchingUpdate) {
    const latestForRuntime = latestUpdates.find((update) => (
      update.channel === matchingUpdate.channel
      && update.runtime_version === matchingUpdate.runtime_version
    ));

    if (!latestForRuntime) return "Insufficient information to compare.";
    if (latestForRuntime.eas_update_id === matchingUpdate.eas_update_id) {
      return "Tester appears to be running the latest registered update.";
    }

    return "Tester is running an older registered update.";
  }

  if (!parsed.runtimeVersion) return "Insufficient information to compare.";

  const latestForTesterRuntime = latestUpdates.find((update) => (
    update.channel === parsed.channel
    && update.runtime_version === parsed.runtimeVersion
  ));
  const latestForChannel = latestUpdates.find((update) => update.channel === parsed.channel);

  if (latestForChannel && latestForChannel.runtime_version !== parsed.runtimeVersion) {
    return "Runtime differs; this update may not be compatible with the latest publication.";
  }

  if (latestForTesterRuntime) return "Update ID is not present in the dashboard registry.";
  return "Insufficient information to compare.";
}

export function AppUpdateCopyActions({ update }: { update: AppUpdateRow }) {
  return (
    <div className="table-actions">
      <CopyButton label="Copy full ID" value={update.eas_update_id} />
      <CopyButton label="Copy diagnostic" value={diagnosticString(update)} />
    </div>
  );
}

export function AppUpdatesClientTools({ latestUpdates, updates }: Props) {
  const [diagnostic, setDiagnostic] = useState("");
  const [manualState, manualAction] = useActionState(manuallyRegisterAppUpdate, initialManualState);
  const comparison = useMemo(
    () => diagnostic.trim() ? compareTesterDiagnostic(diagnostic, updates, latestUpdates) : null,
    [diagnostic, latestUpdates, updates],
  );

  return (
    <div className="release-tool-grid">
      <section className="card">
        <h2>Compare tester details</h2>
        <div className="field">
          <label>Tester diagnostic string</label>
          <textarea
            onChange={(event) => setDiagnostic(event.target.value)}
            placeholder="MACT 1.0.0 (27) - Production - Runtime 1.0.0 - Update 56fb0f2a"
            value={diagnostic}
          />
        </div>
        {comparison ? <p className="status">{comparison}</p> : null}
      </section>

      <section className="card">
        <h2>Manual registration fallback</h2>
        {manualState.message ? (
          <p className={manualState.ok ? "status" : "action-error"}>{manualState.message}</p>
        ) : null}
        <form action={manualAction} className="form">
          <div className="field-grid">
            <div className="field"><label>EAS Update ID</label><input name="easUpdateId" required /></div>
            <div className="field"><label>Update group ID optional</label><input name="updateGroupId" /></div>
            <div className="field"><label>Channel</label><input name="channel" required /></div>
            <div className="field"><label>Branch optional</label><input name="branch" /></div>
            <div className="field"><label>Runtime version</label><input name="runtimeVersion" required /></div>
            <div className="field"><label>App version optional</label><input name="appVersion" /></div>
            <div className="field"><label>Android version code optional</label><input name="androidVersionCode" type="number" /></div>
            <div className="field"><label>iOS build number optional</label><input name="iosBuildNumber" /></div>
            <div className="field"><label>Published time</label><input name="publishedAt" placeholder="2026-08-03T12:00:00Z" required /></div>
            <div className="field"><label>Git commit SHA optional</label><input name="gitCommitSha" /></div>
            <div className="field"><label>Git branch optional</label><input name="gitBranch" /></div>
          </div>
          <div className="tag-checkbox-grid">
            <label className="tag-checkbox"><input name="platforms" type="checkbox" value="android" /> Android</label>
            <label className="tag-checkbox"><input name="platforms" type="checkbox" value="ios" /> iOS</label>
            <label className="tag-checkbox"><input name="isRollback" type="checkbox" value="true" /> Rollback</label>
          </div>
          <div className="field"><label>Message optional</label><textarea name="message" /></div>
          <div className="field"><label>Metadata JSON optional</label><textarea name="metadata" placeholder="{&quot;source&quot;:&quot;incident&quot;}" /></div>
          <label className="tag-checkbox"><input name="confirm_registration" type="checkbox" value="true" /> Confirm manual registration</label>
          <button className="button" type="submit">Register update</button>
        </form>
      </section>
    </div>
  );
}
