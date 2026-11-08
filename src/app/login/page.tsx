import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-10">
      <div className="space-y-2">
        <p className="eyebrow">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      </div>
      <div className="card">
        <LoginForm />
      </div>
    </div>
  );
}
