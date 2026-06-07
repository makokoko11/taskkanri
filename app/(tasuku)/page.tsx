"use client";
import { useState, useEffect, useRef } from "react";

const HOLIDAYS = new Set([
  "2024-01-01","2024-01-08","2024-02-11","2024-02-12","2024-02-23",
  "2024-03-20","2024-04-29","2024-05-03","2024-05-04","2024-05-05",
  "2024-05-06","2024-07-15","2024-08-11","2024-08-12","2024-09-16",
  "2024-09-22","2024-09-23","2024-10-14","2024-11-03","2024-11-04","2024-11-23",
  "2025-01-01","2025-01-13","2025-02-11","2025-02-23","2025-02-24",
  "2025-03-20","2025-04-29","2025-05-03","2025-05-04","2025-05-05",
  "2025-05-06","2025-07-21","2025-08-11","2025-09-15","2025-09-23",
  "2025-10-13","2025-11-03","2025-11-23","2025-11-24",
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23",
  "2026-03-20","2026-04-29","2026-05-03","2026-05-04","2026-05-05",
  "2026-05-06","2026-07-20","2026-08-11","2026-09-21","2026-09-22",
  "2026-09-23","2026-10-12","2026-11-03","2026-11-23",
  "2027-01-01","2027-01-11","2027-02-11","2027-02-23",
  "2027-03-21","2027-04-29","2027-05-03","2027-05-04","2027-05-05",
  "2027-07-19","2027-08-11","2027-09-20","2027-09-23",
  "2027-10-11","2027-11-03","2027-11-23",
]);

const DAY_JA = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

function formatDate(d: string): { text: string; colorClass: string } {
  const date = new Date(d + "T00:00:00");
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const dow = date.getDay();
  const isHoliday = HOLIDAYS.has(d);
  const text = `${m}月${day}日（${DAY_JA[dow]}）`;
  const colorClass =
    dow === 0 || isHoliday ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-600";
  return { text, colorClass };
}

function formatDateReiwa(d: string): { text: string; colorClass: string } {
  const date = new Date(d + "T00:00:00");
  const year = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const dow = date.getDay();
  const isHoliday = HOLIDAYS.has(d);
  const reiwa = year - 2018;
  const text = `令和${reiwa}年${m}月${day}日（${DAY_JA[dow]}）`;
  const colorClass =
    dow === 0 || isHoliday ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-500";
  return { text, colorClass };
}

function getCardUrgency(dueDate: string | undefined, done: boolean) {
  if (done || !dueDate) return "normal";
  const t = new Date().toISOString().slice(0, 10);
  const tom = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dueDate <= t) return "today";
  if (dueDate === tom) return "tomorrow";
  return "normal";
}

const URGENCY_STYLE: Record<string, string> = {
  today:    "bg-red-100 border-red-300",
  tomorrow: "bg-yellow-50 border-yellow-300",
  normal:   "bg-white border-pink-100",
};

type Category = "work" | "private";
type Tab = "todo" | "done";
type ViewMode = "list" | "calendar";

interface Task {
  id: string;
  title: string;
  done: boolean;
  important: boolean;
  createdAt: number;
  dueDate?: string;
  doneAt?: string;
  category: Category;
}

