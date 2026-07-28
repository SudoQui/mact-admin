"use client";

import { useState } from "react";

export type LinkedPlaceOption = {
  id: string;
  name: string;
  mode: string | null;
  category: string | null;
  suburb: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LocationFields = {
  locationName: string;
  address: string;
  suburb: string;
  latitude: string;
  longitude: string;
};

function optionLabel(place: LinkedPlaceOption) {
  return [place.name, place.mode, place.category, place.suburb].filter(Boolean).join(" · ");
}

function fieldsFromPlace(place: LinkedPlaceOption): LocationFields {
  return {
    locationName: place.name,
    address: place.address ?? "",
    suburb: place.suburb ?? "",
    latitude: place.latitude === null ? "" : String(place.latitude),
    longitude: place.longitude === null ? "" : String(place.longitude),
  };
}

export function LinkedPlaceLocationPicker({ places }: { places: LinkedPlaceOption[] }) {
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [fields, setFields] = useState<LocationFields>({
    locationName: "",
    address: "",
    suburb: "",
    latitude: "",
    longitude: "",
  });

  function updateField(field: keyof LocationFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function handlePlaceChange(value: string) {
    setSelectedPlaceId(value);

    if (!value) return;

    const place = places.find((candidate) => candidate.id === value);
    if (!place) return;

    setFields(fieldsFromPlace(place));
  }

  return (
    <>
      <div className="field">
        <label>Linked MACT place</label>
        <select name="linked_place_id" value={selectedPlaceId} onChange={(event) => handlePlaceChange(event.target.value)}>
          <option value="">No linked MACT place</option>
          {places.map((place) => (
            <option value={place.id} key={place.id}>
              {optionLabel(place)}
            </option>
          ))}
        </select>
      </div>
      <div className="field"><label>Location name</label><input name="location_name" value={fields.locationName} onChange={(event) => updateField("locationName", event.target.value)} /></div>
      <div className="field"><label>Address</label><input name="address" value={fields.address} onChange={(event) => updateField("address", event.target.value)} /></div>
      <div className="field"><label>Suburb</label><input name="suburb" value={fields.suburb} onChange={(event) => updateField("suburb", event.target.value)} /></div>
      <div className="field"><label>Latitude optional</label><input name="latitude" type="number" step="any" min="-90" max="90" value={fields.latitude} onChange={(event) => updateField("latitude", event.target.value)} /></div>
      <div className="field"><label>Longitude optional</label><input name="longitude" type="number" step="any" min="-180" max="180" value={fields.longitude} onChange={(event) => updateField("longitude", event.target.value)} /></div>
    </>
  );
}
