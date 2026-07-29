import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Welcome back</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{user.name}</CardContent>
      </Card>
    </div>
  );
}
