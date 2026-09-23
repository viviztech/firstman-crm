import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { readAuthorizedPayslip } from "@/services/hr-payslips";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  try {
    const { id } = await params;
    const result = await readAuthorizedPayslip(id, actor);
    if (!result) return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download payslip." },
      { status: 403 },
    );
  }
}