// ─── カレンダーコンポーネント ───────────────────────────────────
function CalendarView({
  tasks,
  category,
  year,
  month,
}: {
  tasks: Task[];
  category: Category;
  year: number;
  month: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((firstDow + daysInMonth) / 7);
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthTasks = tasks.filter(
    (t) => t.category === category && t.dueDate?.startsWith(monthStr)
  );

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden border-2 border-pink-100">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 bg-gradient-to-r from-pink-50 to-purple-50 shrink-0">
        {DAY_JA.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-extrabold py-1.5 ${
              i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-gray-600"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div
        className="flex-1 min-h-0 bg-white"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${weeks}, 1fr)`,
        }}
      >
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`e${i}`} className="bg-gray-50/50 border border-pink-50/60" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dow = new Date(year, month, day).getDay();
          const isToday = dateStr === today;
          const isHoliday = HOLIDAYS.has(dateStr);
          const dayTasks = monthTasks.filter((t) => t.dueDate === dateStr);
          const numColor =
            isToday ? "" :
            dow === 0 || isHoliday ? "text-red-600" :
            dow === 6 ? "text-blue-600" : "text-gray-700";

          return (
            <div
              key={day}
              className={`border border-pink-50/60 p-px flex flex-col overflow-hidden ${
                isToday ? "bg-pink-50/70" : ""
              }`}
            >
              {/* 日付番号 */}
              <div className="flex justify-center pt-px mb-px shrink-0">
                <span
                  className={`text-[11px] font-extrabold w-[18px] h-[18px] flex items-center justify-center rounded-full leading-none ${
                    isToday ? "bg-pink-500 text-white" : numColor
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* タスク一覧（セル内スクロール） */}
              <div className="flex flex-col gap-px overflow-y-auto flex-1 min-h-0">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`text-[9px] leading-snug px-0.5 rounded break-all shrink-0 ${
                      t.done
                        ? "text-gray-500 line-through"
                        : t.important
                        ? "text-white bg-gradient-to-r from-pink-600 to-red-500"
                        : "text-purple-900 bg-purple-100"
                    }`}
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ────────────────────────────────────────
export default function TaskPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [important, setImportant] = useState(false);
  const [tab, setTab] = useState<Tab>("todo");
  const [category, setCategory] = useState<Category>("work");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tasuku-tasks");
      if (!saved) return;
      const parsed: Task[] = JSON.parse(saved);
      const migrated = parsed.map((t) => ({
        ...t,
        category: t.category ?? "work",
        done: t.done ?? false,
        important: t.important ?? false,
      }));
      setTasks(migrated);
    } catch {
      localStorage.removeItem("tasuku-tasks");
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const check = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const today = new Date().toISOString().slice(0, 10);
      const key = `tasuku-notified-${today}`;
      const notified = new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]"));
      tasks.forEach((t) => {
        if (!t.done && t.dueDate === today && !notified.has(t.id)) {
          new Notification("⏰ 今日が期限です！", { body: t.title, icon: "/icon.png", tag: `dl-${t.id}` });
          fetch("/api/line-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "⏰ 今日が期限です！", body: t.title }),
          }).catch(() => {});
          notified.add(t.id);
        }
      });
      localStorage.setItem(key, JSON.stringify([...notified]));
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [tasks, notifPermission]);

  const persist = (next: Task[]) => {
    setTasks(next);
    localStorage.setItem("tasuku-tasks", JSON.stringify(next));
  };

  const addTask = () => {
    const title = input.trim();
    if (!title) return;
    persist([
      ...tasks,
      {
        id: crypto.randomUUID(),
        title,
        done: false,
        important,
        createdAt: Date.now(),
        dueDate: dueDate || undefined,
        category,
      },
    ]);
    setInput("");
    setDueDate("");
    setImportant(false);
    inputRef.current?.focus();
  };

  const toggleDone = (id: string) =>
    persist(tasks.map((t) =>
      t.id === id
        ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString().slice(0, 10) : undefined }
        : t
    ));

  const deleteTask = (id: string) =>
    persist(tasks.filter((t) => t.id !== id));

  const requestNotification = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotifPermission(p);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const byCategory = tasks.filter((t) => t.category === category);
  const sortByDue = (arr: Task[]) =>
    [...arr].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  const todoList = sortByDue(byCategory.filter((t) => !t.done));
  const doneList = sortByDue(byCategory.filter((t) => t.done));
  const list = tab === "todo" ? todoList : doneList;
  const previewDue = dueDate ? formatDate(dueDate) : null;

  const isCalendar = viewMode === "calendar";

  return (
    <div
      className={`max-w-xl mx-auto px-4 ${
        isCalendar
          ? "h-[100dvh] flex flex-col pt-5 pb-[72px] overflow-hidden"
          : "py-10 pb-28"
      }`}
    >
      {/* ヘッダー */}
      <header className={`flex items-center justify-between ${isCalendar ? "mb-2 shrink-0" : "mb-6"}`}>
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
          タスク管理
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="text-xs font-bold text-pink-500 bg-pink-50 border-2 border-pink-200 rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer appearance-none"
          >
            <option value="list">📋 リスト</option>
            <option value="calendar">📅 カレンダー</option>
          </select>
          <button
            onClick={requestNotification}
            disabled={notifPermission === "denied"}
            title={
              notifPermission === "granted" ? "通知オン" :
              notifPermission === "denied" ? "ブラウザ設定で許可してください" :
              "通知を有効にする"
            }
            className={`text-xl leading-none transition-all select-none ${
              notifPermission === "denied" ? "opacity-25 cursor-not-allowed" : "hover:scale-110 active:scale-95"
            }`}
          >
            {notifPermission === "granted" ? "🔔" : "🔕"}
          </button>
        </div>
      </header>

      {/* ───── カレンダービュー ───── */}
      {isCalendar && (
        <>
          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border-2 border-pink-200 text-pink-400 font-extrabold text-lg hover:bg-pink-50 active:scale-95 transition-all"
            >
              ‹
            </button>
            <span className="text-base font-extrabold text-gray-700">
              {calYear}年{MONTHS_JA[calMonth]}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border-2 border-pink-200 text-pink-400 font-extrabold text-lg hover:bg-pink-50 active:scale-95 transition-all"
            >
              ›
            </button>
          </div>

          <CalendarView
            tasks={tasks}
            category={category}
            year={calYear}
            month={calMonth}
          />
        </>
      )}

      {/* ───── リストビュー ───── */}
      {!isCalendar && (
        <>
          {/* 入力エリア */}
          <div className="flex gap-2 mb-6 items-start">
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="新しいタスクを入力..."
                className="w-full px-4 py-3 border-2 border-pink-200 rounded-2xl bg-white text-gray-700 placeholder-pink-200 focus:outline-none focus:border-pink-400 transition"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 border-2 border-pink-200 rounded-xl bg-white">
                  <span className="text-xs font-bold text-pink-300">期限</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-sm text-gray-600 bg-transparent focus:outline-none cursor-pointer"
                  />
                  {previewDue && (
                    <span className={`text-sm font-bold shrink-0 ${previewDue.colorClass}`}>
                      {previewDue.text}
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={important}
                    onChange={(e) => setImportant(e.target.checked)}
                    className="w-4 h-4 accent-pink-500 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-pink-400">重要</span>
                </label>
              </div>
            </div>
            <button
              onClick={addTask}
              className="px-5 py-3 bg-gradient-to-br from-pink-400 to-purple-400 text-white font-extrabold rounded-2xl hover:from-pink-500 hover:to-purple-500 active:scale-95 transition-all shadow-md"
            >
              追加
            </button>
          </div>

          {/* タブ */}
          <div className="flex gap-2 mb-4">
            {(["todo", "done"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-1.5 rounded-full text-sm font-extrabold transition-all ${
                  tab === t
                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow"
                    : "bg-white border-2 border-pink-200 text-pink-400 hover:bg-pink-50"
                }`}
              >
                {t === "todo" ? "タスク" : "完了"}
                <span className="ml-1.5 text-xs opacity-70">
                  {t === "todo" ? todoList.length : doneList.length}
                </span>
              </button>
            ))}
          </div>

          {/* タスクリスト */}
          <div className="space-y-2">
            {list.length === 0 && (
              <div className="text-center py-16 text-pink-200">
                <p className="text-4xl mb-3">✿</p>
                <p className="text-sm font-bold">タスクがありません</p>
              </div>
            )}
            {list.map((task) => {
              const urgency = getCardUrgency(task.dueDate, task.done);
              const due = task.dueDate
                ? tab === "done" ? formatDateReiwa(task.dueDate) : formatDate(task.dueDate)
                : null;
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 shadow-sm transition-colors ${URGENCY_STYLE[urgency]}`}
                >
                  <div className="w-36 shrink-0">
                    {due ? (
                      <span className={`text-sm font-bold whitespace-nowrap ${due.colorClass}`}>
                        {due.text}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-200">—</span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 flex items-center gap-1.5">
                    {task.important && !task.done && (
                      <span className="shrink-0 text-xs font-extrabold text-white bg-gradient-to-r from-pink-400 to-red-400 px-1.5 py-0.5 rounded-lg">
                        重要
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-700">{task.title}</span>
                  </span>
                  {tab === "done" && task.doneAt && (
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-400">完了日</p>
                      <p className={`text-xs font-bold whitespace-nowrap ${formatDate(task.doneAt).colorClass}`}>
                        {formatDate(task.doneAt).text}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="w-6 h-6 flex items-center justify-center text-pink-200 hover:text-red-400 transition-colors rounded-full hover:bg-red-50 text-lg leading-none shrink-0"
                  >
                    ×
                  </button>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleDone(task.id)}
                    className="w-5 h-5 accent-pink-400 cursor-pointer shrink-0"
                  />
                </div>
              );
            })}
          </div>

          {byCategory.length > 0 && (
            <p className="text-center text-xs font-bold text-pink-300 mt-8">
              {doneList.length} / {byCategory.length} 完了 ✿
            </p>
          )}
        </>
      )}

      {/* 下部ナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t-2 border-pink-100 flex">
        {(["work", "private"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-extrabold transition-colors ${
              category === c ? "text-pink-500" : "text-gray-300 hover:text-pink-300"
            }`}
          >
            <span className="text-xl">{c === "work" ? "💼" : "🏠"}</span>
            <span>{c === "work" ? "仕事用" : "プライベート"}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
