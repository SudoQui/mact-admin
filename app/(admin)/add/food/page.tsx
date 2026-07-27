import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { addFoodPlace } from "@/lib/actions/add-actions";
import { confidenceLevels, foodCategories, halalMeatCoverage, porkAlcoholStatus, verificationSources, yesNoUnknown } from "@/lib/validation/schemas";

function Options({ values }: { values: readonly string[] }) {
  return values.map((value) => <option value={value} key={value}>{value}</option>);
}

export default async function AddFoodPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  return (
    <>
      <div className="top-row">
        <div>
          <h1>Add Food Place</h1>
          <p className="muted">Creates a `places` row and matching `food_details` row.</p>
        </div>
        <Link className="button secondary" href="/add">Back</Link>
      </div>

      {params.created ? <div className="status">Created {params.created}. The form has been cleared.</div> : null}

      <form action={addFoodPlace} className="form">
        <section className="card">
          <h2>Place details</h2>
          <div className="field-grid">
            <div className="field"><label>Name</label><input name="name" required /></div>
            <div className="field"><label>Slug optional</label><input name="slug" placeholder="auto generated if empty" /></div>
            <div className="field"><label>Category</label><select name="category" required><Options values={foodCategories} /></select></div>
            <div className="field"><label>Cuisine</label><input name="cuisine" placeholder="Turkish, Afghan, Indian" /></div>
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
          <h2>Halal verification</h2>
          <div className="field-grid">
            <div className="field"><label>Halal meat coverage</label><select name="halal_meat_coverage" defaultValue="unknown"><Options values={halalMeatCoverage} /></select></div>
            <div className="field"><label>Halal certified</label><select name="halal_certified" defaultValue="false"><option value="true">true</option><option value="false">false</option></select></div>
            <div className="field"><label>Certificate expiry</label><input name="halal_certificate_expiry" type="date" /></div>
            <div className="field"><label>Hand slaughtered</label><select name="hand_slaughtered" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Pork status</label><select name="pork_status" defaultValue="unknown"><Options values={porkAlcoholStatus} /></select></div>
            <div className="field"><label>Alcohol status</label><select name="alcohol_status" defaultValue="unknown"><Options values={porkAlcoholStatus} /></select></div>
            <div className="field"><label>Cross contamination risk</label><select name="cross_contamination_risk" defaultValue="unknown"><Options values={yesNoUnknown} /></select></div>
            <div className="field"><label>Verification source</label><select name="verification_source" defaultValue="unknown"><Options values={verificationSources} /></select></div>
            <div className="field"><label>Confidence level</label><select name="confidence_level" defaultValue="low"><Options values={confidenceLevels} /></select></div>
            <div className="field"><label>Details last updated</label><input name="details_last_updated" type="date" /></div>
          </div>
          <div className="field"><label>Halal notes</label><textarea name="halal_notes" /></div>
        </section>

        <div className="button-row"><SubmitButton>Create Food Place</SubmitButton></div>
      </form>
    </>
  );
}
