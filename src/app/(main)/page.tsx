"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";

export default function HomePage() {
  const user = useQuery(api.users.getCurrentUser);

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center">
        <Authenticated>
          {user ? (
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Welcome, {user.name}!
              </h1>
              <p className="text-muted-foreground">
                Phase 1 complete: Authentication & Convex setup working
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading user data...</p>
          )}
        </Authenticated>

        <Unauthenticated>
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </Unauthenticated>
      </div>
    </div>
  );
}
