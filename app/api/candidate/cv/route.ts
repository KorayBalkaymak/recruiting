import {
  handleCandidateOriginalDocumentGet,
  handleCandidateOriginalDocumentPost,
} from "@/lib/candidate/original-document-route";

export async function POST(request: Request) {
  return handleCandidateOriginalDocumentPost(request, "cv");
}

export async function GET() {
  return handleCandidateOriginalDocumentGet("cv");
}
