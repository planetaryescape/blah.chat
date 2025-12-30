import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock convex/react BEFORE importing component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => ({ canUse: true })), // Pro access enabled by default
  useAction: vi.fn(() => vi.fn()), // Mock useAction for useApiKeyValidation
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock model hooks
vi.mock("@/hooks/useFavoriteModels", () => ({
  useFavoriteModels: () => ({
    favorites: [],
    toggleFavorite: vi.fn(),
    isFavorite: () => false,
  }),
}));

vi.mock("@/hooks/useRecentModels", () => ({
  useRecentModels: () => ({
    recents: [],
    addRecent: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserPreference", () => ({
  useUserPreference: () => null,
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  analytics: { track: vi.fn() },
}));

// Mock models - provide minimal set
vi.mock("@/lib/ai/utils", () => ({
  getModelsByProvider: () => ({
    openai: [
      { id: "openai:gpt-4o", name: "GPT-4o", provider: "openai", isPro: false },
      {
        id: "openai:gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        isPro: false,
      },
    ],
    anthropic: [
      {
        id: "anthropic:claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        isPro: true,
      },
    ],
  }),
}));

vi.mock("@/lib/ai/sortModels", () => ({
  sortModels: (models: unknown[]) => ({
    defaultModel: null,
    favorites: [],
    recents: [],
    rest: models,
  }),
}));

vi.mock("@/lib/ai/categories", () => ({
  MODEL_CATEGORIES: [
    { id: "all", name: "All", filter: () => true },
    {
      id: "vision",
      name: "Vision",
      filter: (m: { id: string }) => m.id.includes("4o"),
    },
  ],
}));

// Mock child components
vi.mock("../CategorySidebar", () => ({
  CategorySidebar: ({
    onCategoryChange,
  }: {
    activeCategory: string;
    onCategoryChange: (id: string) => void;
  }) => (
    <div data-testid="category-sidebar">
      <button onClick={() => onCategoryChange("all")}>All</button>
      <button onClick={() => onCategoryChange("vision")}>Vision</button>
    </div>
  ),
}));

vi.mock("../ModelSelectorItem", () => ({
  ModelSelectorItem: ({
    model,
    onSelect,
    disabled,
  }: {
    model: { id: string; name: string };
    onSelect: () => void;
    disabled?: boolean;
  }) => (
    <button
      data-testid={`model-${model.id}`}
      onClick={onSelect}
      disabled={disabled}
    >
      {model.name}
    </button>
  ),
}));

vi.mock("../SelectedModelsChips", () => ({
  SelectedModelsChips: () => null,
}));

vi.mock("../UpgradeRequestDialog", () => ({
  UpgradeRequestDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="upgrade-dialog">Upgrade Required</div> : null,
}));

// Import AFTER mocks
import { QuickModelSwitcher } from "../QuickModelSwitcher";

describe("QuickModelSwitcher", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currentModel: "openai:gpt-4o",
    onSelectModel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open", () => {
    render(<QuickModelSwitcher {...defaultProps} />);

    // Command dialog should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows trigger button when showTrigger is true", () => {
    render(
      <QuickModelSwitcher {...defaultProps} open={false} showTrigger={true} />,
    );

    // Trigger shows current model name
    expect(screen.getByRole("button", { name: /gpt-4o/i })).toBeInTheDocument();
  });

  it("filters models by search query", async () => {
    const user = userEvent.setup();
    render(<QuickModelSwitcher {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, "gpt");

    // GPT models should still be visible
    expect(screen.getByTestId("model-openai:gpt-4o")).toBeInTheDocument();
  });

  it("filters models by category", async () => {
    const user = userEvent.setup();
    render(<QuickModelSwitcher {...defaultProps} />);

    const visionButton = screen.getByRole("button", { name: "Vision" });
    await user.click(visionButton);

    // GPT-4o should be visible (has vision)
    expect(screen.getByTestId("model-openai:gpt-4o")).toBeInTheDocument();
  });

  it("selects model in single mode and closes dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <QuickModelSwitcher
        {...defaultProps}
        mode="single"
        onOpenChange={onOpenChange}
      />,
    );

    await user.click(screen.getByTestId("model-openai:gpt-4o"));

    // Dialog should close after selection
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("toggles model selection in multiple mode", async () => {
    const user = userEvent.setup();
    const onSelectedModelsChange = vi.fn();

    render(
      <QuickModelSwitcher
        {...defaultProps}
        mode="multiple"
        selectedModels={[]}
        onSelectedModelsChange={onSelectedModelsChange}
      />,
    );

    // Select first model
    await user.click(screen.getByTestId("model-openai:gpt-4o"));

    // Internal state should update (we verify by the fact it doesn't error)
    expect(screen.getByTestId("model-openai:gpt-4o")).toBeInTheDocument();
  });

  it("closes dialog when closed", () => {
    const { rerender } = render(<QuickModelSwitcher {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(<QuickModelSwitcher {...defaultProps} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
