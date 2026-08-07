import { renderToBuffer } from "@react-pdf/renderer";
import { JobCardDocument } from "@/lib/pdf/job-card-document";
import type { ActorScope } from "@/lib/scope";
import { getCompanyProfile } from "@/services/company-profile";
import { getOrder } from "@/services/orders";

/**
 * Renders an order's job card to a PDF buffer, or null if the order doesn't exist / isn't in
 * scope for the requesting actor. Internal document only — served behind a session-authenticated
 * route, never a signed link (unlike invoices, a job card is never emailed to the client).
 */
export async function renderJobCardPdf(orderId: string, scope: ActorScope): Promise<Buffer | null> {
  const order = await getOrder(orderId, scope);
  if (!order) return null;

  const company = await getCompanyProfile();

  return renderToBuffer(
    <JobCardDocument
      order={{
        orderNo: order.orderNo,
        status: order.status,
        startedAt: order.startedAt,
        dueAt: order.dueAt,
        quotedPricePaise: order.quotedPricePaise,
        govtFeePaise: order.govtFeePaise,
        notes: order.notes,
        client: { name: order.client.name, phone: order.client.phone },
        service: { name: order.service.name },
        assignee: order.assignee,
        tasks: order.tasks.map((task) => ({
          title: task.title,
          status: task.status,
          dueAt: task.dueAt,
          assignee: task.assignee,
        })),
        documents: order.documents.map((document) => ({
          label: document.label,
          status: document.status,
        })),
      }}
      company={company}
    />,
  );
}
