import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function getCounts() {
  const supabase = createSupabaseAdminClient();
  const [places, events, notices] = await Promise.all([
    supabase.from("places").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("community_events").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("whats_new_items").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    activePlaces: places.count ?? 0,
    activeEvents: events.count ?? 0,
    activeNotices: notices.count ?? 0,
  };
}

export default async function DashboardPage() {
  const counts = await getCounts();

  return (
    <>
      <div className="top-row">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Safe control centre for official MACT data.</p>
        </div>
        <Link className="button" href="/add">Add New</Link>
      </div>

      <section className="grid">
        <div className="card">
          <span className="badge">Places</span>
          <h2>{counts.activePlaces}</h2>
          <p className="muted">Active food and prayer places visible to the app.</p>
        </div>
        <div className="card">
          <span className="badge">Community</span>
          <h2>{counts.activeEvents}</h2>
          <p className="muted">Active community events and announcements.</p>
        </div>
        <div className="card">
          <span className="badge">What’s new</span>
          <h2>{counts.activeNotices}</h2>
          <p className="muted">Active app notices in the inbox.</p>
        </div>
      </section>

      <section className="card dev-links">
        <h2>Developer links</h2>
        <div className="grid">
          <a className="quick-link" href="https://play.google.com/console" target="_blank" rel="noreferrer">Google Play Console</a>
          <a className="quick-link" href="https://appstoreconnect.apple.com" target="_blank" rel="noreferrer">App Store Connect</a>
          <a className="quick-link" href="https://supabase.com/dashboard/project/vogcmwmwttaisxomxtbo" target="_blank" rel="noreferrer">Supabase Project</a>
          <a className="quick-link" href="https://expo.dev" target="_blank" rel="noreferrer">Expo Dashboard</a>
          <a className="quick-link" href="https://github.com/SudoQui" target="_blank" rel="noreferrer">GitHub</a>
          <a className="quick-link" href="https://sudolabs.app" target="_blank" rel="noreferrer">SudoLabs</a>
        </div>
      </section>
    </>
  );
}
