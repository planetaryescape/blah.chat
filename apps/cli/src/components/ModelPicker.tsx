/**
 * ModelPicker Component - Select an AI model
 *
 * Features:
 * - Keyboard navigation (j/k, arrows)
 * - Shows model name, provider, and pro indicator
 * - Enter to select, Escape to cancel
 */

import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { listModels, type Model } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ModelPickerProps {
  currentModel?: string;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ModelPicker({
  currentModel,
  onSelect,
  onCancel,
}: ModelPickerProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
          // Set initial selection to current model if provided
          if (currentModel) {
            const idx = modelList.findIndex((m) => m.id === currentModel);
            if (idx >= 0) {
              setSelectedIndex(idx);
            }
          }
        }
      } catch (err) {
        setError(formatError(err));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentModel]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (isLoading) return;

      // Navigation
      if (key.downArrow || input === "j") {
        setSelectedIndex((i) => Math.min(i + 1, models.length - 1));
        return;
      }

      if (key.upArrow || input === "k") {
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }

      // Page navigation
      if (key.pageDown) {
        setSelectedIndex((i) => Math.min(i + 5, models.length - 1));
        return;
      }

      if (key.pageUp) {
        setSelectedIndex((i) => Math.max(i - 5, 0));
        return;
      }

      // Home/End
      if (input === "g") {
        setSelectedIndex(0);
        return;
      }

      if (input === "G") {
        setSelectedIndex(models.length - 1);
        return;
      }

      // Select
      if (key.return) {
        const selected = models[selectedIndex];
        if (selected) {
          onSelect(selected.id);
        }
        return;
      }

      // Cancel
      if (key.escape || input === "q") {
        onCancel();
        return;
      }
    },
    { isActive: !isLoading },
  );

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Loading models...</Text>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="red">{symbols.error} </Text>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Escape to go back</Text>
        </Box>
      </Box>
    );
  }

  // Calculate visible window
  const windowSize = 10;
  const halfWindow = Math.floor(windowSize / 2);
  const startIndex = Math.max(0, selectedIndex - halfWindow);
  const endIndex = Math.min(models.length, startIndex + windowSize);
  const visibleModels = models.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
      >
        <Text bold color="cyan">
          Select Model
        </Text>
        <Box flexGrow={1} />
        <Text dimColor>({models.length} available)</Text>
      </Box>

      {/* Current model indicator */}
      {currentModel && (
        <Box marginBottom={1} paddingX={1}>
          <Text dimColor>Current: </Text>
          <Text color="yellow">{currentModel}</Text>
        </Box>
      )}

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
          const isSelected = actualIndex === selectedIndex;
          const isCurrent = model.id === currentModel;

          return (
            <Box
              key={model.id}
              paddingX={1}
              borderStyle={isSelected ? "single" : undefined}
              borderColor={isSelected ? "cyan" : undefined}
            >
              {/* Selection indicator */}
              <Text color={isSelected ? "cyan" : "gray"}>
                {isSelected ? symbols.chevronRight : " "}
              </Text>
              <Text> </Text>

              {/* Current indicator */}
              <Text color={isCurrent ? "green" : undefined}>
                {isCurrent ? symbols.active : symbols.pending}
              </Text>
              <Text> </Text>

              {/* Model name */}
              <Box flexGrow={1}>
                <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                  {model.name}
                </Text>
              </Box>

              {/* Provider */}
              <Text dimColor>{model.provider}</Text>

              {/* Pro indicator */}
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
          {symbols.chevronRight} ↑↓/jk nav | Enter select | q cancel
        </Text>
      </Box>
    </Box>
  );
}
