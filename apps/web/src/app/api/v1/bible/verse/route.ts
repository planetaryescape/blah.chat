import { api } from "@blah-chat/backend/convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { osisToDisplay } from "@/lib/bible/utils";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

/**
 * Bible verse API with shared Convex cache
 * Falls back to bible-api.com (free, no auth, public domain)
 * Default: World English Bible (WEB) - modern English, public domain
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const version = searchParams.get("version") || "web";

  if (!ref) {
    return NextResponse.json(formatErrorEntity("Missing 'ref' parameter"), {
      status: 400,
    });
  }

  try {
    // Check shared Convex cache first
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    const cached = await fetchQuery(api.bible.getCachedVerse, { osis: ref });
    if (cached) {
      return NextResponse.json(
        formatEntity(
          {
            reference: cached.reference,
            osis: ref,
            text: cached.text,
            version: cached.version,
          },
          "bible-verse",
        ),
      );
    }

    // Cache miss - fetch from bible-api.com
    const query = osisToQuery(ref);
    const apiUrl = `https://bible-api.com/${encodeURIComponent(query)}?translation=${version}`;

    const res = await fetch(apiUrl, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(formatErrorEntity("Verse not found"), {
          status: 404,
        });
      }
      return NextResponse.json(
        formatErrorEntity(`Bible API error: ${res.status}`),
        { status: res.status },
      );
    }

    const data = await res.json();

    if (!data.text) {
      return NextResponse.json(formatErrorEntity("Verse not found"), {
        status: 404,
      });
    }

    // Clean up text
    const text = data.text.trim().replace(/\s+/g, " ");
    const reference = data.reference || osisToDisplay(ref);
    const versionUpper = data.translation_id?.toUpperCase() || "WEB";

    // Save to shared cache (fire-and-forget)
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    fetchMutation(api.bible.setCachedVerse, {
      osis: ref,
      reference,
      text,
      version: versionUpper,
    }).catch(() => {
      // Ignore cache write failures
    });

    return NextResponse.json(
      formatEntity(
        { reference, osis: ref, text, version: versionUpper },
        "bible-verse",
      ),
    );
  } catch (error) {
    console.error("[Bible API] Error fetching verse:", error);
    return NextResponse.json(formatErrorEntity("Failed to fetch verse"), {
      status: 500,
    });
  }
}

/**
 * Convert OSIS reference to bible-api.com query format
 * Uses spaces (encoded as %20) instead of + signs
 * Examples:
 *   John.3.16 → john 3:16
 *   Gen.1.1-Gen.1.3 → genesis 1:1-3
 *   1Cor.13.4-1Cor.13.7 → 1 corinthians 13:4-7
 */
function osisToQuery(osis: string): string {
  // Handle ranges (e.g., Gen.1.1-Gen.1.3)
  const rangeMatch = osis.match(
    /^([1-4]?)([A-Za-z]+)\.(\d+)\.(\d+)-(?:[1-4]?[A-Za-z]+\.)?(\d+)\.(\d+)$/,
  );
  if (rangeMatch) {
    const [, num, book, chapter1, verse1, chapter2, verse2] = rangeMatch;
    const bookName = expandBookName(book);
    const prefix = num ? `${num} ` : "";

    // Same chapter range
    if (chapter1 === chapter2) {
      return `${prefix}${bookName} ${chapter1}:${verse1}-${verse2}`;
    }
    // Cross-chapter range
    return `${prefix}${bookName} ${chapter1}:${verse1}-${chapter2}:${verse2}`;
  }

  // Handle single verse (e.g., John.3.16)
  const singleMatch = osis.match(/^([1-4]?)([A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (singleMatch) {
    const [, num, book, chapter, verse] = singleMatch;
    const bookName = expandBookName(book);
    const prefix = num ? `${num} ` : "";
    return `${prefix}${bookName} ${chapter}:${verse}`;
  }

  // Fallback: try to clean up and pass through
  return osis
    .replace(/\.(\d+)\.(\d+)/g, " $1:$2")
    .replace(/([A-Za-z])\./, "$1 ")
    .toLowerCase();
}

/**
 * Expand OSIS book abbreviations to full names for bible-api.com
 */
function expandBookName(abbrev: string): string {
  const bookMap: Record<string, string> = {
    Gen: "genesis",
    Exod: "exodus",
    Lev: "leviticus",
    Num: "numbers",
    Deut: "deuteronomy",
    Josh: "joshua",
    Judg: "judges",
    Ruth: "ruth",
    Sam: "samuel",
    Kgs: "kings",
    Chr: "chronicles",
    Ezra: "ezra",
    Neh: "nehemiah",
    Esth: "esther",
    Job: "job",
    Ps: "psalms",
    Prov: "proverbs",
    Eccl: "ecclesiastes",
    Song: "song of solomon",
    Isa: "isaiah",
    Jer: "jeremiah",
    Lam: "lamentations",
    Ezek: "ezekiel",
    Dan: "daniel",
    Hos: "hosea",
    Joel: "joel",
    Amos: "amos",
    Obad: "obadiah",
    Jonah: "jonah",
    Mic: "micah",
    Nah: "nahum",
    Hab: "habakkuk",
    Zeph: "zephaniah",
    Hag: "haggai",
    Zech: "zechariah",
    Mal: "malachi",
    Matt: "matthew",
    Mark: "mark",
    Luke: "luke",
    John: "john",
    Acts: "acts",
    Rom: "romans",
    Cor: "corinthians",
    Gal: "galatians",
    Eph: "ephesians",
    Phil: "philippians",
    Col: "colossians",
    Thess: "thessalonians",
    Tim: "timothy",
    Titus: "titus",
    Phlm: "philemon",
    Heb: "hebrews",
    Jas: "james",
    Pet: "peter",
    Jude: "jude",
    Rev: "revelation",
  };

  return bookMap[abbrev] || abbrev.toLowerCase();
}

export const dynamic = "force-dynamic";
