"use client";
import { useState, useEffect, useRef } from 'react';

// --- 型定義 ---
interface EventData {
  id: string; date: string; day: string; start: string; end: string;
  title: string; momStatus: string; assignment: string;
}

interface PianoLesson {
  id: number;
  date: string;
  mikoDuration: number;
  mikoDuet: boolean;
  ayanDuration: number;
  ayanDuet: boolean;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'athletics' | 'piano'>('athletics');
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const todayRefAthletics = useRef<HTMLDivElement>(null);
  const todayRefPiano = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayStr = `${now.getMonth() + 1}/${now.getDate()}`;

  const [lessons, setLessons] = useState<{ [key: string]: PianoLesson[] }>({});
  const [toast, setToast] = useState<{ message: string; type: 'saving' | 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gasUrl = "https://script.google.com/macros/s/AKfycby89mkv3AnxPHxq3hRnumTo927MJAfeHyGO64tUG44YDAusyFkF7oGdSxG4GIVtArJW/exec";
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  const getPrice = (dur: number, duet: boolean) => {
    if (dur === 0) return 0;
    let base = 0;
    if (dur === 30) base = 1000;
    else if (dur === 40) base = 1500;
    else if (dur === 50) base = 2000;
    else if (dur === 60) base = 2500;
    else if (dur === 90) base = 3500;
    else if (dur === 100) base = 4000;
    else if (dur === 110) base = 4500;
    else if (dur === 120) base = 5000;
    return duet ? base / 2 : base;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(gasUrl);
        const athleticsData = await res.json();
        setEvents(athleticsData);

        const resPiano = await fetch(`${gasUrl}?type=piano`);
        const pianoHistory: any[] = await resPiano.json();

        const historyMap: { [key: string]: any } = {};
        if (Array.isArray(pianoHistory)) {
          pianoHistory.forEach(h => { historyMap[h.date] = h; });
        }

        const days = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        const currentMonth = viewDate.getMonth() + 1;
        const monthKey = `${viewDate.getFullYear()}-${currentMonth}`;

        const initialMonthData = Array.from({ length: days }, (_, i) => {
          const dStr = `${currentMonth}/${i + 1}`;
          const hist = historyMap[dStr];
          return {
            id: i + 1,
            date: dStr,
            mikoDuration: hist ? Number(hist.mikoDuration) : 0,
            mikoDuet: hist ? (hist.mikoDuet === true || hist.mikoDuet === "TRUE") : false,
            ayanDuration: hist ? Number(hist.ayanDuration) : 0,
            ayanDuet: hist ? (hist.ayanDuet === true || hist.ayanDuet === "TRUE") : false
          };
        });

        setLessons(prev => ({ ...prev, [monthKey]: initialMonthData }));
        setLoading(false);
      } catch (error) {
        console.error("データ取得失敗:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [gasUrl, viewDate]);

  useEffect(() => {
    if (!loading) {
      const targetRef = activeTab === 'athletics' ? todayRefAthletics : todayRefPiano;
      if (targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [loading, activeTab]);

  const showToast = (message: string, type: 'saving' | 'success' | 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    if (type !== 'saving') {
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    }
  };

  const updateLesson = (id: number, field: keyof PianoLesson, value: any) => {
    const monthKey = `${viewDate.getFullYear()}-${viewDate.getMonth() + 1}`;
    const newList = (lessons[monthKey] || []).map(l => l.id === id ? { ...l, [field]: value } : l);
    const updatedItem = newList.find(l => l.id === id);
    setLessons(prev => ({ ...prev, [monthKey]: newList }));
    if (updatedItem) {
      showToast('保存中...', 'saving');
      fetch(gasUrl, {
        method: "POST", mode: "cors",
        body: JSON.stringify({ type: "piano", ...updatedItem }),
      })
        .then(() => showToast('保存しました ✓', 'success'))
        .catch(() => showToast('保存に失敗しました', 'error'));
    }
  };

  const calculateTotal = () => {
    const monthKey = `${viewDate.getFullYear()}-${viewDate.getMonth() + 1}`;
    return (lessons[monthKey] || []).reduce((sum, l) => sum + getPrice(l.mikoDuration, l.mikoDuet) + getPrice(l.ayanDuration, l.ayanDuet), 0);
  };

  const changeMonth = (diff: number) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + diff, 1));
  const handlePrint = () => window.print();

  if (loading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#FFF9FB] font-rounded z-[10000]">
      <style jsx global>{`
        body { background-color: #FFF9FB !important; }
        #__next-prerender-indicator, [data-nextjs-toast], #vercel-live-feedback {
          display: none !important;
        }
      `}</style>

      <div className="relative mb-6 flex flex-col items-center">
        <div className="text-[100px] leading-none animate-custom-bounce">🎹</div>
        <div className="text-pink-300 font-black text-xl tracking-[0.2em] mt-2 drop-shadow-sm">Takemoto Piano</div>
        <div className="absolute top-0 -right-8 text-3xl animate-pulse">✨</div>
        <div className="absolute top-4 -left-10 text-3xl animate-custom-bounce delay-150">🎶</div>
      </div>
      <div className="text-pink-400 font-black animate-pulse text-2xl">準備中... 🎹</div>

      <div className="fixed bottom-0 left-0 right-0 flex opacity-10 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex-1 h-32 border-r border-gray-400 bg-white"></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#FFF9FB] pb-24 font-rounded select-none">

      {activeTab === 'athletics' ? (
        <>
          <header className="bg-gradient-to-b from-[#A2D2FF] to-[#BDE0FE] pt-6 pb-4 sticky top-0 z-20 shadow-lg rounded-b-[40px] px-6 border-b-4 border-white/50 print:hidden">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold bg-white/30 text-white px-2 py-0.5 rounded-full w-fit mb-1">TAKEMOTO FAMILY</span>
                <h1 className="text-xl font-black text-white drop-shadow-md tracking-tighter">竹本家 陸上送迎管理</h1>
              </div>
              <div className="flex items-center bg-white/90 rounded-2xl px-2 py-1.5 border border-blue-100 shadow-inner">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 text-[#A2D2FF] font-black">◀</button>
                <span className="text-lg font-black text-blue-500 min-w-[50px] text-center">{viewDate.getMonth() + 1}月</span>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 text-[#A2D2FF] font-black">▶</button>
              </div>
            </div>
          </header>

          <div className="p-4 space-y-4 print:hidden">
            {events.filter(ev => Number(ev.date.split('/')[0]) === viewDate.getMonth() + 1).map((ev, idx) => {
              const isToday = ev.date === todayStr;
              const isUnassigned = !ev.assignment || ev.assignment === "未定" || ev.assignment === "担当";
              return (
                <div key={idx} ref={isToday ? todayRefAthletics : null} className={`rounded-[30px] border-4 p-4 bg-white transition-all ${isUnassigned ? 'border-red-500 animate-urgent-shake shadow-red-200' : 'border-blue-50 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-2 rounded-2xl border-2 text-center min-w-[55px] ${isUnassigned ? 'border-red-500 bg-red-50 text-red-500' : 'border-blue-50 bg-blue-50 text-blue-300'}`}>
                        <div className="text-[10px] font-black">{ev.day}</div>
                        <div className="text-base font-black">{ev.date}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-blue-50 text-blue-400 mb-1">⏰ {ev.start} 〜 {ev.end}</div>
                        <div className="text-sm font-black text-gray-700">{ev.title}</div>
                      </div>
                    </div>
                    <div className={`text-[10px] font-black px-3 py-1.5 rounded-full shadow-md ${ev.assignment === "ママ" ? "bg-[#FFAFCC] text-white" : ev.assignment === "パパ" ? "bg-[#BDE0FE] text-white" : "bg-white text-red-600 border-2 border-red-600"}`}>
                      {isUnassigned ? "⚠ 未定" : ev.assignment}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {ev.momStatus && <div className="text-[10px] p-2 rounded-xl font-bold bg-[#FFF0F5] border border-[#FFE0E9] text-[#FF8EAF]">ママのお仕事：{ev.momStatus}</div>}
                    <div className="grid grid-cols-3 gap-2">
                      <button className="py-3 rounded-2xl bg-[#BDE0FE] text-white text-[11px] font-black shadow-md active:scale-95 transition-transform">パパ</button>
                      <button className="py-3 rounded-2xl bg-[#FFAFCC] text-white text-[11px] font-black shadow-md active:scale-95 transition-transform">ママ</button>
                      <button className="py-3 rounded-2xl border-2 border-dashed border-gray-100 text-gray-300 text-[10px] font-black">じ・ば</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="piano-view print:bg-white print:p-0">
          <header className="bg-gradient-to-b from-[#FFC8DD] to-[#FFB7D5] pt-6 pb-4 sticky top-0 z-20 shadow-lg rounded-b-[40px] px-6 border-b-4 border-white/50 print:hidden">
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold bg-white/30 text-white px-2 py-0.5 rounded-full w-fit mb-1 tracking-widest">TAKEMOTO PIANO</span>
                <h1 className="text-xl font-black text-white drop-shadow-md tracking-tighter">ピアノ補講代管理</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="bg-white/90 p-2 rounded-xl text-pink-500 border border-pink-100 flex items-center gap-1 active:scale-95 shadow-sm"><span className="text-xl">🖨️</span><span className="text-[10px] font-black">印刷</span></button>
                <div className="flex items-center bg-white/90 rounded-2xl px-2 py-1.5 border border-pink-100 shadow-inner">
                  <button onClick={() => changeMonth(-1)} className="w-8 h-8 text-[#FFAFCC] font-black">◀</button>
                  <span className="text-lg font-black text-pink-500 min-w-[50px] text-center">{viewDate.getMonth() + 1}月</span>
                  <button onClick={() => changeMonth(1)} className="w-8 h-8 text-[#FFAFCC] font-black">▶</button>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="text-sm font-black text-[#FF8EAF] bg-white/90 px-8 py-1.5 rounded-full shadow-lg border border-pink-50 flex items-center gap-2">
                <span>Total:</span><span className="text-xl ml-1">{calculateTotal().toLocaleString()}円</span>
              </div>
            </div>
          </header>

          {/* 印刷用画面 */}
          <div className="print-only hidden print:block pt-4 px-2">
            <div className="text-center mb-6 relative py-6 border-y-4 border-[#FFC8DD] bg-[#FFF9FB] rounded-xl">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-5xl">🎹</div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl text-pink-300">🎶</div>
              <h1 className="text-3xl font-black text-gray-800 tracking-[0.1em] mb-1">Lesson Statement</h1>
              <p className="text-base font-black text-pink-400 tracking-widest">ピアノ補講レッスン実施明細書</p>

              <div className="flex justify-around mt-8 items-center px-4">
                <div className="text-left border-l-8 border-[#FFC8DD] pl-4">
                  <p className="text-xs text-gray-400 font-black">対象月</p>
                  <p className="text-3xl font-black text-gray-700">{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</p>
                </div>
                <div className="text-right bg-white border-2 border-[#FFC8DD] px-8 py-3 rounded-3xl shadow-sm">
                  <p className="text-xs text-pink-400 font-black">合計金額</p>
                  <p className="text-5xl font-black text-gray-800">¥{calculateTotal().toLocaleString()}<span className="text-xl"> -</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 px-1">
              {(lessons[`${viewDate.getFullYear()}-${viewDate.getMonth() + 1}`] || [])
                .filter(l => l.mikoDuration > 0 || l.ayanDuration > 0)
                .map((l) => {
                  const mPrice = getPrice(l.mikoDuration, l.mikoDuet);
                  const aPrice = getPrice(l.ayanDuration, l.ayanDuet);
                  const [m, d] = l.date.split('/').map(Number);
                  const printDayIndex = new Date(viewDate.getFullYear(), m - 1, d).getDay();
                  const dayLabel = dayLabels[printDayIndex];
                  const printDateColor = printDayIndex === 0 ? 'text-red-500' : printDayIndex === 6 ? 'text-blue-500' : 'text-gray-700';
                  return (
                    <div key={l.id} className="border-2 border-[#FFC8DD] rounded-2xl p-3 bg-white flex flex-col justify-between shadow-sm min-h-[110px]">
                      <div className="flex justify-between items-center border-b-2 border-pink-50 pb-2 mb-2">
                        <span className={`text-lg font-black ${printDateColor}`}>{l.date}({dayLabel})</span>
                        <span className="text-sm font-black text-pink-500 bg-pink-50 px-2 py-0.5 rounded-lg">¥{(mPrice + aPrice).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1.5">
                        {l.mikoDuration > 0 && (
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="text-pink-600 font-black">みこ</span>
                            <span className="text-gray-600 font-bold">{l.mikoDuration}分{l.mikoDuet ? '(連)' : ''} ¥{mPrice.toLocaleString()}</span>
                          </div>
                        )}
                        {l.ayanDuration > 0 && (
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="text-blue-600 font-black">あや</span>
                            <span className="text-gray-600 font-bold">{l.ayanDuration}分{l.ayanDuet ? '(連)' : ''} ¥{aPrice.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-12 text-center">
              <p className="text-xl font-black text-[#FFC8DD] tracking-[1em]">♪ ♩ ♫ ♬ 🎹 ♬ ♫ ♩ ♪</p>
              <p className="mt-4 text-[10px] font-black text-gray-300 italic tracking-widest">Always enjoy playing the piano! - TAKEMOTO FAMILY</p>
            </div>
          </div>

          {/* モバイル操作画面用 */}
          <div className="p-3 space-y-3 print:hidden">
            {(lessons[`${viewDate.getFullYear()}-${viewDate.getMonth() + 1}`] || []).map((l) => {
              const isToday = l.date === todayStr;
              const [m, d] = l.date.split('/').map(Number);
              const dayIndex = new Date(viewDate.getFullYear(), m - 1, d).getDay();
              const dayLabel = dayLabels[dayIndex];
              const dateColor = dayIndex === 0 ? 'text-red-500' : dayIndex === 6 ? 'text-blue-500' : 'text-gray-700';
              const dayColor = dayIndex === 0 ? 'text-red-400' : dayIndex === 6 ? 'text-blue-400' : 'text-gray-400';
              return (
                <div key={l.id} ref={isToday ? todayRefPiano : null} className={`px-4 py-4 bg-white rounded-[30px] border-2 shadow-sm transition-all ${isToday ? 'border-[#FFC8DD] shadow-pink-50' : 'border-gray-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-lg font-black ${dateColor}`}>{l.date} <span className={`text-sm ${dayColor}`}>({dayLabel})</span></span>
                    {(l.mikoDuration > 0 || l.ayanDuration > 0) && (
                      <span className="text-xs font-black text-pink-400 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
                        ¥{(getPrice(l.mikoDuration, l.mikoDuet) + getPrice(l.ayanDuration, l.ayanDuet)).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl border border-pink-100 bg-pink-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-black text-pink-600">みこ</span>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={l.mikoDuet} onChange={(e) => updateLesson(l.id, 'mikoDuet', e.target.checked)} className="w-4 h-4 accent-pink-500" /><span className="text-[10px] font-bold text-pink-400">連弾</span></label>
                      </div>
                      <select value={l.mikoDuration} onChange={(e) => updateLesson(l.id, 'mikoDuration', Number(e.target.value))} className="w-full bg-white rounded-xl text-sm font-black py-2 text-center border-none shadow-sm focus:ring-2 ring-pink-200">
                        <option value={0}>休み</option><option value={30}>30分</option><option value={40}>40分</option><option value={50}>50分</option><option value={60}>60分</option><option value={90}>90分</option><option value={100}>100分</option><option value={110}>110分</option><option value={120}>120分</option>
                      </select>
                    </div>
                    <div className="p-3 rounded-2xl border border-blue-100 bg-blue-50/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-black text-blue-600">あ～やん</span>
                        <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={l.ayanDuet} onChange={(e) => updateLesson(l.id, 'ayanDuet', e.target.checked)} className="w-4 h-4 accent-blue-500" /><span className="text-[10px] font-bold text-blue-400">連弾</span></label>
                      </div>
                      <select value={l.ayanDuration} onChange={(e) => updateLesson(l.id, 'ayanDuration', Number(e.target.value))} className="w-full bg-white rounded-xl text-sm font-black py-2 text-center border-none shadow-sm focus:ring-2 ring-blue-200">
                        <option value={0}>休み</option><option value={30}>30分</option><option value={40}>40分</option><option value={50}>50分</option><option value={60}>60分</option><option value={90}>90分</option><option value={100}>100分</option><option value={110}>110分</option><option value={120}>120分</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t-2 border-gray-100 flex justify-around items-center h-22 pb-2 z-50 print:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActiveTab('athletics')} className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'athletics' ? 'text-blue-400' : 'text-gray-300'}`}>
          <span className="text-2xl mb-1">🏃</span><span className="text-[10px] font-black tracking-tighter">陸上送迎</span>
        </button>
        <button onClick={() => setActiveTab('piano')} className={`flex-1 flex flex-col items-center justify-center transition-colors ${activeTab === 'piano' ? 'text-pink-400' : 'text-gray-300'}`}>
          <span className="text-2xl mb-1">🎹</span><span className="text-[10px] font-black tracking-tighter">ピアノ管理</span>
        </button>
      </nav>

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-black flex items-center gap-2
          ${toast.type === 'saving' ? 'bg-gray-400' : toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'}`}>
          {toast.type === 'saving' && <span className="animate-spin inline-block">⏳</span>}
          {toast.type === 'success' && <span>✓</span>}
          {toast.type === 'error' && <span>✗</span>}
          {toast.message}
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap');

        body {
          margin: 0;
          background-color: #FFF9FB;
          font-family: 'Zen Maru Gothic', sans-serif !important;
        }

        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          html {
            zoom: 0.72;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: 'Zen Maru Gothic', sans-serif !important;
            overflow: hidden;
          }
          .print-only { display: block !important; }
          .print\\:hidden { display: none !important; }
          .grid { display: grid !important; }
        }

        @keyframes urgent-shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-0.5deg); }
          50% { transform: translateX(2px) rotate(0.5deg); }
          100% { transform: translateX(0); }
        }

        @keyframes custom-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-custom-bounce {
          animation: custom-bounce 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
