import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createTask,
  deleteTask,
  fetchTasks,
  patchTask,
  updateTaskCompleted,
} from "./api.js";
import {
  getRemindersEnabled,
  setRemindersEnabledStorage,
  useTaskReminders,
} from "./useTaskReminders.js";
import { BRAND } from "./branding.js";
import "./App.css";

function formatError(err) {
  return err instanceof Error ? err.message : String(err);
}

function normPriority(p) {
  if (p === "high" || p === "low" || p === "normal") return p;
  return "normal";
}

/** "23:05" ou "23:05:00" → "23 h 05" (usage courant en français) */
function formatTimeFr(value) {
  if (!value || typeof value !== "string") return "";
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")} h ${m[2]}`;
}

/** getDay() : 0 dim … 6 sam — ordre d’affichage lun → dim */
const WEEK_DAYS = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mer", value: 3 },
  { label: "Jeu", value: 4 },
  { label: "Ven", value: 5 },
  { label: "Sam", value: 6 },
  { label: "Dim", value: 0 },
];

const DAY_SHORT = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
};

const PRIORITY_OPTIONS = [
  { id: "high", label: "Haute" },
  { id: "normal", label: "Normale" },
  { id: "low", label: "Basse" },
];

function formatDaysShort(days) {
  if (!Array.isArray(days) || days.length === 0) return "";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d] ?? d)
    .join(" · ");
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("normal");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatDays, setRepeatDays] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [remindersOn, setRemindersOn] = useState(() => getRemindersEnabled());
  const [notifyPerm, setNotifyPerm] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [taskFilter, setTaskFilter] = useState("all");
  const [deleteUndo, setDeleteUndo] = useState(null);

  const remindClearRef = useRef(null);
  const deleteUndoTimerRef = useRef(null);
  const formCardRef = useRef(null);
  const titleBaseRef = useRef(BRAND.pageTitle);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await fetchTasks();
      setTasks(list);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDeleteUndoTimer = useCallback(() => {
    if (deleteUndoTimerRef.current) {
      clearTimeout(deleteUndoTimerRef.current);
      deleteUndoTimerRef.current = null;
    }
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setTime("");
    setPriority("normal");
    setRepeatWeekly(false);
    setRepeatDays(new Set());
    setEditingId(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    document.title = BRAND.pageTitle;
    titleBaseRef.current = BRAND.pageTitle;
  }, []);

  useEffect(() => () => clearDeleteUndoTimer(), [clearDeleteUndoTimer]);

  const dismissToast = useCallback(() => {
    if (remindClearRef.current) {
      clearTimeout(remindClearRef.current);
      remindClearRef.current = null;
    }
    setToast(null);
    setHighlightId(null);
    document.title = titleBaseRef.current;
  }, []);

  const dismissDeleteUndo = useCallback(() => {
    clearDeleteUndoTimer();
    setDeleteUndo(null);
  }, [clearDeleteUndoTimer]);

  useEffect(() => {
    if (!toast) return undefined;
    function onKey(e) {
      if (e.key === "Escape") dismissToast();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toast, dismissToast]);

  useEffect(() => {
    if (!deleteUndo) return undefined;
    function onKey(e) {
      if (e.key === "Escape") dismissDeleteUndo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteUndo, dismissDeleteUndo]);

  const onRemind = useCallback((task) => {
    if (remindClearRef.current) {
      clearTimeout(remindClearRef.current);
    }
    setToast({
      id: task.id,
      time: task.time,
      title: task.title,
    });
    setHighlightId(task.id);

    const short =
      task.title.length > 24 ? `${task.title.slice(0, 24)}…` : task.title;
    document.title = `🔔 5 min · ${short}`;
    const titleTimer = window.setTimeout(() => {
      document.title = titleBaseRef.current;
    }, 7000);

    remindClearRef.current = window.setTimeout(() => {
      setToast(null);
      setHighlightId(null);
      document.title = titleBaseRef.current;
      clearTimeout(titleTimer);
    }, 12000);
  }, []);

  useTaskReminders(tasks, {
    enabled: remindersOn && !loading,
    browserNotify: notifyPerm === "granted",
    onRemind,
  });

  async function requestNotifications() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifyPerm(p);
  }

  function toggleRepeatDay(dayValue) {
    if (!repeatWeekly) return;
    setRepeatDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayValue)) next.delete(dayValue);
      else next.add(dayValue);
      return next;
    });
  }

  function startEdit(task) {
    dismissDeleteUndo();
    setError(null);
    setEditingId(task.id);
    setTitle(task.title);
    setTime(task.time);
    setPriority(normPriority(task.priority));
    setRepeatWeekly(Boolean(task.repeatWeekly));
    setRepeatDays(
      new Set(
        Array.isArray(task.repeatDays) && task.repeatWeekly ? task.repeatDays : [],
      ),
    );
    window.requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    if (repeatWeekly && repeatDays.size === 0) {
      setError("Pour une tâche récurrente, coche au moins un jour.");
      setSubmitting(false);
      return;
    }
    const payload = {
      title: title.trim(),
      time,
      repeatWeekly,
      repeatDays: repeatWeekly ? [...repeatDays].sort((a, b) => a - b) : [],
      priority,
    };
    try {
      if (editingId) {
        await patchTask(editingId, payload);
        resetForm();
      } else {
        await createTask(payload);
        setTitle("");
        setTime("");
        setPriority("normal");
        setRepeatWeekly(false);
        setRepeatDays(new Set());
      }
      await refresh();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleCompleted(task) {
    setError(null);
    try {
      await updateTaskCompleted(task.id, !task.completed);
      await refresh();
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function remove(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const snapshot = {
      title: task.title,
      time: task.time,
      repeatWeekly: Boolean(task.repeatWeekly),
      repeatDays: Array.isArray(task.repeatDays) ? [...task.repeatDays] : [],
      priority: normPriority(task.priority),
      completed: Boolean(task.completed),
    };
    setError(null);
    clearDeleteUndoTimer();
    if (editingId === id) resetForm();
    try {
      await deleteTask(id);
      await refresh();
      setDeleteUndo(snapshot);
      deleteUndoTimerRef.current = window.setTimeout(() => {
        setDeleteUndo(null);
        deleteUndoTimerRef.current = null;
      }, 8000);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function undoDelete() {
    if (!deleteUndo) return;
    const s = deleteUndo;
    clearDeleteUndoTimer();
    setDeleteUndo(null);
    setError(null);
    try {
      const created = await createTask({
        title: s.title,
        time: s.time,
        repeatWeekly: s.repeatWeekly,
        repeatDays: s.repeatWeekly ? s.repeatDays : [],
        priority: s.priority,
      });
      if (s.completed) {
        await updateTaskCompleted(created.id, true);
      }
      await refresh();
    } catch (err) {
      setError(formatError(err));
    }
  }

  const filteredTasks = useMemo(() => {
    if (taskFilter === "active") return tasks.filter((t) => !t.completed);
    if (taskFilter === "done") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, taskFilter]);

  return (
    <div className="layout">
      {toast && (
        <div className="toast" role="alert" aria-live="assertive">
          <div className="toast-inner">
            <span className="sr-only">Échap pour fermer.</span>
            <strong className="toast-title">Dans 5 minutes</strong>
            <p className="toast-body">
              <span className="toast-time">{toast.time}</span> — {toast.title}
            </p>
            <button
              type="button"
              className="toast-close"
              onClick={dismissToast}
              aria-label="Fermer le rappel"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <p className="eyebrow">{BRAND.eyebrow}</p>
        <h1>{BRAND.productName}</h1>
        <p className="subtitle">{BRAND.subtitle}</p>
      </header>

      <section
        className="card reminders-card"
        aria-label="Paramètres des rappels"
      >
        <div className="reminders-header">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={remindersOn}
              onChange={(e) => {
                const v = e.target.checked;
                setRemindersOn(v);
                setRemindersEnabledStorage(v);
              }}
            />
            <span className="toggle-text">Rappels (5 min avant)</span>
          </label>
        </div>
        <p className="field-hint reminders-hint">
          Alerte <strong>5 minutes avant</strong> l’heure du créneau (tâche non
          terminée). Active les notifications pour être prévenu même si l’onglet
          n’est pas au premier plan (selon le navigateur).
        </p>
        {typeof Notification !== "undefined" &&
          notifyPerm !== "granted" &&
          (notifyPerm === "denied" ? (
            <p className="field-hint reminders-blocked">
              Notifications refusées dans ce navigateur. Tu peux les réactiver dans
              les paramètres du site.
            </p>
          ) : (
            <button
              type="button"
              className="btn ghost notify-btn"
              onClick={requestNotifications}
            >
              Autoriser les notifications du navigateur
            </button>
          ))}
      </section>

      <main className="main">
        {error && (
          <div className="banner error" role="alert">
            {error}
          </div>
        )}

        {deleteUndo && (
          <div className="undo-banner" role="status">
            <span>Tâche supprimée.</span>
            <button type="button" className="btn ghost undo-btn" onClick={undoDelete}>
              Annuler
            </button>
            <button
              type="button"
              className="undo-dismiss"
              onClick={dismissDeleteUndo}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        )}

        <section
          ref={formCardRef}
          className={["card", "form-card", editingId && "form-card-editing"]
            .filter(Boolean)
            .join(" ")}
          aria-labelledby="form-heading"
        >
          <h2 id="form-heading" className="card-title">
            {editingId ? "Modifier la tâche" : "Nouvelle tâche"}
          </h2>
          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span className="label">Titre</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Révision logique, TD maths, rendez-vous…"
                required
                maxLength={200}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span className="label" id="time-label">
                Heure du créneau (24 h)
              </span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                step={60}
                aria-labelledby="time-label"
                aria-describedby={["time-hint", time && "time-fr-readout"]
                  .filter(Boolean)
                  .join(" ")}
              />
              {time ? (
                <p id="time-fr-readout" className="field-hint time-fr-readout">
                  Lecture habituelle : <strong>{formatTimeFr(time)}</strong>.
                </p>
              ) : null}
              <p id="time-hint" className="field-hint">
                Ce n’est pas une durée : indique l’heure à laquelle tu fais la tâche.
                Dans le sélecteur : format 24 h ; <strong>23:05</strong> correspond à{" "}
                <strong>23 h 05</strong>.
              </p>
            </label>

            <div className="field priority-field">
              <span className="label" id="priority-label">
                Priorité
              </span>
              <div
                className="priority-segment"
                role="group"
                aria-labelledby="priority-label"
              >
                {PRIORITY_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={[
                      "priority-tab",
                      priority === id && "priority-tab-active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={priority === id}
                    onClick={() => setPriority(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="field-hint">
                La liste est triée : <strong>haute</strong> en premier, puis heure.
              </p>
            </div>

            <div className="field repeat-field">
              <label className="toggle-label repeat-master">
                <input
                  type="checkbox"
                  checked={repeatWeekly}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setRepeatWeekly(on);
                    if (!on) setRepeatDays(new Set());
                  }}
                />
                <span className="toggle-text">Répéter chaque semaine</span>
              </label>
              <p className="field-hint">
                Sinon, la tâche est prévue <strong>une seule fois</strong>, le jour où tu
                l’ajoutes (rappel ce jour-là uniquement).
              </p>
              <div
                className={`days-grid ${repeatWeekly ? "" : "days-grid-disabled"}`}
                role="group"
                aria-label="Jours de la semaine"
              >
                {WEEK_DAYS.map(({ label, value }) => (
                  <label
                    key={value}
                    className={[
                      "day-chip",
                      repeatDays.has(value) && repeatWeekly && "day-chip-on",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="day-chip-input"
                      checked={repeatDays.has(value)}
                      disabled={!repeatWeekly}
                      onChange={() => toggleRepeatDay(value)}
                    />
                    <span className="day-chip-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              {editingId ? (
                <button
                  type="button"
                  className="btn ghost form-cancel"
                  onClick={resetForm}
                >
                  Annuler la modification
                </button>
              ) : null}
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting
                  ? editingId
                    ? "Enregistrement…"
                    : "Ajout…"
                  : editingId
                    ? "Enregistrer"
                    : "Ajouter"}
              </button>
            </div>
          </form>
        </section>

        <section className="card list-card" aria-labelledby="list-heading">
          <div className="list-card-header">
            <h2 id="list-heading" className="card-title">
              Aujourd’hui
            </h2>
            {!loading && tasks.length > 0 ? (
              <span
                className="task-count-badge"
                aria-label={`${tasks.length} tâche${tasks.length > 1 ? "s" : ""}`}
              >
                {tasks.length}
              </span>
            ) : null}
          </div>
          {loading ? (
            <p className="loading-hint center">Chargement</p>
          ) : tasks.length === 0 ? (
            <p className="empty-state center">
              Aucune tâche pour l’instant. Ajoute-en une dans le formulaire ci-dessus.
            </p>
          ) : (
            <>
              <div
                className="list-filters"
                role="tablist"
                aria-label="Filtrer les tâches"
              >
                {[
                  { id: "all", label: "Toutes" },
                  { id: "active", label: "À faire" },
                  { id: "done", label: "Terminées" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={taskFilter === id}
                    className={[
                      "filter-tab",
                      taskFilter === id && "filter-tab-active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setTaskFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {filteredTasks.length === 0 ? (
                <p className="empty-state filter-empty center">
                  Aucune tâche dans cette catégorie.
                </p>
              ) : (
                <ul className="task-list">
                  {filteredTasks.map((task) => {
                    const pr = normPriority(task.priority);
                    return (
                      <li
                        key={task.id}
                        className={[
                          "task-row",
                          `task-priority-${pr}`,
                          task.completed && "done",
                          highlightId === task.id && "reminder-highlight",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <button
                          type="button"
                          className="check"
                          onClick={() => toggleCompleted(task)}
                          aria-pressed={task.completed}
                          aria-label={
                            task.completed
                              ? "Marquer comme non terminée"
                              : "Marquer comme terminée"
                          }
                        >
                          {task.completed ? "✓" : ""}
                        </button>
                        <div className="task-body">
                          <div className="task-line-top">
                            <span
                              className={[
                                "priority-dot",
                                pr === "high" && "priority-dot-high",
                                pr === "low" && "priority-dot-low",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              title={
                                pr === "high"
                                  ? "Priorité haute"
                                  : pr === "low"
                                    ? "Priorité basse"
                                    : "Priorité normale"
                              }
                              aria-hidden
                            />
                            <span className="task-time-pill">{task.time}</span>
                          </div>
                          <span className="task-title">{task.title}</span>
                          <span className="task-repeat-meta">
                            {task.repeatWeekly && task.repeatDays?.length > 0 ? (
                              <span className="task-repeat">
                                {formatDaysShort(task.repeatDays)}
                              </span>
                            ) : (
                              <span className="task-repeat task-repeat-once">
                                Une fois
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="task-actions">
                          <button
                            type="button"
                            className="btn ghost btn-edit"
                            onClick={() => startEdit(task)}
                            aria-label={`Modifier ${task.title}`}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="btn ghost danger"
                            onClick={() => remove(task.id)}
                            aria-label={`Supprimer ${task.title}`}
                          >
                            Supprimer
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
