import { useQuery } from "convex/react";
import { api } from "@/lib/convex";

export interface MobileTemplate {
  _id: string;
  name: string;
  prompt: string;
  description?: string;
  category?: string;
  isBuiltIn?: boolean;
}

export function useTemplates() {
  return (
    (useQuery(api.templates.list, {}) as MobileTemplate[] | undefined) ?? []
  );
}
