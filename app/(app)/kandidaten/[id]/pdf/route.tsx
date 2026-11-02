import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { getCandidateById } from "@/lib/queries/candidates";
import { toProfile } from "@/lib/candidate-profile";
import { CandidateExposePdf } from "@/components/kandidaten/candidate-pdf";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
