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
  const text = `${m}/${day}（${DAY_JA[dow]}）`;
  const colorClass =
    dow === 0 || isHoliday ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-500";
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
  today:    "bg-red-50 border-red-300",
  tomorrow: "bg-amber-50 border-amber-200",
  normal:   "bg-white border-stone-200",
};

const CATEGORY_COLOR: Record<string, string> = {
  rencho:      "bg-slate-700",
  machizukuri: "bg-emerald-800",
  kodomoka:    "bg-yellow-500",
};

type Category = "rencho" | "machizukuri" | "kodomoka";
type Tab = "todo" | "done";
type ViewMode = "list" | "calendar";

const CATEGORIES: Category[] = ["rencho", "machizukuri", "kodomoka"];
const CATEGORY_LABELS: Record<Category, string> = {
  rencho: "連町",
  machizukuri: "まちづくり",
  kodomoka: "子ども会",
};

const CATEGORY_SHORT: Record<Category, string> = {
  rencho: "連",
  machizukuri: "ま",
  kodomoka: "子",
};

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbzLxRkkn0PrcE72CvHA5pP4uqCDqww-aYRLpvmj182agtjnbYPBe593tJ3kJCy-cduG/exec";

interface Task {
  id: string;
  title: string;
  done: boolean;
  important: boolean;
  createdAt: number;
  dueDate?: string;
  doneAt?: string;
  startTime?: string;
  endTime?: string;
  categories: Category[];
}

interface Template {
  id: string;
  title: string;
  category: Category;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === "," && !inQuotes) {
      result.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  result.push(field);
  return result;
}

