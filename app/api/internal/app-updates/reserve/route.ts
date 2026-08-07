import { randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  parseAppUpdateReleaseReservation,
  reserveAppUpdateRelease,
  registrationErrorMessage,
} from "@/lib/app-updates";
import { requiredEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

function secureEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getSubmittedSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-mact-release-registration-secret")?.trim() ?? "";
}

function metadataFromBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};

  const metadata = (body as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  return metadata as Record<string, unknown>;
}

export async function POST(request: Request) {
  let expectedSecret: string;

  try {
    expectedSecret = requiredEnv("MACT_RELEASE_REGISTRATION_SECRET");
  } catch {
    return NextResponse.json({ ok: false, error: "Release registration is not configured." }, { status: 503 });
  }

  const submittedSecret = getSubmittedSecret(request);
  if (!submittedSecret || !secureEquals(submittedSecret, expectedSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const reservationToken = randomBytes(32).toString("base64url");
    const input = parseAppUpdateReleaseReservation({
      ...((body && typeof body === "object" && !Array.isArray(body)) ? body as Record<string, unknown> : {}),
      metadata: {
        ...metadataFromBody(body),
        reservation_source: "publish_script",
      },
    });
    const result = await reserveAppUpdateRelease(input, "release-script", reservationToken);

    return NextResponse.json({
      ok: true,
      releaseNumber: result.reservation.release_number,
      reservationToken: result.reservation.reservation_token,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: registrationErrorMessage(error) }, { status: 400 });
  }
}
