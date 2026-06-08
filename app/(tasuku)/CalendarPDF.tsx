"use client";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: "/fonts/NotoSansJP-Regular.otf", fontWeight: 400 },
    { src: "/fonts/NotoSansJP-Bold.otf", fontWeight: 700 },
  ],
});

const HOLIDAYS_PDF = new Set([
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

const DAY_JA_PDF = ["日", "月", "火", "水", "木", "金", "土"];

type Category = "rencho" | "machizukuri" | "kodomoka";

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

const CATEGORIES_PDF: Category[] = ["rencho", "machizukuri", "kodomoka"];

const CATEGORY_LABELS_PDF: Record<Category, string> = {
  rencho: "連町",
  machizukuri: "まちづくり",
  kodomoka: "子ども会",
};

const CATEGORY_BG: Record<Category, string> = {
  rencho: "#334155",
  machizukuri: "#065f46",
  kodomoka: "#9f1239",
};

const s = StyleSheet.create({
  page: {
    padding: "8mm",
    fontFamily: "NotoSansJP",
    fontSize: 8,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: "#57534e",
    paddingBottom: 3,
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1c1917",
  },
  approvalRow: {
    flexDirection: "row",
    borderWidth: 0.75,
    borderColor: "#57534e",
  },
  approvalCell: {
    width: 36,
    borderLeftWidth: 0.75,
    borderLeftColor: "#57534e",
  },
  approvalCellFirst: {
    width: 36,
    borderLeftWidth: 0,
  },
  approvalLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    textAlign: "center",
    borderBottomWidth: 0.75,
    borderBottomColor: "#57534e",
    paddingVertical: 1.5,
    color: "#44403c",
  },
  approvalSpace: {
    height: 20,
  },
  gridHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#57534e",
    minHeight: 16,
  },
  gridRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a8a29e",
  },
  gridRowSun: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#a8a29e",
    backgroundColor: "#fff1f2",
  },
  dateHeaderCell: {
    width: 24,
    padding: 2,
    backgroundColor: "#f5f5f4",
    borderRightWidth: 0.5,
    borderRightColor: "#a8a29e",
  },
  catHeaderCell: {
    flex: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#78716c",
  },
  catHeaderText: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 7.5,
  },
  dateCell: {
    width: 24,
    minHeight: 14,
    paddingVertical: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#d6d3d1",
  },
  dateDayText: {
    fontSize: 8,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  dateWeekText: {
    fontSize: 6.5,
    lineHeight: 1.1,
  },
  taskCell: {
    flex: 1,
    minHeight: 14,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#d6d3d1",
  },
  taskItem: {
    marginBottom: 1,
  },
  taskText: {
    fontSize: 7,
    fontWeight: 700,
    color: "#1c1917",
    lineHeight: 1.3,
  },
  timeText: {
    fontSize: 6,
    color: "#a8a29e",
    lineHeight: 1.2,
  },
});

interface Props {
  tasks: Task[];
  year: number;
  month: number;
}

export function CalendarPDFDocument({ tasks, year, month }: Props) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const doneTasks = tasks.filter((t) => t.done && t.doneAt?.startsWith(monthStr));

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={s.page}>
        {/* ヘッダー: タイトル + 決裁欄 */}
        <View style={s.header}>
          <Text style={s.title}>{month + 1}月分業務内容</Text>
          <View style={s.approvalRow}>
            {["会長", "局長", "担当"].map((label, i) => (
              <View key={label} style={i === 0 ? s.approvalCellFirst : s.approvalCell}>
                <Text style={s.approvalLabel}>{label}</Text>
                <View style={s.approvalSpace} />
              </View>
            ))}
          </View>
        </View>

        {/* 列ヘッダー */}
        <View style={s.gridHeaderRow}>
          <View style={s.dateHeaderCell} />
          {CATEGORIES_PDF.map((cat) => (
            <View key={`h-${cat}`} style={[s.catHeaderCell, { backgroundColor: CATEGORY_BG[cat] }]}>
              <Text style={s.catHeaderText}>{CATEGORY_LABELS_PDF[cat]}</Text>
            </View>
          ))}
        </View>

        {/* 日付行 */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
          const dow = new Date(year, month, day).getDay();
          const isHoliday = HOLIDAYS_PDF.has(dateStr);
          const isSun = dow === 0 || isHoliday;
          const isSat = dow === 6 && !isHoliday;
          const dateColor = isSun ? "#dc2626" : isSat ? "#2563eb" : "#44403c";

          return (
            <View key={day} style={isSun ? s.gridRowSun : s.gridRow}>
              <View style={s.dateCell}>
                <Text style={[s.dateDayText, { color: dateColor }]}>{day}</Text>
                <Text style={[s.dateWeekText, { color: dateColor }]}>{DAY_JA_PDF[dow]}</Text>
              </View>
              {CATEGORIES_PDF.map((cat) => {
                const dayTasks = doneTasks.filter(
                  (t) => t.doneAt === dateStr && t.categories.includes(cat)
                );
                return (
                  <View key={`${day}-${cat}`} style={s.taskCell}>
                    {dayTasks.map((t) => (
                      <View key={t.id} style={s.taskItem}>
                        <Text style={s.taskText}>{t.title}</Text>
                        {t.startTime && (
                          <Text style={s.timeText}>
                            {t.startTime}
                            {t.endTime ? "〜" + t.endTime : ""}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
