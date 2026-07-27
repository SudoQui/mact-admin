import Link from "next/link";
import { signOut } from "@/lib/actions/auth-actions";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div className="brand">MACT</div>
        <div className="brand-subtitle">Admin dashboard</div>

        <nav className="nav-list">
          <Link className="nav-link" href="/dashboard">Dashboard</Link>
          <Link className="nav-link" href="/add">Add New</Link>
          <a className="nav-link" href="https://supabase.com/dashboard/project/vogcmwmwttaisxomxtbo" target="_blank" rel="noreferrer">Supabase</a>
          <a className="nav-link" href="https://play.google.com/console" target="_blank" rel="noreferrer">Google Play Console</a>
          <a className="nav-link" href="https://appstoreconnect.apple.com" target="_blank" rel="noreferrer">App Store Connect</a>
        </nav>

        <div className="dev-links">
          <p className="muted">Signed in as<br />{admin.email}</p>
          <form action={signOut}>
            <button className="button secondary" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
