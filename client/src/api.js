/** En prod (Vercel), définir VITE_API_URL = URL du serveur API (sans / final). */
const base = String(import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function onNetworkError(err) {
  if (err instanceof TypeError) {
    const hint =
      import.meta.env.PROD && !base
        ? " Configure VITE_API_URL sur Vercel (URL de ton API hébergée)."
        : " Démarre le backend : dans server/, « npm run dev » (port 3001).";
    throw new Error(`Connexion à l’API impossible.${hint}`);
  }
  throw err;
}

async function handle(res) {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function fetchTasks() {
  return fetch(`${base}/api/tasks`).catch(onNetworkError).then(handle);
}

export function createTask({ title, time, repeatWeekly, repeatDays, priority }) {
  return fetch(`${base}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, time, repeatWeekly, repeatDays, priority }),
  })
    .catch(onNetworkError)
    .then(handle);
}

export function patchTask(id, body) {
  return fetch(`${base}/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .catch(onNetworkError)
    .then(handle);
}

export function updateTaskCompleted(id, completed) {
  return patchTask(id, { completed });
}

export function deleteTask(id) {
  return fetch(`${base}/api/tasks/${id}`, { method: "DELETE" })
    .catch(onNetworkError)
    .then(handle);
}
