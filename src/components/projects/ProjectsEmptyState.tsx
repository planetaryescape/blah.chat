import { motion } from "framer-motion";
import { FolderOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectsEmptyState({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Layered icon with pulsing background */}
      <div className="relative mb-6">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-subtle" />
          <div className="relative flex items-center justify-center h-full">
            <FolderOpen className="h-12 w-12 text-primary/80" />
            <Sparkles className="absolute top-0 right-0 h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Heading with gradient text */}
      <h2 className="text-2xl font-semibold tracking-tight mb-3 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
        Create Your First Project
      </h2>

      {/* Description */}
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Organize conversations with custom system prompts and keep related chats
        together
      </p>

      {/* Primary CTA */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onCreateProject}
          size="lg"
          className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </motion.div>
    </motion.div>
  );
}
