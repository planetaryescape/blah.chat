import type { Metadata } from "next";
import { getShareMetadata } from "@/lib/api/dal/shares";
import SharePageClient from "./SharePageClient";

type Props = {
  params: Promise<{ shareId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const share = await getShareMetadata(shareId);

  if (!share) {
    return {
      title: "Share Not Found",
      description: "This shared content is no longer available.",
    };
  }

  const typeLabel = share.type === "note" ? "Note" : "Conversation";

  return {
    title: share.title,
    description: share.description,
    openGraph: {
      title: `${share.title} | blah.chat`,
      description: share.description,
      type: "article",
      siteName: "blah.chat",
    },
    twitter: {
      card: "summary_large_image",
      title: `${share.title} | blah.chat`,
      description: share.description,
    },
    other: {
      "share:type": typeLabel,
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { shareId } = await params;
  return <SharePageClient shareId={shareId} />;
}
