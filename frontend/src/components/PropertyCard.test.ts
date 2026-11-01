import { describe, expect, it } from "vitest";
import { formatPrice } from "./PropertyCard";

describe("formatPrice", () => {
  it("formats Indian sale prices in lakhs and crores", () => {
    expect(formatPrice(8_500_000, "sale")).toBe("₹85 L");
    expect(formatPrice(12_500_000, "sale")).toBe("₹1.25 Cr");
  });

  it("marks rental prices as monthly", () => {
    expect(formatPrice(45_000, "rent")).toBe("₹45,000 / mo");
  });
}); 
