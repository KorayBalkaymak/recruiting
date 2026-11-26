import { handleStaffOriginalDocumentGet } from "@/lib/candidate/original-document-route";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handleStaffOriginalDocumentGet(params.id, "certificate");
}
