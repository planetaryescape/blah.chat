import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ presentationId: string }> },
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { presentationId } = await params;
    console.log("[PDF Download] Request for:", presentationId);

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const token = await getToken({ template: "convex" });
    if (token) {
      convex.setAuth(token);
    }

    // Get presentation (includes ownership check via Convex query)
    // @ts-ignore - Type depth exceeded with complex Convex API (85+ modules)
    const presentation = await (convex.query as any)(api.presentations.get, {
      presentationId: presentationId as Id<"presentations">,
    });

    if (!presentation) {
      return new NextResponse("Presentation not found", { status: 404 });
    }

    if (!presentation.pdfUrl) {
      return new NextResponse("PDF not generated yet", { status: 404 });
    }

    // Fetch the PDF file from Convex storage
    const pdfResponse = await fetch(presentation.pdfUrl);
    if (!pdfResponse.ok) {
      return new NextResponse("Failed to fetch PDF", { status: 500 });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Sanitize filename
    const safeTitle =
      presentation.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() ||
      "presentation";
    const filename = `${safeTitle}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("PDF download error:", error);
    return new NextResponse("Download failed", { status: 500 });
  }
}
