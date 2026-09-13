import { describe, expect, it } from "vitest";
import { getInitialFloatingToolPosition } from "../floating-tools-store";

describe("floating tools initial window position", () => {
  it("opens near the right side below the navbar", () => {
    expect(getInitialFloatingToolPosition(0, { width: 380, height: 460 }, { width: 1440, height: 900 })).toEqual({
      x: 1036,
      y: 88,
    });
  });

  it("cascades additional windows without leaving the visible viewport", () => {
    const second = getInitialFloatingToolPosition(1, { width: 380, height: 460 }, { width: 1440, height: 900 });
    expect(second.x).toBe(1020);
    expect(second.y).toBe(104);
  });

  it("clamps horizontally on small screens", () => {
    expect(getInitialFloatingToolPosition(0, { width: 380, height: 460 }, { width: 360, height: 740 }).x).toBe(16);
  });
});
