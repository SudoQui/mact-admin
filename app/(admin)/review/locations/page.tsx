import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const supabaseProjectUrl = "https://supabase.com/dashboard/project/vogcmwmwttaisxomxtbo";

type DetailRecord = Record<string, string | boolean | number | null>;

type PlaceReviewRow = {
  id: string;
  name: string;
  mode: string | null;
  category: string | null;
  suburb: string | null;
  is_active: boolean | null;
  food_details?: DetailRecord | DetailRecord[] | null;
  prayer_details?: DetailRecord | DetailRecord[] | null;
};

function firstDetail(detail: DetailRecord | DetailRecord[] | null | undefined) {
  return Array.isArray(detail) ? detail[0] : detail;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Not set";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(value));
}

function isOlderThan(dateValue: unknown, months: number) {
  if (typeof dateValue !== "string" || !dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);
  return date < threshold;
}

function isExpired(dateValue: unknown) {
  if (typeof dateValue !== "string" || !dateValue) return false;
  return new Date(dateValue) < new Date();
}

function isWithinDays(dateValue: unknown, days: number) {
  if (typeof dateValue !== "string" || !dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);
  return date >= now && date <= threshold;
}

function foodReasons(detail: DetailRecord | null | undefined) {
  if (!detail) return ["Missing food detail record"];
  const reasons: string[] = [];
  if (detail.halal_meat_coverage === "unknown") reasons.push("Halal meat coverage unknown");
  if (detail.hand_slaughtered === "unknown") reasons.push("Hand slaughtered unknown");
  if (detail.pork_status === "unknown") reasons.push("Pork status unknown");
  if (detail.alcohol_status === "unknown") reasons.push("Alcohol status unknown");
  if (detail.cross_contamination_risk === "unknown") reasons.push("Cross contamination risk unknown");
  if (detail.verification_source === "unknown") reasons.push("Verification source unknown");
  if (detail.confidence_level === "low") reasons.push("Low confidence");
  if (!detail.details_last_updated) reasons.push("No last updated date");
  if (isOlderThan(detail.details_last_updated, 6)) reasons.push("Last updated over 6 months ago");
  if (isExpired(detail.halal_certificate_expiry)) reasons.push("Halal certificate expired");
  if (isWithinDays(detail.halal_certificate_expiry, 30)) reasons.push("Halal certificate expires within 30 days");
  return reasons;
}

function prayerReasons(detail: DetailRecord | null | undefined) {
  if (!detail) return ["Missing prayer detail record"];
  const reasons: string[] = [];
  if (detail.women_area === "unknown") reasons.push("Women area unknown");
  if (detail.wudu === "unknown") reasons.push("Wudu unknown");
  if (detail.bathrooms_available === "unknown") reasons.push("Bathrooms unknown");
  if (detail.parking_available === "unknown") reasons.push("Parking unknown");
  if (detail.wheelchair_accessible === "unknown") reasons.push("Wheelchair access unknown");
  if (detail.public_access === "unknown") reasons.push("Public access unknown");
  if (detail.capacity_level === "unknown") reasons.push("Capacity unknown");
  if (detail.prayer_place_type === "unknown") reasons.push("Prayer place type unknown");
  if (detail.confidence_level === "low") reasons.push("Low confidence");
  if (!detail.details_last_updated) reasons.push("No last updated date");
  if (isOlderThan(detail.details_last_updated, 6)) reasons.push("Last updated over 6 months ago");
  return reasons;
}

function reviewReasons(place: PlaceReviewRow) {
  if (place.mode === "food") return foodReasons(firstDetail(place.food_details));
  if (place.mode === "prayer") return prayerReasons(firstDetail(place.prayer_details));
  return [];
}

function confidence(place: PlaceReviewRow) {
  const detail = place.mode === "food" ? firstDetail(place.food_details) : firstDetail(place.prayer_details);
  return typeof detail?.confidence_level === "string" ? detail.confidence_level : "Unknown";
}

function lastUpdated(place: PlaceReviewRow) {
  const detail = place.mode === "food" ? firstDetail(place.food_details) : firstDetail(place.prayer_details);
  return formatDate(detail?.details_last_updated);
}

async function getLocationsNeedingReview() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("places")
    .select("id, name, mode, category, suburb, is_active, food_details(*), prayer_details(*)")
    .order("name");

  if (error) {
    throw new Error(`Could not load locations: ${error.message}`);
  }

  return ((data ?? []) as PlaceReviewRow[])
    .map((place) => ({ place, reasons: reviewReasons(place) }))
    .filter((row) => row.reasons.length > 0);
}

export default async function LocationsReviewPage() {
  const rows = await getLocationsNeedingReview();

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Locations Needing Review</h1>
          <p className="muted">Food and prayer places with incomplete, stale, or low-confidence details.</p>
        </div>
        <Link className="button secondary" href="/review">Back</Link>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mode</th>
                <th>Category</th>
                <th>Suburb</th>
                <th>Active</th>
                <th>Confidence</th>
                <th>Last updated</th>
                <th>Review reasons</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ place, reasons }) => (
                <tr key={place.id}>
                  <td>{place.name}</td>
                  <td>{place.mode}</td>
                  <td>{place.category}</td>
                  <td>{place.suburb ?? "Not set"}</td>
                  <td>{place.is_active ? "true" : "false"}</td>
                  <td><span className="badge">{confidence(place)}</span></td>
                  <td>{lastUpdated(place)}</td>
                  <td>{reasons.join(", ")}</td>
                  <td>
                    <div className="table-actions">
                      <span className="copy-id">Copy ID: {place.id}</span>
                      <a href={supabaseProjectUrl} target="_blank" rel="noreferrer">Open Supabase</a>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>No locations currently need review.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
