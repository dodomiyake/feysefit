"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

interface LoginCredentialsFormProps {
  email: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  submitting: boolean;
  emailPlaceholder: string;
  submitLabel: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordToggle: () => void;
  onRememberMeChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  notice?: React.ReactNode;
  beforeSubmit?: React.ReactNode;
}

export function LoginCredentialsForm({
  email,
  password,
  showPassword,
  rememberMe,
  submitting,
  emailPlaceholder,
  submitLabel,
  onEmailChange,
  onPasswordChange,
  onShowPasswordToggle,
  onRememberMeChange,
  onSubmit,
  disabled = false,
  notice,
  beforeSubmit,
}: LoginCredentialsFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {notice}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block px-1 text-sm font-medium text-zinc-400">
          Email Address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={emailPlaceholder}
            className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="password" className="text-sm font-medium text-zinc-400">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-highlight hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••"
            className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-12 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={onShowPasswordToggle}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-accent"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5 px-1 pt-1">
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-accent focus:ring-accent/30"
          />
          <label htmlFor="remember" className="text-xs font-semibold text-zinc-400">
            Keep me signed in on this device
          </label>
        </div>
        <p className="pl-6 text-xs leading-relaxed text-zinc-500">
          Don’t select this option on a shared or public device.
        </p>
      </div>

      <p className="px-1 text-xs leading-relaxed text-zinc-500">
        We use secure authentication to protect your measurements, orders and account information.
      </p>

      {beforeSubmit}

      <Button
        type="submit"
        disabled={submitting || disabled}
        className="mt-2 h-12 w-full text-sm shadow-md hover:shadow-lg"
        size="lg"
      >
        {submitting ? "Signing in…" : submitLabel}
      </Button>
    </form>
  );
}
