import { describe, expect, it } from "vitest";
import { getIrrigationRecommendation } from "./capstoneLogic";

describe("getIrrigationRecommendation", () => {
  it("recommends irrigation when moisture is low and rain is unlikely", () => {
    expect(getIrrigationRecommendation(25, 35, 20)).toMatchObject({ tone: "amber", label: "Irrigate soon" });
  });

  it("delays irrigation when rain is likely", () => {
    expect(getIrrigationRecommendation(25, 35, 70)).toMatchObject({ tone: "blue", label: "Wait for rain" });
  });

  it("confirms healthy moisture when the plot is above threshold", () => {
    expect(getIrrigationRecommendation(46, 35, 10)).toMatchObject({ tone: "green", label: "Moisture is healthy" });
  });
});