// ─── カレンダーコンポーネント ───────────────────────────────────
function CalendarView({
  tasks,
  year,
  month,
  visibleCats,
}: {
  tasks: Task[];
  year: number;
  month: number;
  visibleCats: Category[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // 完了済みタスクを完了日(doneAt)で絞り込み
  const doneTasks = tasks.filter((t) => t.done && t.doneAt?.startsWith(monthStr));

  return (
    <div
      id="print-calendar"
      className="flex-1 min-h-0 overflow-y-auto bg-white rounded-xl border border-stone-200 flex flex-col shadow-sm print:rounded-none print:shadow-none print:border-0"
    >
      {/* 印刷時のみ表示するタイトル＋決裁欄 */}
      <div className="hidden print:flex items-center justify-between px-3 py-1 border-b-2 border-stone-500 shrink-0">
        <span className="text-sm font-bold text-stone-800">{month + 1}月分業務内容</span>
        {/* 決裁欄（右上） */}
        <div className="flex gap-0 border border-stone-500">
          {["会長", "局長", "担当"].map((label) => (
            <div key={label} className="flex flex-col items-center border-l border-stone-500 first:border-l-0 w-12">
              <div className="text-[9px] font-bold text-stone-600 border-b border-stone-500 w-full text-center py-px">{label}</div>
              <div className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* グリッド: 日付 | 表示中のカテゴリ列 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `2.2rem ${visibleCats.map(() => "1fr").join(" ")}`,
          gridTemplateRows: `1.6rem repeat(${daysInMonth}, auto)`,
        }}
      >
        {/* ── ヘッダー行 ── */}
        <div className="border-b border-stone-300 bg-stone-100 print:border print:border-stone-500" />
        {visibleCats.map((cat) => (
          <div
            key={`h-${cat}`}
            className={`border-b border-stone-300 border-l border-stone-200 flex items-center justify-center text-xs font-bold text-white print:border print:border-stone-500 print:text-stone-800 print:bg-stone-100 ${CATEGORY_COLOR[cat]}`}
          >
            {CATEGORY_LABELS[cat]}
          </div>
        ))}

        {/* ── 日付行 ── */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).flatMap((day) => {
          const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
          const dow = new Date(year, month, day).getDay();
          const isToday = dateStr === today;
          const isHoliday = HOLIDAYS.has(dateStr);
          const isSun = dow === 0 || isHoliday;
          const isSat = dow === 6 && !isHoliday;
          const dateColor = isSun ? "text-red-600" : isSat ? "text-blue-600" : "text-stone-600";
          const rowBg = isToday ? "bg-slate-50" : (isSun || isSat) ? "bg-red-50/30" : "";

          return [
            // 日付セル
            <div
              key={`d-${day}`}
              className={`flex items-center justify-center gap-0.5 border-b border-stone-100 min-h-[1.4rem] print:border print:border-stone-400 ${rowBg} ${dateColor}`}
            >
              <span className={`text-[11px] font-bold leading-none ${isToday ? "text-slate-800 underline underline-offset-2" : ""}`}>{day}</span>
              <span className={`text-[9px] leading-none ${isToday ? "text-slate-600" : ""}`}>{DAY_JA[dow]}</span>
            </div>,

            // カテゴリごとのタスクセル
            ...visibleCats.map((cat) => {
              const dayTasks = doneTasks.filter(
                (t) => t.doneAt === dateStr && t.categories.includes(cat)
              );
              return (
                <div
                  key={`${day}-${cat}`}
                  className={`border-b border-stone-100 border-l border-stone-100 px-1 py-0.5 flex flex-col justify-start gap-0.5 min-h-[1.4rem] print:border print:border-stone-400 ${rowBg}`}
                >
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="text-[10px] font-bold leading-snug break-all text-stone-700"
                    >
                      <span className={t.important ? "border border-rose-500 rounded px-0.5" : ""}>
                        {t.title}
                        {t.startTime && (
                          <span className="text-[9px] text-stone-400 ml-1 font-normal">
                            {t.startTime}{t.endTime ? "〜" + t.endTime : ""}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }),
          ];
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
  const [inputCategory, setInputCategory] = useState<Category>("rencho");
  const [tab, setTab] = useState<Tab>("todo");
  const [doneSortBy, setDoneSortBy] = useState<"dueDate" | "doneAt">("doneAt");
  const [pendingDoneId, setPendingDoneId] = useState<string | null>(null);
  const [pendingDoneAt, setPendingDoneAt] = useState("");
  const [pendingStart, setPendingStart] = useState("");
  const [pendingEnd, setPendingEnd] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [templateInput, setTemplateInput] = useState("");
  const [templateCategory, setTemplateCategory] = useState<Category>("rencho");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [sending, setSending] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calVisibleCats, setCalVisibleCats] = useState<Category[]>(CATEGORIES);

  const toggleCalCat = (cat: Category) =>
    setCalVisibleCats((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : CATEGORIES.filter((c) => prev.includes(c) || c === cat)
    );
  const inputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tasuku-tasks");
      if (!saved) return;
      const validCats = new Set<string>(["rencho", "machizukuri", "kodomoka"]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: any[] = JSON.parse(saved);
      const migrated: Task[] = parsed.map((t) => {
        let cats: Category[];
        if (Array.isArray(t.categories) && t.categories.length > 0) {
          cats = t.categories.filter((c: string) => validCats.has(c)) as Category[];
          if (cats.length === 0) cats = ["rencho"];
        } else if (t.category && validCats.has(t.category)) {
          cats = [t.category as Category];
        } else {
          cats = ["rencho"];
        }
        return {
          id: t.id,
          title: t.title,
          done: t.done ?? false,
          important: t.important ?? false,
          createdAt: t.createdAt,
          dueDate: t.dueDate,
          doneAt: t.doneAt,
          startTime: t.startTime,
          endTime: t.endTime,
          categories: cats,
        };
      });
      setTasks(migrated);
    } catch {
      localStorage.removeItem("tasuku-tasks");
    }
  }, []);

  useEffect(() => {
    setFontSize((localStorage.getItem("tasuku-fontsize") as "small" | "medium" | "large") ?? "medium");
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tasuku-templates");
      if (saved) setTemplates(JSON.parse(saved));
    } catch { localStorage.removeItem("tasuku-templates"); }
  }, []);

  useEffect(() => {
    const sizes = { small: "13px", medium: "16px", large: "19px" };
    document.documentElement.style.fontSize = sizes[fontSize];
  }, [fontSize]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // アプリ起動時にGASからデータを取得
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { pullFromGAS(); }, []);

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

  const pushToGAS = (action: "upsert" | "delete" | "full", payload: object) => {
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      mode: "no-cors",
    }).catch(() => {});
  };

  const pullFromGAS = async () => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(GAS_URL);
      if (!res.ok) throw new Error();
      const data: Array<{ id: string; title: string; status: string }> = await res.json();
      setTasks((prev) => {
        const localMap = new Map(prev.map((t) => [t.id, t]));
        const updated = prev.map((t) => {
          const g = data.find((d) => d.id === t.id);
          return g ? { ...t, done: g.status === "done" } : t;
        });
        const added = data
          .filter((g) => !localMap.has(g.id))
          .map((g) => ({
            id: g.id,
            title: g.title,
            done: g.status === "done",
            important: false as const,
            createdAt: Date.now(),
            categories: ["rencho"] as Category[],
          }));
        const merged = [...updated, ...added];
        localStorage.setItem("tasuku-tasks", JSON.stringify(merged));
        return merged;
      });
      setSyncStatus("ok");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const persist = (next: Task[]) => {
    setTasks(next);
    localStorage.setItem("tasuku-tasks", JSON.stringify(next));
  };

  const addTask = () => {
    const title = input.trim();
    if (!title) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      done: false,
      important,
      createdAt: Date.now(),
      dueDate: dueDate || undefined,
      categories: [inputCategory],
    };
    persist([...tasks, newTask]);
    pushToGAS("upsert", { id: newTask.id, title: newTask.title, status: "todo" });
    setInput("");
    setDueDate("");
    setImportant(false);
    setInputCategory("rencho");
    inputRef.current?.focus();
  };

  const handleDoneChange = (id: string, currentDone: boolean) => {
    if (currentDone) {
      const task = tasks.find((t) => t.id === id);
      persist(tasks.map((t) =>
        t.id === id
          ? { ...t, done: false, doneAt: undefined, startTime: undefined, endTime: undefined }
          : t
      ));
      if (task) pushToGAS("upsert", { id, title: task.title, status: "todo" });
    } else {
      setPendingDoneId(id);
      setPendingDoneAt(new Date().toISOString().slice(0, 10));
      setPendingStart("09:00");
      setPendingEnd("12:00");
    }
  };

  const confirmDone = () => {
    if (!pendingDoneId) return;
    const task = tasks.find((t) => t.id === pendingDoneId);
    persist(tasks.map((t) =>
      t.id === pendingDoneId
        ? {
            ...t,
            done: true,
            doneAt: pendingDoneAt || new Date().toISOString().slice(0, 10),
            startTime: pendingStart || undefined,
            endTime: pendingEnd || undefined,
          }
        : t
    ));
    if (task) pushToGAS("upsert", { id: pendingDoneId, title: task.title, status: "done" });
    setPendingDoneId(null);
  };

  const deleteTask = (id: string) => {
    persist(tasks.filter((t) => t.id !== id));
    pushToGAS("delete", { id });
  };

  const persistTemplates = (next: Template[]) => {
    setTemplates(next);
    localStorage.setItem("tasuku-templates", JSON.stringify(next));
  };

  const addTemplate = () => {
    const title = templateInput.trim();
    if (!title) return;
    persistTemplates([...templates, { id: crypto.randomUUID(), title, category: templateCategory }]);
    setTemplateInput("");
  };

  const deleteTemplate = (id: string) =>
    persistTemplates(templates.filter((t) => t.id !== id));

  const applyTemplate = (tmpl: Template) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: tmpl.title,
      done: false,
      important: false,
      createdAt: Date.now(),
      dueDate: dueDate || undefined,
      categories: [tmpl.category],
    };
    persist([...tasks, newTask]);
    pushToGAS("upsert", { id: newTask.id, title: newTask.title, status: "todo" });
    setShowTemplates(false);
  };

  const submitFeedback = () => {
    const msg = feedbackText.trim();
    if (!msg) return;
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "feedback", message: msg, sentAt: new Date().toISOString() }),
      mode: "no-cors",
    }).catch(() => {});
    setFeedbackText("");
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  const exportCSV = () => {
    const header = "id,title,done,important,createdAt,dueDate,doneAt,startTime,endTime,categories";
    const rows = tasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.done,
      t.important,
      t.createdAt,
      t.dueDate ?? "",
      t.doneAt ?? "",
      t.startTime ?? "",
      t.endTime ?? "",
      `"${t.categories.join("|")}"`,
    ].join(","));
    const csv = "﻿" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasuku-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^﻿/, "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error();
        const validCats = new Set<string>(["rencho", "machizukuri", "kodomoka"]);
        const imported: Task[] = lines.slice(1).map((line) => {
          const [id, title, done, important, createdAt, dueDate, doneAt, startTime, endTime, categories] = parseCSVLine(line);
          const cats = categories.split("|").filter((c) => validCats.has(c)) as Category[];
          return {
            id: id || crypto.randomUUID(),
            title,
            done: done === "true",
            important: important === "true",
            createdAt: Number(createdAt) || Date.now(),
            dueDate: dueDate || undefined,
            doneAt: doneAt || undefined,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            categories: cats.length > 0 ? cats : ["rencho"],
          };
        });
        if (!confirm(`${imported.length}件のタスクを読み込みます。現在のデータは上書きされます。続けますか？`)) return;
        persist(imported);
        pushToGAS("full", { tasks: imported.map((t) => ({ id: t.id, title: t.title, status: t.done ? "done" : "todo" })) });
        setShowSettings(false);
      } catch {
        alert("CSVの読み込みに失敗しました");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const requestNotification = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotifPermission(p);
  };

  const sendPdf = async () => {
    setSending(true);
    try {
      const [{ pdf }, { CalendarPDFDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./CalendarPDF"),
      ]);

      const fileName = `calendar-${calYear}-${String(calMonth + 1).padStart(2, "0")}.pdf`;
      const subject = `${calYear}年${MONTHS_JA[calMonth]} カレンダー`;

      const blob = await pdf(
        <CalendarPDFDocument tasks={tasks} year={calYear} month={calMonth} />
      ).toBlob();

      // Web Share API（HTTPS/localhost、ファイル共有対応端末）
      const shareFile = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [shareFile] })) {
        try {
          await navigator.share({ files: [shareFile], title: subject });
          return;
        } catch (shareErr) {
          if ((shareErr as Error).name === "AbortError") return;
        }
      }

      // フォールバック: ダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      console.error(e);
      alert("PDF生成に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const sortByDue = (arr: Task[]) =>
    [...arr].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return (b.important ? 1 : 0) - (a.important ? 1 : 0);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const dateCmp = a.dueDate.localeCompare(b.dueDate);
      if (dateCmp !== 0) return dateCmp;
      return (b.important ? 1 : 0) - (a.important ? 1 : 0);
    });

  const sortByDoneAt = (arr: Task[]) =>
    [...arr].sort((a, b) => {
      if (!a.doneAt && !b.doneAt) return 0;
      if (!a.doneAt) return 1;
      if (!b.doneAt) return -1;
      return a.doneAt.localeCompare(b.doneAt);
    });

  const colTasks = (cat: Category) => {
    const filtered = tasks.filter((t) => t.categories.includes(cat) && (tab === "todo" ? !t.done : t.done));
    if (tab === "done" && doneSortBy === "doneAt") return sortByDoneAt(filtered);
    return sortByDue(filtered);
  };

  const todoCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const previewDue = dueDate ? formatDate(dueDate) : null;
  const isCalendar = viewMode === "calendar";

  // 今週末（今週の金曜日）
  const todayBase = new Date();
  const todayDow = todayBase.getDay();
  const daysToFri = todayDow <= 5 ? 5 - todayDow : 6;
  const friDate = new Date(todayBase.getFullYear(), todayBase.getMonth(), todayBase.getDate() + daysToFri);
  // 月末（土日なら直前の金曜日）
  const lastDay = new Date(todayBase.getFullYear(), todayBase.getMonth() + 1, 0);
  if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1);
  else if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2);

  const quickDates = [
    { label: "今日",    date: new Date(todayBase.getFullYear(), todayBase.getMonth(), todayBase.getDate()) },
    { label: "明日",    date: new Date(todayBase.getFullYear(), todayBase.getMonth(), todayBase.getDate() + 1) },
    { label: "明後日",  date: new Date(todayBase.getFullYear(), todayBase.getMonth(), todayBase.getDate() + 2) },
    { label: "1週間後", date: new Date(todayBase.getFullYear(), todayBase.getMonth(), todayBase.getDate() + 7) },
    { label: "今週末",  date: friDate },
    { label: "月末",    date: lastDay },
  ].map(({ label, date }) => ({
    label,
    value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  }));

  return (
    <div className={`px-2 overflow-x-hidden ${isCalendar ? "h-[100dvh] flex flex-col pt-4 pb-16 overflow-hidden" : "max-w-2xl mx-auto py-6 pb-20"}`}>

      {/* ── テンプレートモーダル ── */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setShowTemplates(false)}>
          <div className="bg-white rounded-t-2xl p-4 w-full max-w-lg border-t border-stone-200 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-stone-700 mb-3 shrink-0">テンプレートから追加</h3>
            <div className="overflow-y-auto flex-1">
              {templates.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-6">設定からテンプレートを登録してください</p>
              )}
              {CATEGORIES.map((cat) => {
                const list = templates.filter((t) => t.category === cat);
                if (list.length === 0) return null;
                return (
                  <div key={cat} className="mb-3">
                    <div className={`text-[10px] font-bold text-white px-2 py-0.5 rounded inline-block mb-1 ${CATEGORY_COLOR[cat]}`}>{CATEGORY_LABELS[cat]}</div>
                    <div className="space-y-1">
                      {list.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => applyTemplate(tmpl)}
                          className="w-full text-left px-3 py-2.5 text-sm text-stone-700 bg-stone-50 hover:bg-blue-50 active:bg-blue-100 rounded-xl border border-stone-200 transition-colors"
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowTemplates(false)} className="mt-3 w-full py-2 text-sm font-bold text-stone-400 border border-stone-200 rounded-xl hover:bg-stone-50 shrink-0">閉じる</button>
          </div>
        </div>
      )}

      {/* ── チェンジログモーダル ── */}
      {showChangelog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowChangelog(false)}>
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-xs border border-stone-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-700 tracking-wide">更新履歴</h3>
              <span className="text-[10px] text-stone-400">最終更新日 2026-06-10</span>
            </div>
            <ul className="text-xs text-stone-600 space-y-2">
              <li><span className="font-bold text-stone-500">ver1.00</span>　新規作成</li>
              <li><span className="font-bold text-stone-500">ver1.01</span>　同期化＆カレンダー表示修正他</li>
              <li><span className="font-bold text-stone-500">ver1.02</span>　CSV入出力追加</li>
            </ul>
            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="text-xs font-bold text-stone-500 mb-2">要望を送る</p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="機能追加・改善点など..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg text-stone-700 placeholder-stone-300 focus:outline-none focus:border-slate-400 resize-none"
              />
              {feedbackSent ? (
                <p className="text-xs text-stone-400 font-bold text-center mt-2">直接言ってくださいw</p>
              ) : (
                <button
                  onClick={submitFeedback}
                  disabled={!feedbackText.trim()}
                  className="mt-2 w-full py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-40"
                >
                  送信
                </button>
              )}
            </div>
            <button
              onClick={() => setShowChangelog(false)}
              className="mt-3 w-full py-2 rounded-lg border border-stone-200 text-sm font-bold text-stone-400 hover:bg-stone-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ── 設定モーダル ── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm border border-stone-200">
            <h3 className="text-base font-bold text-stone-700 mb-4 tracking-wide">設定</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-500 mb-2 tracking-wider uppercase">文字サイズ</label>
              <div className="flex gap-2">
                {([["small", "小"], ["medium", "中"], ["large", "大"]] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setFontSize(val)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-colors ${
                      fontSize === val
                        ? "bg-slate-700 border-slate-700 text-white"
                        : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-stone-400 mb-5 leading-relaxed">
              「PDF送信」でPDFを生成します。<br />
              スマホ：共有メニューが開きます（メール・LINE等へ送信可能）。<br />
              PC：PDFが自動ダウンロードされます。
            </p>
            <div className="mb-5">
              <label className="block text-xs font-bold text-stone-500 mb-2 tracking-wider uppercase">バックアップ</label>
              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="flex-1 py-2 rounded-lg border border-stone-300 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  CSV出力
                </button>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  className="flex-1 py-2 rounded-lg border border-stone-300 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  CSV入力
                </button>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={importCSV}
                  className="hidden"
                />
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold text-stone-500 mb-2 tracking-wider uppercase">タスク定型文</label>
              <div className="flex gap-1 mb-2">
                <input
                  value={templateInput}
                  onChange={(e) => setTemplateInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTemplate()}
                  placeholder="タスク名"
                  className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-slate-400"
                />
                <button
                  onClick={addTemplate}
                  className="px-2 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                >追加</button>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {templates.length === 0 && (
                  <p className="text-xs text-stone-300 text-center py-2">テンプレートなし</p>
                )}
                {templates.map((tmpl) => (
                  <div key={tmpl.id} className="flex items-center gap-1 px-2 py-1 bg-stone-50 rounded-lg">
                    <span className={`text-[10px] font-bold text-white px-1 py-0.5 rounded shrink-0 ${CATEGORY_COLOR[tmpl.category]}`}>{CATEGORY_SHORT[tmpl.category]}</span>
                    <span className="flex-1 text-xs text-stone-600 truncate">{tmpl.title}</span>
                    <button onClick={() => deleteTemplate(tmpl.id)} className="shrink-0 text-stone-300 hover:text-red-500 font-bold text-sm leading-none">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-2 rounded-lg border border-stone-200 text-sm font-bold text-stone-400 hover:bg-stone-50">キャンセル</button>
              <button
                onClick={() => {
                  localStorage.setItem("tasuku-fontsize", fontSize);
                  setShowSettings(false);
                }}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 完了時刻入力モーダル ── */}
      {pendingDoneId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-xs border border-stone-200">
            <h3 className="text-base font-bold text-stone-700 mb-4 text-center tracking-wide">作業時間を入力</h3>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-stone-500 w-10 shrink-0">日付</span>
              <input
                type="date"
                value={pendingDoneAt}
                onChange={(e) => setPendingDoneAt(e.target.value)}
                className="flex-1 px-2 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 bg-white focus:outline-none focus:border-slate-500"
              />
            </div>
            {[
              { label: "開始", value: pendingStart, set: setPendingStart },
              { label: "終了", value: pendingEnd,   set: setPendingEnd   },
            ].map(({ label, value, set }) => {
              const hh = value.slice(0, 2);
              const mm = value.slice(3, 5) || "00";
              return (
                <div key={label} className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-stone-500 w-10 shrink-0">{label}</span>
                  <div className="flex items-center gap-1 flex-1">
                    <select
                      value={hh}
                      onChange={(e) => set(e.target.value + ":" + mm)}
                      className="flex-1 px-2 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 bg-white focus:outline-none focus:border-slate-500"
                    >
                      <option value="">--</option>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="font-bold text-stone-400 text-sm">時</span>
                    <select
                      value={mm}
                      onChange={(e) => set((hh || "00") + ":" + e.target.value)}
                      className="w-20 px-2 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 bg-white focus:outline-none focus:border-slate-500"
                    >
                      <option value="00">00 分</option>
                      <option value="30">30 分</option>
                    </select>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2">
              <button
                onClick={() => setPendingDoneId(null)}
                className="flex-1 py-2 rounded-lg border border-stone-200 text-sm font-bold text-stone-400 hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDone}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all"
              >
                完了にする
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ヘッダー */}
      <header className={`flex items-center justify-between print:hidden ${isCalendar ? "mb-2" : "mb-4"}`}>
        <h1 className="text-lg font-bold text-stone-800 tracking-widest flex items-baseline gap-1.5">
          連町事務局タスク管理
          <button
            onClick={() => setShowChangelog(true)}
            className="text-[10px] font-bold text-stone-400 hover:text-slate-600 transition-colors tracking-normal"
          >
            ver1.02
          </button>
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={pullFromGAS}
            disabled={syncStatus === "syncing"}
            title={
              syncStatus === "syncing" ? "同期中…" :
              syncStatus === "ok" ? "同期完了" :
              syncStatus === "error" ? "同期失敗" : "GASと同期"
            }
            className={`transition-colors select-none ${
              syncStatus === "error" ? "text-red-400" :
              syncStatus === "ok" ? "text-emerald-500" :
              syncStatus === "syncing" ? "text-blue-400 animate-spin" :
              "text-stone-400 hover:text-stone-700"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="設定"
            className="text-stone-400 hover:text-stone-700 transition-colors select-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button
            onClick={requestNotification}
            disabled={notifPermission === "denied"}
            title={
              notifPermission === "granted" ? "通知オン" :
              notifPermission === "denied" ? "ブラウザ設定で許可してください" :
              "通知を有効にする"
            }
            className={`transition-colors select-none ${
              notifPermission === "denied" ? "opacity-25 cursor-not-allowed text-stone-300" :
              notifPermission === "granted" ? "text-slate-700 hover:text-slate-900" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {notifPermission === "granted"
                ? <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>
                : <><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></>
              }
            </svg>
          </button>
        </div>
      </header>

      {/* ───── カレンダービュー ───── */}
      {isCalendar && (
        <>
          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-2 shrink-0 print:hidden">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-500 font-bold text-lg hover:bg-stone-50 active:scale-95 transition-all shadow-sm">‹</button>
            <span className="text-sm font-bold text-stone-700 tracking-wider">{calYear}年{MONTHS_JA[calMonth]}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-500 font-bold text-lg hover:bg-stone-50 active:scale-95 transition-all shadow-sm">›</button>
            <button onClick={() => window.print()} className="px-3 py-1.5 bg-stone-700 text-white text-xs font-bold rounded-lg hover:bg-stone-800 active:scale-95 transition-all shadow-sm">印刷</button>
            <button
              onClick={sendPdf}
              disabled={sending}
              className="px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              {sending ? "生成中…" : "PDF送信"}
            </button>
          </div>

          {/* カテゴリ表示切替 */}
          <div className="flex items-center gap-3 mb-2 shrink-0 print:hidden">
            {CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={calVisibleCats.includes(cat)}
                  onChange={() => toggleCalCat(cat)}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: cat === "rencho" ? "#334155" : cat === "machizukuri" ? "#065f46" : "#eab308" }}
                />
                <span className="text-xs font-bold text-stone-600">{CATEGORY_LABELS[cat]}</span>
              </label>
            ))}
          </div>

          <CalendarView tasks={tasks} year={calYear} month={calMonth} visibleCats={calVisibleCats} />
        </>
      )}

      {/* ───── リストビュー ───── */}
      {!isCalendar && (
        <>
          {/* 入力エリア */}
          <div className="flex flex-col gap-2 mb-4">

            {/* カテゴリ選択 */}
            <div className="flex items-center gap-4 flex-wrap">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="inputCategory"
                    value={cat}
                    checked={inputCategory === cat}
                    onChange={() => setInputCategory(cat)}
                    className="w-4 h-4 accent-slate-700 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-stone-600">{CATEGORY_LABELS[cat]}</span>
                </label>
              ))}
            </div>

            {/* 入力欄 ＋ 右列（重要・追加） */}
            <div className="flex gap-2 items-end">
              <div className="relative flex-1 min-w-0">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="新しいタスクを入力..."
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl bg-white text-stone-700 placeholder-stone-300 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400 transition"
                />
                {showSuggestions && templates.length > 0 && (() => {
                  const suggestions = templates.filter((t) =>
                    input === "" || t.title.toLowerCase().includes(input.toLowerCase())
                  );
                  return suggestions.length > 0 ? (
                    <div className="absolute top-full left-0 right-0 z-30 bg-white border border-stone-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                      {suggestions.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onMouseDown={() => {
                            setInput(tmpl.title);
                            setShowSuggestions(false);
                            inputRef.current?.focus();
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-b-0"
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <label className="flex items-center justify-center gap-1 cursor-pointer select-none border border-rose-200 rounded-lg px-2 py-1 bg-rose-50">
                  <input
                    type="checkbox"
                    checked={important}
                    onChange={(e) => setImportant(e.target.checked)}
                    className="w-3.5 h-3.5 accent-rose-700 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-700">重要</span>
                </label>
                <button
                  onClick={addTask}
                  className="px-4 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-sm text-sm"
                >
                  追加
                </button>
              </div>
            </div>

            {/* 期限日付picker */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-stone-300 rounded-xl bg-white">
              <span className="text-xs font-bold text-stone-400 shrink-0">期限</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 text-sm text-stone-600 bg-transparent focus:outline-none cursor-pointer"
              />
              {previewDue && (
                <span className={`text-xs font-bold shrink-0 ${previewDue.colorClass}`}>{previewDue.text}</span>
              )}
              {dueDate && (
                <button type="button" onClick={() => setDueDate("")} className="shrink-0 text-xs text-stone-400 hover:text-stone-600">✕</button>
              )}
            </div>

            {/* クイック日付（3列グリッドで月末は常に今週末の横） */}
            <div className="grid grid-cols-3 gap-1">
              {quickDates.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDueDate(value)}
                  className={`py-1 rounded-lg text-xs font-bold border transition-all ${
                    dueDate === value
                      ? "bg-slate-700 border-slate-700 text-white"
                      : "bg-white border-stone-300 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 仕切り線 */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 border-t border-stone-200" />
            <span className="text-[10px] font-bold text-stone-300 tracking-widest">TASK</span>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          {/* タブ */}
          <div className="flex gap-2 mb-4">
            {(["todo", "done"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-0.5 rounded-lg text-sm font-bold transition-all ${
                  tab === t
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
                }`}
              >
                {t === "todo" ? "タスク" : "完了"}
                <span className="ml-1.5 text-xs opacity-70">
                  {t === "todo" ? todoCount : doneCount}
                </span>
              </button>
            ))}
          </div>

          {/* 完了タブ: 並べ替え */}
          {tab === "done" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-stone-400 tracking-wider">並べ替え</span>
              {([
                { key: "doneAt",  label: "完了日" },
                { key: "dueDate", label: "予定日" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDoneSortBy(key)}
                  className={`px-3 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    doneSortBy === key
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ─── 3列タスクリスト ─── */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const list = colTasks(cat);
              return (
                <div key={cat} className="flex flex-col gap-1.5 min-w-0">
                  {/* 列ヘッダー */}
                  <div className={`text-center text-xs font-bold text-white rounded-lg py-2.5 px-1 shadow-sm ${CATEGORY_COLOR[cat]}`}>
                    {CATEGORY_LABELS[cat]}
                    <span className="ml-1 opacity-60 text-[10px]">{list.length}</span>
                  </div>

                  {/* タスクカード */}
                  {list.length === 0 && (
                    <div className="text-center py-6 text-stone-300">
                      <p className="text-lg">—</p>
                      <p className="text-[10px] mt-1">なし</p>
                    </div>
                  )}
                  {list.map((task) => {
                    const urgency = getCardUrgency(task.dueDate, task.done);
                    const due = task.dueDate
                      ? tab === "done" ? formatDateReiwa(task.dueDate) : formatDate(task.dueDate)
                      : null;
                    const cardClass = task.important
                      ? "bg-white border-4 border-rose-500"
                      : `border ${URGENCY_STYLE[urgency]}`;
                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl p-1.5 ${cardClass}`}
                      >
                        {due && (
                          <p className={`text-[9px] font-bold leading-tight mb-0.5 ${due.colorClass}`}>
                            {due.text}
                          </p>
                        )}
                        <div className="flex items-start gap-1">
                          <span className="flex-1 min-w-0 text-[11px] font-bold text-gray-700 leading-snug break-all">
                            <span className={task.done ? "text-stone-400" : ""}>{task.title}</span>
                          </span>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="shrink-0 w-4 h-4 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors text-base leading-none"
                          >
                            ×
                          </button>
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => handleDoneChange(task.id, task.done)}
                            className="shrink-0 w-4 h-4 accent-slate-600 cursor-pointer mt-0.5"
                          />
                        </div>
                        {tab === "done" && task.doneAt && (
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm bg-blue-500 text-white text-[8px] font-bold mr-0.5 leading-none">完</span>
                            {formatDate(task.doneAt).text}
                            {(task.startTime || task.endTime) && (
                              <span className="ml-1">
                                {task.startTime ?? "?"} 〜 {task.endTime ?? "?"}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {tasks.length > 0 && (
            <p className="text-center text-xs text-stone-400 mt-6 tracking-wider">
              {doneCount} / {tasks.length} 完了
            </p>
          )}
        </>
      )}

      {/* ── 下部タブバー ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 flex print:hidden">
        {([
          { mode: "list" as ViewMode,
            label: "リスト",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          },
          { mode: "calendar" as ViewMode,
            label: "カレンダー",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          },
        ]).map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              viewMode === mode
                ? "text-slate-800"
                : "text-stone-400 hover:text-stone-600"
            }`}
          >
            {icon}
            <span className={`text-[10px] font-bold tracking-wide ${viewMode === mode ? "text-slate-800" : "text-stone-400"}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
