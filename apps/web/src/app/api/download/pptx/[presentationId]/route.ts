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
    console.log("[PPTX Download] Request for:", presentationId);

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const token = await getToken({ template: "convex" });
    console.log("[PPTX Download] Token obtained:", !!token);
    if (token) {
      convex.setAuth(token);
    }

    // Get presentation (includes ownership check via Convex query)
    // @ts-ignore - Type depth exceeded with complex Convex API (85+ modules)
    const presentation = await (convex.query as any)(api.presentations.get, {
      presentationId: presentationId as Id<"presentations">,
    });
    console.log(
      "[PPTX Download] Presentation found:",
      !!presentation,
      presentation?.title,
    );

    if (!presentation) {
      return new NextResponse("Presentation not found", { status: 404 });
    }

    if (!presentation.pptxUrl) {
      return new NextResponse("PPTX not generated yet", { status: 404 });
    }

    // Fetch the PPTX file from Convex storage
    console.log("[PPTX Download] Fetching from:", presentation.pptxUrl);
    const pptxResponse = await fetch(presentation.pptxUrl);
    if (!pptxResponse.ok) {
      return new NextResponse("Failed to fetch PPTX", { status: 500 });
    }

    const pptxBuffer = await pptxResponse.arrayBuffer();
    console.log("[PPTX Download] Buffer size:", pptxBuffer.byteLength);

    // Sanitize filename for Content-Disposition header
    const safeTitle =
      presentation.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() ||
      "presentation";
    const filename = `${safeTitle}.pptx`;
    console.log("[PPTX Download] Filename:", filename);

    // Return file with proper headers
    return new Response(pptxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pptxBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("PPTX download error:", error);
    return new NextResponse("Download failed", { status: 500 });
  }
}
