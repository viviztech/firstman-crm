import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ReportPageHeader({
  title,
  description,
  exportHref,
}: {
  title: string;
  description: string;
  exportHref: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <Link href="/reports" className="text-sm text-muted-foreground hover:underline">
          ← All reports
        </Link>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" nativeButton={false} render={<a href={exportHref} />}>
        Export to Excel
      </Button>
    </div>
  );
}
