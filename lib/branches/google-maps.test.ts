import { describe, expect, it, vi } from "vitest";
import { parseGoogleMapsCoordinates, resolveGoogleMapsUrl } from "./google-maps";

describe("parseGoogleMapsCoordinates", () => {
  it("prefers the pin over the viewport", () => {
    expect(
      parseGoogleMapsCoordinates(
        "https://www.google.com/maps/place/Ben+Thanh/@10.7720,106.6980,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.772463!4d106.698017",
      ),
    ).toEqual({ latitude: 10.772463, longitude: 106.698017 });
  });

  it.each([
    ["https://www.google.com/maps/@10.7769,106.7009,15z", 10.7769, 106.7009],
    ["https://maps.google.com/?q=10.7769,106.7009", 10.7769, 106.7009],
    ["https://www.google.com/maps/search/10.7769,+106.7009", 10.7769, 106.7009],
    ["https://www.google.com.vn/maps/@-33.8688,151.2093,12z", -33.8688, 151.2093],
  ])("parses %s", (url, latitude, longitude) => {
    expect(parseGoogleMapsCoordinates(url)).toEqual({ latitude, longitude });
  });

  it.each([
    "https://www.google.com/maps/place/Ben+Thanh",
    "https://example.com/maps/@10.7,106.7,15z",
    "https://www.google.com/maps/@95.0,106.7,15z",
    "not a url",
    "https://www.google.com/maps/place/%E0%A4%A/@1,2",
  ])("returns null for %s", (url) => {
    expect(parseGoogleMapsCoordinates(url)).toBeNull();
  });
});

describe("resolveGoogleMapsUrl", () => {
  it("follows a short link", async () => {
    const fake = vi.fn(async () => ({ url: "https://www.google.com/maps/place/X/@1,2,3z" }) as Response);
    await expect(resolveGoogleMapsUrl("https://maps.app.goo.gl/abc", fake)).resolves.toBe(
      "https://www.google.com/maps/place/X/@1,2,3z",
    );
  });

  it("returns a full Google link unchanged", async () => {
    const fake = vi.fn();
    const url = "https://www.google.com/maps/@1,2,3z";
    await expect(resolveGoogleMapsUrl(url, fake)).resolves.toBe(url);
    expect(fake).not.toHaveBeenCalled();
  });

  it("rejects non-Google hosts", async () => {
    await expect(resolveGoogleMapsUrl("https://example.com/x", vi.fn())).rejects.toThrow("invalid_map_link");
    await expect(resolveGoogleMapsUrl("not a url", vi.fn())).rejects.toThrow("invalid_map_link");
  });
});
