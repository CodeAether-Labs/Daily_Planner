import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const TASKS_FILE = join(DATA_DIR, "tasks.json");

function ensureDataFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(TASKS_FILE)) {
    writeFileSync(TASKS_FILE, "[]", "utf8");
  }
}

export function loadTasks() {
  ensureDataFile();
  try {
    const raw = readFileSync(TASKS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  ensureDataFile();
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
}
