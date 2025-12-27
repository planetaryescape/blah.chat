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
    console.log("[Images Download] Request for:", presentationId);

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

    if (!presentation.imagesZipUrl) {
      return new NextResponse("Images ZIP not generated yet", { status: 404 });
    }

    // Fetch the ZIP file from Convex storage
    const zipResponse = await fetch(presentation.imagesZipUrl);
    if (!zipResponse.ok) {
      return new NextResponse("Failed to fetch images", { status: 500 });
    }

    const zipBuffer = await zipResponse.arrayBuffer();

    // Sanitize filename
    const safeTitle =
      presentation.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() ||
      "presentation";
    const filename = `${safeTitle}-images.zip`;

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("Images download error:", error);
    return new NextResponse("Download failed", { status: 500 });
  }
}
