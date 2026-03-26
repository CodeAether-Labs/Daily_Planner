import express from "express";
import cors from "cors";
import { loadTasks, saveTasks } from "./tasksStore.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "daily-planner-api" });
});

/** Accepte HH:mm ou HH:mm:ss (navigateurs) et normalise en HH:mm. */
function normalizeTime(time) {
  if (typeof time !== "string") return null;
  const t = time.trim();
  const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

/** 0 = dimanche … 6 = samedi (comme Date#getDay). */
function sanitizeRepeatDays(arr) {
  if (!Array.isArray(arr)) return [];
  const set = new Set();
  for (const x of arr) {
    const n = Number(x);
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

function sanitizePriority(p) {
  if (p === "high" || p === "low" || p === "normal") return p;
  return "normal";
}

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

function priorityRank(p) {
  return PRIORITY_RANK[sanitizePriority(p)] ?? 1;
}

function taskWithDefaults(t) {
  const repeatWeekly = Boolean(t.repeatWeekly);
  let repeatDays = sanitizeRepeatDays(t.repeatDays);
  if (!repeatWeekly) repeatDays = [];
  const priority = sanitizePriority(t.priority);
  return { ...t, repeatWeekly, repeatDays, priority };
}

function validateRepeatOrError(t) {
  if (t.repeatWeekly && (!t.repeatDays || t.repeatDays.length === 0)) {
    return "pour une tâche récurrente, choisis au moins un jour de la semaine";
  }
  return null;
}

function sortTasks(list) {
  return list.sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      (a.time || "").localeCompare(b.time || "") ||
      String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
      String(a.id || "").localeCompare(String(b.id || "")),
  );
}

app.get("/api/tasks", (_req, res) => {
  const tasks = sortTasks(loadTasks().map(taskWithDefaults));
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const { title, time, repeatWeekly: rwBody, repeatDays: rdBody, priority: prBody } =
    req.body || {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title requis" });
  }
  const timeNorm = normalizeTime(time);
  if (!timeNorm) {
    return res.status(400).json({ error: "time doit être au format HH:mm ou HH:mm:ss (24h)" });
  }

  const repeatWeekly = Boolean(rwBody);
  let repeatDays = sanitizeRepeatDays(rdBody);
  if (repeatWeekly && repeatDays.length === 0) {
    return res.status(400).json({
      error: "pour une tâche récurrente, choisis au moins un jour de la semaine",
    });
  }
  if (!repeatWeekly) repeatDays = [];

  const priority = sanitizePriority(prBody);

  const tasks = loadTasks();
  const task = taskWithDefaults({
    id: crypto.randomUUID(),
    title: title.trim(),
    time: timeNorm,
    completed: false,
    createdAt: new Date().toISOString(),
    repeatWeekly,
    repeatDays,
    priority,
  });
  tasks.push(task);
  saveTasks(tasks);
  res.status(201).json(task);
});

app.patch("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const patchKeys = [
    "completed",
    "title",
    "time",
    "repeatWeekly",
    "repeatDays",
    "priority",
  ];
  const hasAny = patchKeys.some((k) => body[k] !== undefined);
  if (!hasAny) {
    return res.status(400).json({ error: "aucun champ à mettre à jour" });
  }

  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "tâche introuvable" });
  }

  let next = { ...tasks[idx] };

  if (typeof body.completed === "boolean") {
    next.completed = body.completed;
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return res.status(400).json({ error: "title invalide" });
    }
    next.title = body.title.trim();
  }
  if (body.time !== undefined) {
    const tn = normalizeTime(body.time);
    if (!tn) {
      return res.status(400).json({ error: "time doit être au format HH:mm ou HH:mm:ss (24h)" });
    }
    next.time = tn;
  }
  if (body.repeatWeekly !== undefined) {
    next.repeatWeekly = Boolean(body.repeatWeekly);
  }
  if (body.repeatDays !== undefined) {
    next.repeatDays = sanitizeRepeatDays(body.repeatDays);
  }
  if (body.priority !== undefined) {
    next.priority = sanitizePriority(body.priority);
  }

  next = taskWithDefaults(next);
  const verr = validateRepeatOrError(next);
  if (verr) {
    return res.status(400).json({ error: verr });
  }

  tasks[idx] = next;
  saveTasks(tasks);
  res.json(tasks[idx]);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const tasks = loadTasks();
  const next = tasks.filter((t) => t.id !== id);
  if (next.length === tasks.length) {
    return res.status(404).json({ error: "tâche introuvable" });
  }
  saveTasks(next);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Daily Planner API → http://localhost:${PORT}`);
});
