import { Suspense } from "react";
import { LoginBrandPanel } from "@/components/login-brand-panel";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <LoginBrandPanel />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
