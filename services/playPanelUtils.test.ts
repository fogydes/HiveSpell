import { describe, expect, it } from "vitest";
import {
  getChatPanelClasses,
  getPlayerPanelClasses,
} from "./playPanelUtils";

describe("playPanelUtils", () => {
  it("opens the requested chat panel on mobile while keeping desktop classes", () => {
    const classes = getChatPanelClasses("chat");

    expect(classes).toContain("scale-100");
    expect(classes).toContain("lg:left-4");
  });

  it("keeps inactive player panel hidden on mobile", () => {
    const classes = getPlayerPanelClasses("chat");

    expect(classes).toContain("scale-0");
    expect(classes).toContain("lg:right-4");
  });
});
