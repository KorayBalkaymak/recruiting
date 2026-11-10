import { NextResponse } from "next/server";
import { requireStaff, toAuthHttpError } from "@/lib/auth";
import { getCandidateCvAccess } from "@/lib/candidate/cv-upload";
import { contentDispositionAttachment } from "@/lib/storage/private-documents";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const file = await getCandidateCvAccess({ type: "staff", user: staff }, params.id);
    if (!file) {
      return NextResponse.json({ error: "Kein CV vorhanden." }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": contentDispositionAttachment(file.fileName),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const authError = toAuthHttpError(error);
    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: authError.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download fehlgeschlagen." },
      { status: 400 }
    );
  }
}
