import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, MessageCircle, UserRound } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "./AuthImagePattern";

// eslint-disable-next-line react/prop-types
const AuthForm = ({ isSignUp = false }) => {
  const { login, signup, isLoggingIn, isSigningUp } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const busy = isSignUp ? isSigningUp : isLoggingIn;
  const update = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });
  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    const data = { email: formData.email.trim(), password: formData.password };
    if (isSignUp) signup({ ...data, fullName: formData.fullName.trim() });
    else login(data);
  };
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-[1440px] gap-8 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
      <section className="page-enter flex items-center justify-center px-2 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle size={27} strokeWidth={1.8} /></div>
          <p className="eyebrow mb-3">{isSignUp ? "Your people. Your place." : "Good to see you again"}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{isSignUp ? "Start something good." : "Welcome back."}</h1>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-base-content/60">{isSignUp ? "Create an account and bring your conversations to life." : "Sign in to pick up where you left off."}</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium">Full name</label>
              <div className="relative"><UserRound className="pointer-events-none absolute left-4 top-4 size-4 text-base-content/40" /><input id="fullName" name="fullName" autoComplete="name" required maxLength={80} pattern=".*\S.*" title="Enter your full name" placeholder="Your name" className="auth-input" value={formData.fullName} onChange={update} disabled={busy} /></div>
            </div>}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
              <div className="relative"><Mail className="pointer-events-none absolute left-4 top-4 size-4 text-base-content/40" /><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="auth-input" value={formData.email} onChange={update} disabled={busy} /></div>
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-4 size-4 text-base-content/40" />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={isSignUp ? 6 : undefined} placeholder={isSignUp ? "Create a password" : "Enter your password"} className="auth-input pr-12" value={formData.password} onChange={update} disabled={busy} aria-describedby={isSignUp ? "password-hint" : undefined} />
                <button type="button" className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-base-content/40 hover:bg-base-200 hover:text-base-content" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              {isSignUp && <p id="password-hint" className="mt-2 text-xs text-base-content/50">Use at least 6 characters.</p>}
            </div>
            <button type="submit" className="btn btn-primary h-12 w-full gap-3 shadow-lg shadow-primary/10" disabled={busy}>
              {busy ? <><Loader2 size={18} className="animate-spin" />{isSignUp ? "Creating your account…" : "Signing you in…"}</> : <>{isSignUp ? "Create account" : "Sign in"}<ArrowRight size={17} /></>}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-base-content/60">{isSignUp ? "Already part of the conversation?" : "New to ChitChat?"}{" "}<Link to={isSignUp ? "/login" : "/signup"} className="link link-primary font-medium underline-offset-4">{isSignUp ? "Sign in" : "Create an account"}</Link></p>
          <div className="mt-10 flex items-center justify-center gap-2 border-t border-base-content/10 pt-5 text-xs text-base-content/40"><MessageCircle size={13} /> A space for everyday connection.</div>
        </div>
      </section>
      <AuthImagePattern title={isSignUp ? "Great conversations start with a hello." : "Small messages. Real connections."} subtitle="From quick check-ins to long catch-ups, keep your favorite people close. Chat, share, and connect face to face, all in one place." />
    </main>
  );
};
export default AuthForm;
