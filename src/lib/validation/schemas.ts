import { z } from "zod";
import { makeSlug } from "@/lib/utils/slug";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalText = z.preprocess(emptyToNull, z.string().trim().min(1).nullable()).optional();
const optionalDate = z.preprocess(emptyToNull, z.string().nullable()).optional();
const optionalUrl = z.preprocess(emptyToNull, z.string().trim().url().nullable()).optional();
const requiredText = z.string().trim().min(1, "Required");
const optionalNumber = z.preprocess(emptyToNull, z.coerce.number().nullable()).optional();
const requiredLatitude = z.coerce.number().min(-90).max(90);
const requiredLongitude = z.coerce.number().min(-180).max(180);
const boolFromString = z.enum(["true", "false"]).transform((value) => value === "true");
const optionalUuid = z.preprocess(emptyToNull, z.uuid().nullable()).optional();

export const foodCategories = ["restaurant", "cafe", "butcher", "grocery", "dessert"] as const;
export const prayerCategories = ["mosque", "musallah", "jummah_location", "prayer_room", "community_centre", "university"] as const;
export const yesNoUnknown = ["yes", "no", "unknown"] as const;
export const halalMeatCoverage = ["only_chicken", "only_beef", "both", "unknown"] as const;
export const porkAlcoholStatus = ["none_served", "served", "unknown"] as const;
export const verificationSources = ["admin", "owner", "certificate", "community", "unknown"] as const;
export const prayerVerificationSources = ["admin", "owner", "official", "community", "unknown"] as const;
export const confidenceLevels = ["high", "medium", "low"] as const;
export const eventTypes = ["class", "event", "announcement", "lecture", "khutbah", "jamaat", "fundraiser", "youth", "sisters", "brothers", "family", "other"] as const;
export const repeatFrequencies = ["none", "daily", "weekly", "fortnightly", "monthly"] as const;
export const recurrenceSeriesModes = ["none", "new", "existing"] as const;
export const whatsNewModes = ["food", "prayer", "community", "global"] as const;
export const whatsNewTypes = ["announcement", "promotion", "event", "alert", "app_update"] as const;
export const priorities = ["normal", "important", "urgent"] as const;
export const capacityLevels = ["small", "medium", "large", "unknown"] as const;
export const prayerTimesSources = ["admin", "submitted", "official", "unknown"] as const;

export const addFoodSchema = z.object({
  name: requiredText,
  slug: z.string().trim().optional(),
  category: z.enum(foodCategories),
  cuisine: optionalText,
  description: optionalText,
  address: requiredText,
  suburb: optionalText,
  phone: optionalText,
  website: optionalUrl,
  latitude: requiredLatitude,
  longitude: requiredLongitude,
  is_active: boolFromString.prefault("true"),
  halal_meat_coverage: z.enum(halalMeatCoverage).default("unknown"),
  halal_certified: boolFromString.prefault("false"),
  halal_certificate_expiry: optionalDate,
  hand_slaughtered: z.enum(yesNoUnknown).default("unknown"),
  pork_status: z.enum(porkAlcoholStatus).default("unknown"),
  alcohol_status: z.enum(porkAlcoholStatus).default("unknown"),
  cross_contamination_risk: z.enum(yesNoUnknown).default("unknown"),
  verification_source: z.enum(verificationSources).default("unknown"),
  confidence_level: z.enum(confidenceLevels).default("low"),
  halal_notes: optionalText,
  details_last_updated: optionalDate,
}).transform((data) => ({
  ...data,
  slug: data.slug?.trim() || makeSlug(data.name),
}));

export const addPrayerSchema = z.object({
  name: requiredText,
  slug: z.string().trim().optional(),
  category: z.enum(prayerCategories),
  description: optionalText,
  address: requiredText,
  suburb: optionalText,
  phone: optionalText,
  website: optionalUrl,
  latitude: requiredLatitude,
  longitude: requiredLongitude,
  is_active: boolFromString.prefault("true"),
  daily_prayers: boolFromString.prefault("false"),
  jummah: boolFromString.prefault("false"),
  women_area: z.enum(yesNoUnknown).default("unknown"),
  wudu: z.enum(yesNoUnknown).default("unknown"),
  parking_notes: optionalText,
  prayer_times_source: z.enum(prayerTimesSources).default("submitted"),
  details_last_updated: optionalDate,
  prayer_place_type: z.enum([...prayerCategories, "unknown"] as const).default("unknown"),
  official_prayer_times_url: optionalUrl,
  multiple_jummah_sessions: boolFromString.prefault("false"),
  bathrooms_available: z.enum(yesNoUnknown).default("unknown"),
  parking_available: z.enum(yesNoUnknown).default("unknown"),
  wheelchair_accessible: z.enum(yesNoUnknown).default("unknown"),
  public_access: z.enum(yesNoUnknown).default("unknown"),
  capacity_level: z.enum(capacityLevels).default("unknown"),
  access_notes: optionalText,
  facilities_notes: optionalText,
  prayer_notes: optionalText,
  verification_source: z.enum(prayerVerificationSources).default("admin"),
  confidence_level: z.enum(confidenceLevels).default("medium"),
}).transform((data) => ({
  ...data,
  slug: data.slug?.trim() || makeSlug(data.name),
}));

export const addEventSchema = z.object({
  title: requiredText,
  slug: z.string().trim().optional(),
  host_name: optionalText,
  event_type: z.enum(eventTypes),
  starts_at: requiredText,
  ends_at: optionalText,
  address: optionalText,
  suburb: optionalText,
  latitude: optionalNumber,
  longitude: optionalNumber,
  cost: optionalText,
  registration_url: optionalUrl,
  description: z.string().trim().default(""),
  is_active: boolFromString.prefault("true"),
  details_last_updated: optionalDate,
  linked_place_id: optionalUuid,
  organizer_name: requiredText,
  location_name: optionalText,
  external_url: optionalUrl,
  contact_name: optionalText,
  contact_phone: optionalText,
  contact_email: optionalText,
  repeat_frequency: z.enum(repeatFrequencies).prefault("none"),
  repeat_count: z.coerce.number().int().min(1).max(52).prefault("1"),
  recurrence_series_mode: z.enum(recurrenceSeriesModes).prefault("none"),
  recurrence_series_id: optionalUuid,
}).transform((data) => ({
  ...data,
  slug: data.slug?.trim() || makeSlug(data.title),
  repeat_count: data.repeat_frequency === "none" ? 1 : data.repeat_count,
})).refine(
  (data) => data.recurrence_series_mode !== "existing" || Boolean(data.recurrence_series_id),
  {
    message: "Existing series ID is required.",
    path: ["recurrence_series_id"],
  }
);

export const addAnnouncementSchema = z.object({
  mode: z.enum(whatsNewModes),
  item_type: z.enum(whatsNewTypes).default("announcement"),
  title: requiredText.max(160),
  body: requiredText.max(4000),
  location_name: optionalText,
  suburb: optionalText,
  linked_place_id: optionalText,
  linked_event_id: optionalText,
  action_label: optionalText,
  action_url: optionalUrl,
  priority: z.enum(priorities).default("normal"),
  visible_from: optionalText,
  visible_until: optionalText,
  is_active: boolFromString.prefault("true"),
});
