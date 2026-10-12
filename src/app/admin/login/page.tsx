import { signIn } from "./actions";
import "../admin.css";

export const instant = false;

const errorMessages: Record<string, string> = {
  missing: "Enter both email and password.",
  invalid: "Incorrect email or password.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="admin-auth-page">
      <form action={signIn} className="admin-auth-form">
        <h1>The Gents Games &amp; Entertainment</h1>
        <p className="admin-auth-subtitle">Admin sign in</p>

        {error && <p className="admin-auth-error">{errorMessages[error] ?? "Sign-in failed."}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />

        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
