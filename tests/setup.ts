import { vi } from "vitest";
import { cookieJar } from "./helpers/cookie-jar";

vi.mock("next/headers", () => ({ cookies: async () => cookieJar }));
