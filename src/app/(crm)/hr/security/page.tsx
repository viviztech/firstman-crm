import { redirect } from "next/navigation";
import { HrEncryptionRotationForm } from "@/components/hr/hr-encryption-rotation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export default async function HrSecurityPage() {
  const actor = await requireUser();
  if (actor.role !== "super_admin") redirect("/hr");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HR data recovery and rotation</h1>
        <p className="text-sm text-muted-foreground">
          Re-encrypt private HR records after rotating the application secret.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Encryption rotation</CardTitle>
        </CardHeader>
        <CardContent>
          <HrEncryptionRotationForm />
        </CardContent>
      </Card>
    </div>
  );
}
