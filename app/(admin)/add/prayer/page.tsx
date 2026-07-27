import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { addPrayerPlace } from "@/lib/actions/add-actions";
import { capacityLevels, confidenceLevels, prayerCategories, prayerTimesSources, prayerVerificationSources, yesNoUnknown } from "@/lib/validation/schemas";

function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option value={value} key={value}>{value}</option>);
}

export default async function AddPrayerPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const prayerPlaceTypes = [...prayerCategories, "unknown"] as const;

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Add Prayer Place</h1>
          <p className="muted">Creates a `places` row and matching `prayer_details` row.</p>
        </div>
        <Link className="button secondary" href="/add">Back</Link>
      </div>

      {params.created ? <div className="status">Created {params.created}. The form has been cleared.</div> : null}

      <form action={addPrayerPlace} className="form">
        <section className="card">
          <h2>Place details</h2>
          <div className="field-grid">
            <div className="field"><label>Name</label><input name="name" required /></div>
            <div className="field"><label>Slug optional</label><input name="slug" placeholder="auto generated if empty" /></div>
            <div className="field"><label>Category</label><select name="category" required><Options values={prayerCategories} /></select></div>
            <div className="field"><label>Address</label><input name="address" required /></div>
            <div className="field"><label>Suburb</label><input name="suburb" /></div>
            <div className="field"><label>Phone</label><input name="phone" /></div>
            <div className="field"><label>Website</label><input name="website" type="url" /></div>
            <div className="field"><label>Latitude</label><input name="latitude" type="number" step="any" min="-90" max="90" required /></div>
            <div className="field"><label>Longitude</label><input name="longitude" type="number" step="any" min="-180" max="180" required /></div>
            <div className="field"><label>Active</label><select name="is_active" defaultValue="true"><option value="true">true</option><option value="false">false</option></select></div>
          </div>
          <div className="field"><label>Description</label><textarea name="description" /></div>
        </section>

        <section className="card">
          <h2>Prayer details</h2>
          <div className="field-grid">
            <div className="field"><label>Prayer place type</label><select name="prayer_place_type" defaultValue="unknown"><Options values={prayerPlaceTypes} /></select></div>
            <div className="field"><label>Daily prayers</label><select name="daily_prayers" defaultValue="false"><option value="true">true</option><option value="false">false</option></select></div>
            <div className="field"><label>Jummah</label><select name="jummah" defaultValue="false"><option value="true">true</option><option value="false">false</option></select></div>
            <div className="field"><label>Multiple jummah sessions</label><select name="multiple_jummah_sessions" defaultValue="false"><option value="true">true</option><option value="false">false</option></select></div>
            <div className="field"><label>Women area</label><select name="women_area" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Wudu</label><select name="wudu" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Bathrooms</label><select name="bathrooms_available" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Parking available</label><select name="parking_available" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Wheelchair accessible</label><select name="wheelchair_accessible" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Public access</label><select name="public_access" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Capacity level</label><select name="capacity_level" defaultValue="unknown"><Options values={capacityLevels} /></select></div>
            <div className="field"><label>Prayer times source</label><select name="prayer_times_source" defaultValue="submitted"><Options values={prayerTimesSources} /></select></div>
            <div className="field"><label>Official prayer times URL</label><input name="official_prayer_times_url" type="url" /></div>
            <div className="field"><label>Verification source</label><select name="verification_source" defaultValue="admin"><Options values={prayerVerificationSources} /></select></div>
            <div className="field"><label>Confidence level</label><select name="confidence_level" defaultValue="medium"><Options values={confidenceLevels} /></select></div>
            <div className="field"><label>Details last updated</label><input name="details_last_updated" type="date" /></div>
          </div>
          <div className="field"><label>Prayer notes</label><textarea name="prayer_notes" /></div>
          <div className="field"><label>Facilities notes</label><textarea name="facilities_notes" /></div>
          <div className="field"><label>Access notes</label><textarea name="access_notes" /></div>
          <div className="field"><label>Parking notes</label><textarea name="parking_notes" /></div>
        </section>

        <div className="button-row"><SubmitButton>Create Prayer Place</SubmitButton></div>
      </form>
    </>
  );
}
