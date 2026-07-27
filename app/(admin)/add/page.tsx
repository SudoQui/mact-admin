import Link from "next/link";

const addOptions = [
  {
    title: "Add Food Place",
    href: "/add/food",
    description: "Restaurants, cafes, butchers, groceries, and dessert spots.",
  },
  {
    title: "Add Prayer Place",
    href: "/add/prayer",
    description: "Mosques, musallahs, jummah locations, and prayer rooms.",
  },
  {
    title: "Add Community Event",
    href: "/add/event",
    description: "Classes, lectures, fundraisers, youth events, and community programs.",
  },
  {
    title: "Add Announcement",
    href: "/add/announcement",
    description: "What’s new notices for Food, Prayer, Community, or Global.",
  },
];

export default function AddPage() {
  return (
    <>
      <div className="top-row">
        <div>
          <h1>Add New</h1>
          <p className="muted">Choose the type of trusted data you want to add.</p>
        </div>
      </div>

      <section className="grid">
        {addOptions.map((option) => (
          <Link className="card-link" href={option.href} key={option.href}>
            <h2>{option.title}</h2>
            <p className="muted">{option.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
