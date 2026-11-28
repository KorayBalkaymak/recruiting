import { handleStaffOriginalDocumentGet } from "@/lib/candidate/original-document-route";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleStaffOriginalDocumentGet(params.id, "cv", request);
}
