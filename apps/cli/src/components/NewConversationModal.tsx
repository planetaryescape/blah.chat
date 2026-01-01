/**
 * NewConversationModal Component - Create a new conversation
 *
 * Features:
 * - Title input (optional)
 * - Model selection
 * - Create and cancel actions
 */

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { createConversation } from "../lib/mutations.js";
import { listModels, type Model } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface NewConversationModalProps {
  onCreated: (conversationId: Id<"conversations">) => void;
  onCancel: () => void;
}

type Step = "title" | "model" | "creating";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function NewConversationModal({
  onCreated,
  onCancel,
}: NewConversationModalProps) {
  const [step, setStep] = useState<Step>("title");
  const [title, setTitle] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load available models
  useEffect(() => {
    async function load() {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const modelList = await listModels(client, apiKey);
        if (modelList) {
          setModels(modelList);
        }
      } catch (err) {
        setError(formatError(err));
      }
    }
    load();
  }, []);

  // Create conversation
  const handleCreate = useCallback(async () => {
    setStep("creating");
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      const selectedModel = models[selectedModelIndex];
      const result = await createConversation(client, apiKey, {
        title: title.trim() || undefined,
        model: selectedModel?.id,
      });
      onCreated(result.conversationId);
    } catch (err) {
      setError(formatError(err));
      setStep("model");
    }
  }, [title, models, selectedModelIndex, onCreated]);

  // Handle title input
  useInput(
    (input, key) => {
      if (step !== "title") return;

      // Enter to continue to model selection
      if (key.return) {
        setStep("model");
        return;
      }

      // Escape to cancel
      if (key.escape) {
        onCancel();
        return;
      }
    },
    { isActive: step === "title" },
  );

  // Handle model selection
  useInput(
    (input, key) => {
      if (step !== "model") return;

      // Navigation
      if (key.downArrow || input === "j") {
        setSelectedModelIndex((i) => Math.min(i + 1, models.length - 1));
        return;
      }

      if (key.upArrow || input === "k") {
        setSelectedModelIndex((i) => Math.max(i - 1, 0));
        return;
      }

      // Enter to create
      if (key.return) {
        handleCreate();
        return;
      }

      // Escape or b to go back
      if (key.escape || input === "b") {
        setStep("title");
        return;
      }

      // q to cancel
      if (input === "q") {
        onCancel();
        return;
      }
    },
    { isActive: step === "model" },
  );

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="red">{symbols.error} </Text>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any key to go back</Text>
        </Box>
      </Box>
    );
  }

  // Creating state
  if (step === "creating") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Creating conversation...</Text>
        </Box>
      </Box>
    );
  }

  // Title input step
  if (step === "title") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box
          marginBottom={1}
          borderStyle="single"
          borderColor="cyan"
          paddingX={1}
        >
          <Text bold color="cyan">
            New Conversation
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Title (optional): </Text>
          <TextInput value={title} onChange={setTitle} placeholder="Untitled" />
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Enter to continue | Escape to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Model selection step
  const windowSize = 8;
  const halfWindow = Math.floor(windowSize / 2);
  const startIndex = Math.max(0, selectedModelIndex - halfWindow);
  const endIndex = Math.min(models.length, startIndex + windowSize);
  const visibleModels = models.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
      >
        <Text bold color="cyan">
          Select Model
        </Text>
      </Box>

      {/* Title preview */}
      <Box marginBottom={1} paddingX={1}>
        <Text dimColor>Title: </Text>
        <Text>{title.trim() || "Untitled"}</Text>
      </Box>

      {/* Scroll indicator (top) */}
      {startIndex > 0 && (
        <Box justifyContent="center">
          <Text dimColor>
            {symbols.arrowUp} {startIndex} more
          </Text>
        </Box>
      )}

      {/* Model list */}
      <Box flexDirection="column">
        {visibleModels.map((model, i) => {
          const actualIndex = startIndex + i;
          const isSelected = actualIndex === selectedModelIndex;
          return (
            <Box
              key={model.id}
              paddingX={1}
              borderStyle={isSelected ? "single" : undefined}
              borderColor={isSelected ? "cyan" : undefined}
            >
              <Text color={isSelected ? "cyan" : "gray"}>
                {isSelected ? symbols.chevronRight : " "}
              </Text>
              <Text> </Text>
              <Box flexGrow={1}>
                <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                  {model.name}
                </Text>
              </Box>
              <Text dimColor>{model.provider}</Text>
              {model.isPro && <Text color="yellow"> {symbols.star}</Text>}
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicator (bottom) */}
      {endIndex < models.length && (
        <Box justifyContent="center">
          <Text dimColor>
            {symbols.arrowDown} {models.length - endIndex} more
          </Text>
        </Box>
      )}

      {/* Help bar */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {symbols.chevronRight} ↑↓/jk select | Enter create | b back | q cancel
        </Text>
      </Box>
    </Box>
  );
}
