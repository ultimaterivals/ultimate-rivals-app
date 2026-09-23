import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireWritableAthleteViewer } from "./athlete-viewer";

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  cookie: vi.fn(),
  single: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/auth/session", () => ({ getSessionIdentity: mocks.identity }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: mocks.single,
    };
    return { from: () => query };
  },
}));

describe("writable athlete viewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookie.mockReturnValue(undefined);
    mocks.identity.mockResolvedValue({ userId: "own-user", role: "admin" });
    mocks.single.mockResolvedValue({
      data: {
        id: "own-athlete",
        profile_id: "own-user",
        public_name: "Own",
        athlete_code: "QA",
      },
      error: null,
    });
  });
  it("allows an administrator's own athlete identity without impersonation", async () => {
    await expect(requireWritableAthleteViewer()).resolves.toMatchObject({
      athleteId: "own-athlete",
      userId: "own-user",
      isPreview: false,
    });
  });
  it("rejects writes from Preview even when the administrator also owns an athlete profile", async () => {
    mocks.cookie.mockReturnValue({ value: "preview-athlete" });
    mocks.single.mockResolvedValue({
      data: {
        id: "preview-athlete",
        profile_id: "other-user",
        public_name: "Preview",
        athlete_code: "QA2",
      },
      error: null,
    });
    await expect(requireWritableAthleteViewer()).rejects.toThrow(
      "ATHLETE_PREVIEW_READ_ONLY",
    );
  });
  it("rejects an administrator without an athlete identity", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    await expect(requireWritableAthleteViewer()).rejects.toThrow(
      "redirect:/admin/preview",
    );
  });
});
