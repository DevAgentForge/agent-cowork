import { vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  lstatSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn()
  }
}));

// Mock os module
vi.mock("os", () => ({
  homedir: vi.fn(() => "/mock/home"),
  platform: vi.fn(() => "darwin"),
  type: vi.fn(() => "Darwin")
}));

// Mock path module
vi.mock("path", () => ({
  join: vi.fn((...args: string[]) => args.join("/")),
  dirname: vi.fn((p: string) => p.split("/").slice(0, -1).join("/")),
  basename: vi.fn((p: string) => p.split("/").pop() || ""),
  resolve: vi.fn((...args: string[]) => args.join("/")),
  relative: vi.fn(() => ""),
  isAbsolute: vi.fn(() => false),
  extname: vi.fn(() => ".ts"),
  parse: vi.fn(() => ({ root: "", dir: "", base: "", ext: "", name: "" }))
}));

// Global test timeout
beforeAll(() => {
  vi.setConfig({ testTimeout: 30000 });
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.resetAllMocks();
});
