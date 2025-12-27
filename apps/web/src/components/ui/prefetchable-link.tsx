"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink>;

/**
 * A Link component that prefetches routes on hover instead of viewport entry.
 * Inspired by NextFaster's approach for better control over prefetching.
 */
export function PrefetchableLink({ children, href, ...props }: Props) {
  const router = useRouter();
  const hrefString = String(href);

  return (
    <NextLink
      href={href}
      prefetch={false}
      onMouseEnter={() => router.prefetch(hrefString)}
      onFocus={() => router.prefetch(hrefString)}
      {...props}
    >
      {children}
    </NextLink>
  );
}
