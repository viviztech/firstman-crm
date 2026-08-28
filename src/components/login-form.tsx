"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");

    const { error: signInError } = await authClient.signIn.email({ email, password });

    if (signInError) {
      setStatus("idle");
      setError("Invalid email or password.");
      setErrorKey((key) => key + 1);
      return;
    }

    setStatus("success");
    router.push(searchParams.get("redirect") ?? "/dashboard");
    router.refresh();
  }

  const isSubmitting = status !== "idle";

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 sm:p-10">
      <div className="w-full max-w-sm">
        <div className="reveal mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
          <Image
            src="/brand/firstman-logo.png"
            alt="FirstMan"
            width={1004}
            height={508}
            priority
            className="h-14 w-auto object-contain"
          />
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Corporate Services CRM
          </p>
        </div>

        <div className="reveal">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in with your FirstMan staff account.
          </p>
        </div>

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="reveal reveal-delay-1 flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 pl-9"
                placeholder="you@firstmancorp.com"
              />
            </div>
          </div>

          <div className="reveal reveal-delay-2 flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <div
              key={errorKey}
              role="alert"
              className="login-shake flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "reveal reveal-delay-3 h-11 w-full gap-2 text-sm font-semibold transition-colors",
              status === "success" && "bg-emerald-600 hover:bg-emerald-600",
            )}
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="size-4" />
                Redirecting…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="reveal reveal-delay-3 mt-8 text-center text-xs text-muted-foreground">
          Staff access only. Contact your administrator if you need an account.
        </p>
      </div>
    </div>
  );
}
