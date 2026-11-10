import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { getCandidateById } from "@/lib/queries/candidates";
import { toProfile } from "@/lib/candidate-profile";
import { CandidateExposePdf } from "@/components/kandidaten/candidate-pdf";
import { AuthError, requireStaff } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireStaff();
  } catch (error) {
    if (error instanceof AuthError) {
      return new NextResponse(error.message, {
        status: error.code === "UNAUTHENTICATED" ? 401 : 403,
      });
    }
    throw error;
  }

  const candidate = await getCandidateById(params.id);
  const profile = toProfile(candidate.anonymized_profile);

  const stream = await renderToStream(
    <CandidateExposePdf
      title={candidate.anonymized_title ?? ""}
      profile={profile}
      candidateRefId={candidate.id}
    />
  );

  const download = request.nextUrl.searchParams.get("download") === "1";
  const fileName = `expose-${candidate.id.slice(0, 8)}.pdf`;

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
    },
  });
}
