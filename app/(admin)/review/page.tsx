import Link from "next/link";

const reviewCards = [
  {
    title: "Locations needing review",
    href: "/review/locations",
    description: "Food and prayer locations with stale, low-confidence, or incomplete detail records.",
  },
  {
    title: "Submissions",
    href: "/review/submissions",
    description: "Review community-submitted updates, feedback, places, and events.",
  },
  {
    title: "Event submissions",
    href: "/review/event-submissions",
    description: "Review suggested events and prefill the community event creation form.",
  },
  {
    title: "Community events",
    href: "/review/events",
    description: "Find active events with missing location details, stale metadata, or past dates.",
  },
  {
    title: "Announcements",
    href: "/review/announcements",
    description: "Review active, scheduled, expired, and inactive app announcements.",
  },
  {
    title: "Report an issue",
    href: "/review/report-issue",
    description: "Create an admin-side submission for follow-up in the same review queue.",
  },
];

export default function ReviewPage() {
  return (
    <>
      <div className="top-row">
        <div>
          <h1>Review</h1>
          <p className="muted">Admin quality control for MACT data before it reaches the mobile app.</p>
        </div>
      </div>

      <section className="grid">
        {reviewCards.map((card) => (
          <Link className="card card-link" href={card.href} key={card.href}>
            <h2>{card.title}</h2>
            <p className="muted">{card.description}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
