import { signIn } from "@/lib/actions/auth-actions";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const error = params.error;

  return (
    <main className="login-shell">
      <section className="card login-card">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand">MACT Admin</div>
            <p className="brand-subtitle">Private dashboard for trusted Muslims ACT data.</p>
          </div>
        </div>
        <div className="login-brand-note">
          <span className="powered-pill">Powered by SudoLabs</span>
          <span>Applied software, AI and systems engineering.</span>
        </div>

        {error === "not_admin" ? (
          <div className="warning">Your login worked, but this account is not allowlisted as an admin.</div>
        ) : null}

        {error === "invalid" ? <div className="warning">Login failed. Check the email and password.</div> : null}
        {error === "missing" ? <div className="warning">Email and password are required.</div> : null}

        <form action={signIn} className="form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="button" type="submit">Login</button>
        </form>
      </section>
    </main>
  );
}
