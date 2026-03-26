import { useEffect, useRef } from "react";
import { BRAND } from "./branding.js";

const STORAGE_KEY = "daily-planner-reminders-enabled";
const REMINDER_LEAD_MS = 5 * 60 * 1000;

export function getRemindersEnabled() {
  if (typeof localStorage === "undefined") return true;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === null) return true;
  return v === "1" || v === "true";
}

export function setRemindersEnabledStorage(on) {
  localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** API renvoie HH:mm ; tolère HH:mm:ss */
export function normalizeTaskTime(t) {
  if (typeof t !== "string") return "";
  const m = t.trim().match(/^(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function localDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sameLocalMinute(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addLocalDays(dayStart, n) {
  const x = new Date(dayStart);
  x.setDate(x.getDate() + n);
  return x;
}

function taskAppliesOnEventDate(task, eventTime) {
  const repeatWeekly = Boolean(task.repeatWeekly);
  const days = Array.isArray(task.repeatDays) ? task.repeatDays : [];
  if (!repeatWeekly) {
    const c = new Date(task.createdAt);
    return (
      c.getFullYear() === eventTime.getFullYear() &&
      c.getMonth() === eventTime.getMonth() &&
      c.getDate() === eventTime.getDate()
    );
  }
  return days.includes(eventTime.getDay());
}

function fireKey(taskId, remindAt) {
  return `${taskId}|${localDateKey(remindAt)}|${pad2(remindAt.getHours())}:${pad2(
    remindAt.getMinutes(),
  )}`;
}

/**
 * Rappel 5 min avant l’heure du créneau. Tâche sans répétition : uniquement le jour
 * de création (date locale). Tâche récurrente : jours cochés (getDay 0–6).
 */
export function useTaskReminders(tasks, { enabled, browserNotify, onRemind }) {
  const firedRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || typeof onRemind !== "function") return undefined;

    const tick = () => {
      const now = new Date();
      const day0 = startOfLocalDay(now);
      const dayStarts = [day0, addLocalDays(day0, 1)];

      for (const task of tasks) {
        if (task.completed) continue;
        const ttime = normalizeTaskTime(task.time);
        if (!ttime) continue;
        const [th, tm] = ttime.split(":").map(Number);

        for (const dayStart of dayStarts) {
          const eventTime = new Date(dayStart);
          eventTime.setHours(th, tm, 0, 0);
          if (!taskAppliesOnEventDate(task, eventTime)) continue;

          const remindAt = new Date(eventTime.getTime() - REMINDER_LEAD_MS);
          if (!sameLocalMinute(remindAt, now)) continue;

          const fk = fireKey(task.id, remindAt);
          if (firedRef.current.has(fk)) continue;
          firedRef.current.add(fk);

          if (
            browserNotify &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(BRAND.notifications.titleBefore, {
                body: `${ttime} · ${task.title}`,
                tag: fk,
                renotify: true,
              });
            } catch {
              /* ignore */
            }
          }

          try {
            navigator.vibrate?.(200);
          } catch {
            /* ignore */
          }

          onRemind(task);
        }
      }
    };

    const id = setInterval(tick, 15000);
    tick();
    return () => clearInterval(id);
  }, [tasks, enabled, browserNotify, onRemind]);
}
