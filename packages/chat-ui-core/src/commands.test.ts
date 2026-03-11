import {
  findChatComposerCommand,
  getChatComposerCommandsForSurface,
  getLineStartSlashMatch,
  replaceTextRange,
} from "./commands";

describe("commands", () => {
  it("filters commands by surface", () => {
    expect(
      getChatComposerCommandsForSurface("cli").map((command) => command.id),
    ).toEqual(["model"]);
    expect(
      getChatComposerCommandsForSurface("web").map((command) => command.id),
    ).toEqual(["model", "think", "template", "compare"]);
  });

  it("matches aliases by prefix", () => {
    expect(findChatComposerCommand("rea", "web")?.id).toBe("think");
    expect(findChatComposerCommand("cmp", "mobile")?.id).toBe("compare");
    expect(findChatComposerCommand("template", "cli")).toBeNull();
  });

  it("detects slash commands from the current line prefix", () => {
    expect(getLineStartSlashMatch("/mod", 4)).toEqual({
      query: "mod",
      rangeStart: 0,
      rangeEnd: 4,
    });
    expect(getLineStartSlashMatch("hello\n/tem", 10)).toEqual({
      query: "tem",
      rangeStart: 6,
      rangeEnd: 10,
    });
    expect(getLineStartSlashMatch("/model openai", 13)).toBeNull();
  });

  it("replaces text ranges", () => {
    expect(replaceTextRange("before /model", 7, 13, "").text).toBe("before ");
  });
});
