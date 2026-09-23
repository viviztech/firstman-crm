import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listMyPayslips } from "@/services/hr-payslips";

export default async function MyPayslipsPage() {
  const actor = await requireUser();
  const rows = await listMyPayslips(actor.id);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My payslips</h1>
        <p className="text-sm text-muted-foreground">
          Private payroll documents published after payroll approval and posting.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Published payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <div className="divide-y">
              {rows.map((row) => (
                <div className="flex items-center justify-between gap-3 py-4" key={row.id}>
                  <div>
                    <p className="font-semibold">
                      {new Date(`${row.periodMonth}T00:00:00Z`).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Net pay {formatMoney(row.netPayPaise)}
                    </p>
                  </div>
                  <Link
                    href={`/api/hr/payslips/${row.entryId}`}
                    className="text-sm font-medium text-sky-700 hover:underline"
                  >
                    Download PDF
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payslips have been published yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
