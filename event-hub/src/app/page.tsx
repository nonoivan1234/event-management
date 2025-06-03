"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "@/components/loading";
import EventCard from "@/components/EventCard";

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // ✅ 加入 loading 狀態

  const fetchSearch = async (user) => {
    setLoading(true);
    const eventQuery = search.trim() === ""
      ? supabase
          .from("events")
          .select(`*, users:organizer_id(name)`)
          .eq("visible", true)
          .gte("deadline", new Date().toLocaleDateString("en-CA", { timeZone: 'Asia/Taipei' }))
          .or(`start.is.null, start.gte.${new Date().toLocaleDateString("en-CA", { timeZone: 'Asia/Taipei' })}`)
          .limit(100)
      : supabase
          .from("events")
          .select(`*, users:organizer_id(name)`)
          .eq("visible", true)
          .ilike("title", `%${search.trim()}%`)
          .limit(100);

    const { data: eventsData, error } = await eventQuery;
    if(user) {
      const { data: regData } = await supabase
        .from("registrations")
        .select("event_id")
        .eq("user_id", user?.id); // ✅ 這裡就不會出錯了
      setRegistrations(regData || []);
    }

    if (!error && eventsData) {
      const parsedEvents = eventsData.map((e) => ({
        ...e,
        category:
          typeof e.category === "string" ? JSON.parse(e.category) : [],
      }));
      setEvents(parsedEvents);

      const uniqueCategories = Array.from(
        new Set(parsedEvents.flatMap((e) => e.category || []))
      );
      setCategories(uniqueCategories);
    }

    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUser(userData.user); // 可保留設定 state
        await fetchSearch(userData.user); // ✅ 傳入 user 對象
      } else {
        await fetchSearch(null); // 如果沒有登入，傳入 null
      }
    };
    init();
  }, []);


  const now = new Date();
  const isRegistered = (event_id: string) =>
    registrations.some((r) => r.event_id === event_id);

  const filteredEvents = events
    .filter((event) => {
      const isExpired = new Date(event.deadline) < now;
      const isReg = isRegistered(event.event_id);

      if (statusFilter === "Registered" && !isReg) return false;
      if (statusFilter === "Unregistered" && isReg) return false;
      if (statusFilter === "Expired" && !isExpired) return false;
      if (statusFilter === "Upcoming" && isExpired) return false;

      return category === "All" || (Array.isArray(event.category) && event.category.includes(category));
    })
    .sort((a, b) => {
      if(a.start !== null && b.start == null) return 1;
      if(a.start == null && b.start !== null) return -1;
      if(a.start == null && b.start == null) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

  if(loading) return <LoadingScreen />; // ✅ 顯示 loading 畫面
  
  return (
    <main className="w-full max-w-7xl mx-auto py-8 px-4 dark:text-white">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow w-full">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🔍 活動篩選
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <div className="flex items-center gap-2">
              <div className="relative w-full flex-[5]">
                <input
                  type="text"
                  placeholder="搜尋活動名稱…"
                  className="w-full border rounded px-4 py-1 pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {if (e.key === "Enter" && !e.nativeEvent.isComposing) fetchSearch(user);}}
                />
                <span className="absolute left-3 top-1.5 text-gray-400">🔍</span>
              </div>
              <button
                className="h-full flex-[1] rounded border border-gray-300 bg-white text-black hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                onClick={() => fetchSearch(user)}
              >
                搜尋
              </button>
            </div>

            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="All">📁 所有類別</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  📁 {cat}
                </option>
              ))}
            </select>

            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">📅 所有活動</option>
              <option value="Registered">✅ 已報名</option>
              <option value="Unregistered">📝 未報名</option>
              <option value="Expired">❌ 已截止報名</option>
              <option value="Upcoming">⏳ 即將開始</option>
            </select>
          </div>
        </div>
      </header>

      {/* ✅ 顯示 loading 或無資料提示 */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 text-gray-600 dark:text-gray-300">
          ❗ 目前沒有符合條件的活動
        </div>
      ) : (
        <section className="space-y-12">
          {filteredEvents.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4">
                {filteredEvents.map((event) => {
                  const today = new Date();
                  const deadline = new Date(event.deadline);
                  deadline.setHours(0, 0, 0, 0);
                  deadline.setDate(deadline.getDate() + 1);
                  const isExpired = deadline < today;
                  const registered = isRegistered(event.event_id);
                  const disabled = registered || isExpired;
                  const title = isExpired
                    ? "報名已截止"
                    : registered
                    ? "你已報名此活動"
                    : '';

                  return (
                    <EventCard event={event} key={event.event_id}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!disabled) {
                            router.push(
                              `/event/register?event_id=${event.event_id}`
                            );
                          }
                        }}
                        disabled={disabled}
                        title={title}
                        className={`w-full mt-4 px-4 py-2 rounded ${
                          disabled
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                            : "bg-black text-white hover:bg-gray-600 dark:bg-white dark:text-black dark:hover:bg-gray-300"
                        }`}
                      >
                        {isExpired
                          ? "報名已截止"
                          : registered 
                          ? "已報名" 
                          : "立刻報名"}
                      </button>
                    </EventCard>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}