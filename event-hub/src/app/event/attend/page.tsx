"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "@/components/loading";

type Event = {
  event_id: string;
  title: string;
  description: string;
  deadline: string;
  category?: string[];
  start?: string;
  end?: string;
  visible: boolean;
  users?: {
    name: string;
  };
};

const options = {
  year:   'numeric',
  month:  '2-digit',
  day:    '2-digit',
  hour:   '2-digit',
  minute: '2-digit',
  hour12: false,
};

function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString('zh-tw', options);
}


export default function DashboardPage() {
  const router = useRouter();
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // 篩選相關狀態
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    // 修改 <title>
    document.title = "Event Hub - Attended Events";
    // 修改 <meta name="description">
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute("content", "參加活動列表");
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "參加活動列表";
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/auth/login");
        return;
      }

      const { data: joinedData } = await supabase
        .from("registrations")
        .select(
          `
          event_id,
          events (
            event_id,
            title,
            description,
            deadline,
            start,
            end,
            category,
            visible,
            users:organizer_id (
              name
            )
          )
        `
        )
        .eq("user_id", user.id);
      const FilterJoinedData = joinedData?.filter((item: any) => item.events.visible)
      const events = FilterJoinedData?.map((item: any) => {
        // 解析 category 欄位為陣列
        const catField = item.events.category;
        const parsed = Array.isArray(catField)
          ? catField
          : catField
          ? JSON.parse(catField)
          : [];
        return { ...item.events, category: parsed };
      }) ?? [];

      // 提取所有類別
      const uniqueCats = Array.from(new Set(events.flatMap((e) => e.category || [])));
      setCategories(uniqueCats);

      setJoinedEvents(events);
      setLoading(false);
    };

    fetchUserAndEvents();
  }, [router]);

  const now = new Date();

  // 濾出符合條件的活動
  const filteredEvents = joinedEvents
    .filter((event) => {
      const isExpired = new Date(event.start) < now && event.start != null;

      if (statusFilter === "Expired" && !isExpired) return false;
      if (statusFilter === "Upcoming" && isExpired) return false;

      const categoryMatch =
        category === "All" ||
        (Array.isArray(event.category) && event.category.includes(category));

      return (
        categoryMatch &&
        event.title.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const now = new Date();
      if(a.start == null && b.start == null)
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      else if(a.start == null && b.start != null){
        const bStart = new Date(b.start);
        if(bStart < now) return -1;
        return 1;
      } else if(a.start != null && b.start == null){
        const aStart = new Date(a.start);
        if(aStart < now) return 1;
        return -1;
      } else {
        const aStart = new Date(a.start);
        const bStart = new Date(b.start);
        if (aStart < now && bStart >= now) return 1;
        if (aStart >= now && bStart < now) return -1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      }
    });

  const renderEvents = () => {
    if (filteredEvents.length === 0) {
      return (
        <p className="text-gray-500 dark:text-gray-400">
          查無符合條件的活動。
        </p>
      );
    }

    return filteredEvents.map((event) => {
      const past = new Date(event.start) < now && event.start != null;
      const expired = new Date(event.deadline) < now;
      return (
        <div
          key={event.event_id}
          onClick={() => router.push(`/event?event_id=${event.event_id}`)}
          className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between hover:shadow-md duration-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {event.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              活動時間：{event.start && toDatetimeLocal(event.start)}{(event.start || event.end) ? ' - ' : 'Coming Soon'}
              {event.end && toDatetimeLocal(event.end)}{past && <span className="text-red-500 ml-2">(已結束)</span>}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              報名截止：{event.deadline}
              {expired && <span className="text-red-500 ml-2">(報名已截止)</span>}
            </p>
            <p className="text-sm mt-2 mb-2 ml-1 text-gray-700 dark:text-gray-300">
              {event.description}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              🧑‍💼 {event.users?.name || "匿名主辦人"}
            </p>
            {event.category && (
              <div className="flex flex-wrap gap-1 mt-2">
                {event.category.map((cat) => (
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
          <div className="flex gap-5 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() =>
                router.push(`/event/view-data?event_id=${event.event_id}`)
              }
              title="查看報名資料"
              className="mt-4 self-end text-sm px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            >
              查看報名資料
            </button>

            <button
              onClick={() =>
                router.push(`/event/register?event_id=${event.event_id}`)
              }
              disabled={expired}
              title={expired ? "報名已截止，無法編輯報名資料" : ""}
              className={`mt-4 self-end text-sm px-4 py-2 rounded ${
                expired
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {expired ? "已截止報名" : "編輯報名資料"}
            </button>
          </div>
        </div>
      );
    });
  };

  if (loading) return <LoadingScreen />;

  return (
    <main className="w-full max-w-6xl mx-auto py-8 px-4 dark:text-white">
      {/* 篩選區塊 */}
      <header className="mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow w-full">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            🔍 活動篩選
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
              <option value="Expired">⏳ 已結束</option>
              <option value="Upcoming">🚀 即將舉辦</option>
            </select>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-4">你參加的活動</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEvents()}
        </div>
      </section>
    </main>
  );
}
