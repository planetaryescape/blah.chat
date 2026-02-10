import { calculateRetention, updateStability } from "../src/core/decay";

describe("decay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-10T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("procedural never decays", () => {
    const retention = calculateRetention({
      stability: 0.3,
      importance: 0.5,
      lastAccessed: Date.now() - 10_000_000_000,
      memoryType: "procedural",
    });
    expect(retention).toBe(1.0);
  });

  test("fresh episodic ~0.97 at 1 day (stability 0.5, importance 0.5)", () => {
    const retention = calculateRetention({
      stability: 0.5,
      importance: 0.5,
      lastAccessed: Date.now() - 24 * 60 * 60 * 1000,
      memoryType: "episodic",
    });
    expect(retention).toBeGreaterThan(0.96);
    expect(retention).toBeLessThan(0.98);
  });

  test("month-old episodic ~0.37 at 30 days (stability 0.5, importance 0.5)", () => {
    const retention = calculateRetention({
      stability: 0.5,
      importance: 0.5,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "episodic",
    });
    expect(retention).toBeGreaterThan(0.35);
    expect(retention).toBeLessThan(0.39);
  });

  test("higher importance slows decay", () => {
    const low = calculateRetention({
      stability: 0.5,
      importance: 0.1,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    const high = calculateRetention({
      stability: 0.5,
      importance: 0.9,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    expect(high).toBeGreaterThan(low);
  });

  test("higher stability slows decay", () => {
    const low = calculateRetention({
      stability: 0.2,
      importance: 0.5,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    const high = calculateRetention({
      stability: 0.8,
      importance: 0.5,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    expect(high).toBeGreaterThan(low);
  });

  test("higher accessCount slows decay (frequency boost)", () => {
    const low = calculateRetention({
      stability: 0.5,
      importance: 0.5,
      accessCount: 0,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    const high = calculateRetention({
      stability: 0.5,
      importance: 0.5,
      accessCount: 100,
      lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    expect(high).toBeGreaterThan(low);
  });

  test("updateStability increases correctly + caps at 1.0", () => {
    expect(updateStability(0.3, 1)).toBeCloseTo(0.314, 3);
    expect(updateStability(0.3, 7)).toBeCloseTo(0.4, 6);
    expect(updateStability(0.3, 14)).toBeCloseTo(0.5, 6);
    expect(updateStability(0.95, 7)).toBe(1.0);
  });

  test("edge cases: negative days clamps to 0", () => {
    expect(updateStability(0.3, -10)).toBe(0.3);
    const retention = calculateRetention({
      stability: 0.5,
      importance: 0.5,
      lastAccessed: Date.now() + 10 * 24 * 60 * 60 * 1000,
      memoryType: "semantic",
    });
    expect(retention).toBe(1.0);
  });
});
