import { NextResponse } from "next/server";

const RELEASES_ENDPOINT =
  "https://api.github.com/repos/planetaryescape/blah.chat/releases?per_page=30";
const DESKTOP_TAG_PREFIX = "desktop-v";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  body: string | null;
  assets: GitHubAsset[];
}

const pickLatestDesktopRelease = (
  releases: GitHubRelease[],
): GitHubRelease | null => {
  const desktopReleases = releases
    .filter(
      (release) =>
        !release.draft &&
        !release.prerelease &&
        release.tag_name.startsWith(DESKTOP_TAG_PREFIX),
    )
    .sort((a, b) => {
      const aTs = a.published_at ? Date.parse(a.published_at) : 0;
      const bTs = b.published_at ? Date.parse(b.published_at) : 0;
      return bTs - aTs;
    });

  return desktopReleases[0] ?? null;
};

const pickManifestAsset = (release: GitHubRelease): GitHubAsset | null => {
  const exact = release.assets.find((asset) => asset.name === "latest.json");
  if (exact) {
    return exact;
  }

  const fallback = release.assets.find(
    (asset) => asset.name.startsWith("latest") && asset.name.endsWith(".json"),
  );

  return fallback ?? null;
};

const pickUpdaterTarballAsset = (release: GitHubRelease): GitHubAsset | null =>
  release.assets.find((asset) => asset.name.endsWith(".app.tar.gz")) ?? null;

const pickUpdaterSignatureAsset = (
  release: GitHubRelease,
): GitHubAsset | null =>
  release.assets.find((asset) => asset.name.endsWith(".app.tar.gz.sig")) ??
  null;

export const revalidate = 300;

export async function GET(): Promise<NextResponse | Response> {
  const releasesResponse = await fetch(RELEASES_ENDPOINT, {
    next: { revalidate },
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "blah-chat-desktop-updater",
    },
  });

  if (!releasesResponse.ok) {
    return NextResponse.json(
      { error: "Failed to query GitHub releases" },
      { status: 502 },
    );
  }

  const releases = (await releasesResponse.json()) as GitHubRelease[];
  const latestDesktopRelease = pickLatestDesktopRelease(releases);

  if (!latestDesktopRelease) {
    return NextResponse.json(
      { error: "No published desktop release found" },
      { status: 404 },
    );
  }

  const manifestAsset = pickManifestAsset(latestDesktopRelease);
  if (manifestAsset) {
    const manifestResponse = await fetch(manifestAsset.browser_download_url, {
      next: { revalidate },
      headers: {
        Accept: "application/json",
        "User-Agent": "blah-chat-desktop-updater",
      },
    });

    if (!manifestResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch desktop updater manifest" },
        { status: 502 },
      );
    }

    const manifestBody = await manifestResponse.text();

    return new Response(manifestBody, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  const updaterTarball = pickUpdaterTarballAsset(latestDesktopRelease);
  const updaterSignature = pickUpdaterSignatureAsset(latestDesktopRelease);
  if (!updaterTarball || !updaterSignature) {
    return NextResponse.json(
      { error: "No desktop updater artifacts found on release" },
      { status: 404 },
    );
  }

  const signatureResponse = await fetch(updaterSignature.browser_download_url, {
    next: { revalidate },
    headers: {
      Accept: "text/plain",
      "User-Agent": "blah-chat-desktop-updater",
    },
  });

  if (!signatureResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch desktop updater signature" },
      { status: 502 },
    );
  }

  const version = latestDesktopRelease.tag_name.startsWith(DESKTOP_TAG_PREFIX)
    ? latestDesktopRelease.tag_name.slice(DESKTOP_TAG_PREFIX.length)
    : latestDesktopRelease.tag_name;
  const signature = (await signatureResponse.text()).trim();

  const synthesizedManifest = {
    version,
    notes: latestDesktopRelease.body ?? "",
    pub_date: latestDesktopRelease.published_at,
    url: updaterTarball.browser_download_url,
    signature,
  };

  return NextResponse.json(synthesizedManifest, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
