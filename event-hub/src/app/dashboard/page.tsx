"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Event = {
  event_id: string;
  title: string;
  description: string;
  created_at: string;
};

const demoEvents = [
  {
    event_id: "1",
    title: "Chess Tournament",
    description: "A thrilling chess competition for all skill levels.",
    created_at: "2025-03-15",
  },
  {
    event_id: "2",
    title: "Coding Competition",
    description: "Show off your coding skills in this exciting contest.",
    created_at: "2025-04-05",
  },
  {
    event_id: "3",
    title: "Drama Festival",
    description: "Experience the magic of theater at our annual festival.",
    created_at: "2025-05-20",
  },
];

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [organizedEvents, setOrganizedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? "");

      // Fetch organized events
      const { data: organizedData, error: organizedError } = await supabase
        .from("events")
        .select("*")
        .eq("organizer_id", user.id);

      if (!organizedError && organizedData?.length > 0) {
        setOrganizedEvents(organizedData);
      } else {
        setOrganizedEvents(demoEvents); // Use demo events if no organized events are fetched
      }

      // Fetch joined events
      const { data: joinedData, error: joinedError } = await supabase
        .from("event_participants")
        .select("event_id, events(*)")
        .eq("user_id", user.id);

      if (!joinedError && joinedData?.length > 0) {
        const events = joinedData.map((item: any) => item.events);
        setJoinedEvents(events);
      } else {
        setJoinedEvents(demoEvents); // Use demo events if no joined events are fetched
      }
    };

    fetchUserAndEvents();
  }, [router]);

  const handleCreateEvent = () => {
    router.push("/dashboard/event/create");
  };

  const handleEditProfile = () => {
    router.push("/profile");
  };

  const renderEventActions = (eventId: string) => (
    <div className="mt-4 flex gap-2">
      <button
        onClick={() => router.push(`/dashboard/event/edit-form?id=${eventId}`)}
        className="text-blue-600 hover:underline"
      >
        編輯表單
      </button>
      <button
        onClick={() => router.push(`/dashboard/event/view-register?id=${eventId}`)}
        className="text-green-600 hover:underline"
      >
        查看報名者
      </button>
    </div>
  );

  const renderEvents = (events: Event[], isOrganized: boolean) => {
    if (events.length === 0) {
      return (
        <p className="text-gray-500">
          {isOrganized
            ? "你目前尚未建立任何活動。"
            : "你目前尚未參加任何活動。"}
        </p>
      );
    }

    return events.map((event) => (
      <div
        key={event.event_id}
        className="border rounded p-4 shadow-sm flex flex-col justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <p className="text-sm text-gray-600">{event.description}</p>
        </div>
        {isOrganized && renderEventActions(event.event_id)}
      </div>
    ));
  };

  return (
    <>
      <nav className="flex items-center justify-between py-4 px-6 bg-gray-100 shadow">
        <h1
          onClick={() => router.push("/")}
          className="text-lg font-bold cursor-pointer"
        >
          🎓 Event Hub
        </h1>
        <div className="flex items-center gap-4">
          <button
            className="text-blue-600 hover:underline"
            onClick={handleEditProfile}
          >
            編輯個人資料
          </button>
          {userEmail ? (
            <button
              onClick={() =>
                supabase.auth.signOut().then(() => router.push("/login"))
              }
              className="text-sm hover:underline"
            >
              登出
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-sm hover:underline"
            >
              登入
            </button>
          )}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6">
        {userEmail && (
          <p className="text-sm text-gray-600 mb-6">登入帳號：{userEmail}</p>
        )}

        <button
          className="mb-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={handleCreateEvent}
        >
          建立新活動
        </button>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">你舉辦的活動</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEvents(organizedEvents, true)}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">你參加的活動</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEvents(joinedEvents, false)}
          </div>
        </section>
      </main>
    </>
  );
}
