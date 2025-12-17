import { Bug, Heart, Lightbulb, MessageCircle } from "lucide-react";
import React from "react";

// ============================================================================
// TYPES & CONFIGURATIONS
// ============================================================================

export type FeedbackType = "bug" | "feature" | "praise" | "other";
export type Priority = "critical" | "high" | "medium" | "low" | "none";

// Status values by type for the dropdown
export const STATUS_BY_TYPE: Record<FeedbackType, string[]> = {
  bug: [
    "new",
    "triaging",
    "in-progress",
    "resolved",
    "verified",
    "closed",
    "wont-fix",
    "duplicate",
    "cannot-reproduce",
  ],
  feature: [
    "submitted",
    "under-review",
    "planned",
    "in-progress",
    "shipped",
    "declined",
    "maybe-later",
  ],
  praise: ["received", "acknowledged", "shared"],
  other: ["new", "reviewed", "actioned", "closed"],
};

// Human-readable status labels
export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaging: "Triaging",
  "in-progress": "In Progress",
  resolved: "Resolved",
  verified: "Verified",
  closed: "Closed",
  "wont-fix": "Won't Fix",
  duplicate: "Duplicate",
  "cannot-reproduce": "Cannot Reproduce",
  submitted: "Submitted",
  "under-review": "Under Review",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
  "maybe-later": "Maybe Later",
  received: "Received",
  acknowledged: "Acknowledged",
  shared: "Shared",
  reviewed: "Reviewed",
  actioned: "Actioned",
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  // Bug statuses
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  triaging: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "in-progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  "wont-fix": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  duplicate: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "cannot-reproduce": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  // Feature statuses
  submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "under-review": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  planned: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  shipped: "bg-green-500/10 text-green-500 border-green-500/20",
  declined: "bg-red-500/10 text-red-500 border-red-500/20",
  "maybe-later": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  // Praise statuses
  received: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  acknowledged: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  shared: "bg-green-500/10 text-green-500 border-green-500/20",
  // General
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  actioned: "bg-green-500/10 text-green-500 border-green-500/20",
};

export const TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  bug: {
    label: "Bug",
    icon: <Bug className="h-3 w-3" />,
    color: "bg-red-500/10 text-red-500",
  },
  feature: {
    label: "Feature",
    icon: <Lightbulb className="h-3 w-3" />,
    color: "bg-purple-500/10 text-purple-500",
  },
  praise: {
    label: "Praise",
    icon: <Heart className="h-3 w-3" />,
    color: "bg-pink-500/10 text-pink-500",
  },
  other: {
    label: "Other",
    icon: <MessageCircle className="h-3 w-3" />,
    color: "bg-gray-500/10 text-gray-500",
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string }
> = {
  critical: {
    label: "Critical",
    color: "bg-red-500/10 text-red-500 border-red-500",
  },
  high: {
    label: "High",
    color: "bg-orange-500/10 text-orange-500 border-orange-500",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
  },
  low: {
    label: "Low",
    color: "bg-green-500/10 text-green-500 border-green-500",
  },
  none: {
    label: "None",
    color: "bg-gray-500/10 text-gray-500 border-gray-500",
  },
};
