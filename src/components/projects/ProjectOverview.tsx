"use client";

import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckSquare,
  Clock,
  FileText,
  MessageSquare,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";

export function ProjectOverview({
  projectId,
  resources,
  stats,
}: {
  projectId: Id<"projects">;
  resources: any;
  stats: any;
}) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const _item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard
          icon={MessageSquare}
          label="Conversations"
          value={stats?.conversationCount || 0}
          delay={0}
        />
        <StatsCard
          icon={FileText}
          label="Files"
          value={stats?.fileCount || 0}
          delay={0.1}
        />
        <StatsCard
          icon={NotebookPen}
          label="Notes"
          value={stats?.noteCount || 0}
          delay={0.2}
        />
        <StatsCard
          icon={CheckSquare}
          label="Active Tasks"
          value={stats?.activeTaskCount || 0}
          delay={0.3}
        />
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Recent Activity
          </h3>
          {/* Optional: Add "View All" link if needed */}
        </div>

        <Card className="border shadow-sm bg-card/50 overflow-hidden">
          {resources && (
            <div className="divide-y divide-border/40">
              {/* Merge and sort resources if possible, or just display them cleanly */}
              {[...(resources.conversations || []), ...(resources.files || [])]
                .length > 0 ? (
                <>
                  {resources.conversations?.slice(0, 3).map((conv: any) => (
                    <ActivityItem
                      key={conv._id}
                      type="conversation"
                      title={conv.title || "Untitled conversation"}
                      date={conv.createdAt}
                      id={conv._id}
                      projectId={projectId}
                    />
                  ))}
                  {resources.files?.slice(0, 3).map((file: any) => (
                    <ActivityItem
                      key={file._id}
                      type="file"
                      title={file.name}
                      date={file.createdAt}
                      id={file._id}
                      projectId={projectId}
                    />
                  ))}
                </>
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground/60">
                  <Clock className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">No recent activity found</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: any;
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group"
    >
      <div className="flex items-center gap-2.5 text-muted-foreground mb-3 group-hover:text-primary transition-colors">
        <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider opacity-80">
          {label}
        </span>
      </div>
      <p className="text-3xl font-light tracking-tight text-foreground">
        {value}
      </p>
    </motion.div>
  );
}

function ActivityItem({
  type,
  title,
  date,
  id,
  projectId,
}: {
  type: "conversation" | "file";
  title: string;
  date: number;
  id: string;
  projectId: string;
}) {
  return (
    <Link
      href={type === "conversation" ? `/chat/${id}` : `#`}
      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors group cursor-pointer border-b border-border/40 last:border-0"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
          {type === "conversation" ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-wide">
            {type}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 pl-4">
        <span className="text-xs text-muted-foreground/50 font-mono whitespace-nowrap">
          {formatDistanceToNow(date, { addSuffix: true })}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary/50 transition-colors" />
      </div>
    </Link>
  );
}
