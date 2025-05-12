"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: userData }, { data: eventsData, error }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("events")
            .select(`*, users:organizer_id(name)`)
            .eq("visible", true)
            .order("deadline", { ascending: true }),
        ]);
      if (userData?.user) {
        setUser(userData.user);

        const { data: regData } = await supabase
          .from("registrations")
          .select("event_id")
          .eq("user_id", userData.user.id);

        setRegistrations(regData || []);
      }

      if (!error && eventsData) {
        // 解析 category 為陣列
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
    };

    fetchData();
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

      const categoryMatch =
        category === "All" ||
        (Array.isArray(event.category) && event.category.includes(category));

      return (
        categoryMatch &&
        event.title?.toLowerCase()?.includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aExpired = new Date(a.deadline) < now;
      const bExpired = new Date(b.deadline) < now;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const upcomingEvents = filteredEvents.filter(
    (e) => new Date(e.deadline) >= now
  );
  const expiredEvents = filteredEvents.filter(
    (e) => new Date(e.deadline) < now
  );

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-4 dark:text-white">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow w-full">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🔍 活動篩選
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* 搜尋欄 */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="搜尋活動名稱…"
                className="w-full border rounded px-4 py-1 pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1.5 text-gray-400">🔍</span>
            </div>

            {/* 類別篩選 */}
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

            {/* 狀態篩選 */}
            <select
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">📅 所有活動</option>
              <option value="Registered">✅ 已報名</option>
              <option value="Unregistered">📝 未報名</option>
              <option value="Expired">⏳ 已結束</option>
              <option value="Upcoming">🚀 未開始</option>
            </select>
          </div>
        </div>
      </header>

      <section className="space-y-12">
        {upcomingEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">⏳ 即將舉辦的活動</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {upcomingEvents.map((event) => {
                const registered = isRegistered(event.event_id);
                const disabled =
                  !user || registered || new Date(event.deadline) < now;
                const expired = new Date(event.deadline) < now;
                const title = !user
                  ? "請先登入才能報名"
                  : registered
                  ? "你已報名此活動"
                  : expired
                  ? "活動已結束"
                  : "";

                return (
                  <div
                    key={event.event_id}
                    className="w-full border rounded-lg p-4 flex flex-col justify-between shadow-sm dark:bg-gray-900 dark:text-white dark:border-gray-700"
                  >
                    <div>
                      <h2 className="text-lg font-semibold truncate">
                        {event.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">
                        截止日期：{event.deadline}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                        {event.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        🧑‍💼 {event.users.name}
                      </p>
                      {Array.isArray(event.category) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.category.map((cat: string) => (
                            <span
                              key={cat}
                              className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-white px-2 py-0.5 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (!disabled) {
                          router.push(
                            `/event/register?event_id=${event.event_id}`
                          );
                        }
                      }}
                      disabled={disabled}
                      title={title}
                      className={`mt-4 px-4 py-2 rounded ${
                        disabled
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                          : "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                      }`}
                    >
                      {expired
                        ? "活動已結束"
                        : registered
                        ? "已報名"
                        : "Sign Up"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {expiredEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">📌 已結束的活動</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {expiredEvents.map((event) => {
                const registered = isRegistered(event.event_id);
                return (
                  <div
                    key={event.event_id}
                    className="w-full border rounded-lg p-4 flex flex-col justify-between shadow-sm dark:bg-gray-900 dark:text-white dark:border-gray-700"
                  >
                    <div>
                      <h2 className="text-lg font-semibold truncate">
                        {event.title}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">
                        截止日期：
                        {event.deadline}{" "}
                        <span className="text-red-500 ml-2">(已結束)</span>
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                        {event.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        🧑‍💼 {event.users?.name || "匿名主辦人"}
                      </p>
                      {Array.isArray(event.category) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.category.map((cat: string) => (
                            <span
                              key={cat}
                              className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-white px-2 py-0.5 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      disabled
                      title="活動已結束"
                      className="mt-4 px-4 py-2 rounded bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                    >
                      {registered ? "已報名 (活動已結束)" : "活動已結束"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
