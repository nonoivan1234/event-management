"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/loading";
import UserSearchModal from "@/components/UserSearchModal";
import EventCard from "@/components/EventCard";

type Event = {
  event_id: string;
  organizer_id: string;
  title: string;
  description: string;
  visible: boolean;
  deadline?: string;
  start?: string;
  end?: string;
  venue_name?: string;
  venue_address?: string;
  share_link?: string;
  category?: string[]; // 已經將 category 定義為陣列
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userID, setUserID] = useState<string | null>(null);
  const [organizedEvents, setOrganizedEvents] = useState<Event[]>([]);
  const [NormalEvents, setNormalEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOption, setFilterOption] = useState("all");
  const [filterOrgOption, setFilterOrgOption] = useState("all");
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<string[]>([]);
  const [normals, setNormals] = useState<string[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [SearchModal, setSearchModal] = useState(false);
  const [UserModalOrg, setUserModalOrg] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          router.push("/auth/login");
          return;
        }
        setUserID(user.id);

        // 取主辦
        const { data: organizedData } = await supabase
          .from("event_organizers")
          .select("events(event_id, organizer_id, title, start, end, description, category, visible, deadline)")
          .eq("role_id", user.id)
          .eq("role", "organizer");

        const organized = organizedData?.map((item) => ({
          ...item.events,
          category: JSON.parse(item.events.category),
        })) || [];

        setOrganizedEvents(organized);

        // 取協辦
        const { data: normalData } = await supabase
          .from("event_organizers")
          .select("events(event_id, organizer_id, title, start, end, description, category, visible, deadline)")
          .eq("role_id", user.id)
          .eq("role", "normal");

        const normal = normalData?.map((item) => ({
          ...item.events,
          category: JSON.parse(item.events.category),
        })) || [];

        setNormalEvents(normal);

        // 取所有使用者 map
        const { data: users } = await supabase
          .from("users")
          .select("user_id, name, email");
        const nmap: Record<string, string> = {};
        const emap: Record<string, string> = {};
        users?.forEach((u) => {
          nmap[u.user_id] = u.name ?? "（未填姓名）";
          emap[u.user_id] = u.email;
        });
        setUserMap(emap);
        setUserNameMap(nmap);
      } catch (err) {
        console.error("fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndEvents();
  }, [router, showEditorModal]);

  const handleCreateEvent = () => router.push("/event/modify");

  const handleToggleVisibility = async (
    eventId: string,
    currentVisible: boolean
  ) => {
    const { error } = await supabase
      .from("events")
      .update({ visible: !currentVisible })
      .eq("event_id", eventId);
    if (error) {
      alert("更新可見狀態失敗");
      return;
    }
    setOrganizedEvents((prev) =>
      prev.map((event) =>
        event.event_id === eventId
          ? { ...event, visible: !currentVisible }
          : event
      )
    );
  };

  const openEditorModal = async (eventId: string) => {
    setOrganizers([]);
    setNormals([]);
    setEditingEventId(eventId);
    setShowEditorModal(true);

    const { data, error } = await supabase
      .from("event_organizers")
      .select("role_id, role")
      .eq("event_id", eventId);
    if (error) {
      alert("讀取人員失敗");
      return;
    }
    const org: string[] = [];
    const nor: string[] = [];
    for (const item of data || []) {
      if (item.role === "organizer") org.push(item.role_id);
      else if (item.role === "normal") nor.push(item.role_id);
    }
    setOrganizers(org);
    setNormals(nor);
  };

  const duplicate_event = async (eventID: string) => {
    if (!confirm("確定要複製此活動嗎？")) return;
    const { data: event_data, error: fetch_error } = await supabase
      .from("events")
      .select("title, description, deadline, form_schema, category, venue_name, venue_address, share_link, images")
      .eq("event_id", eventID)
      .single();
    if (fetch_error) return alert("找不到活動");

    event_data.title += "_複製";
    const user_id = (await supabase.auth.getUser()).data.user?.id;

    const { error: error_create_event, data: data_create_event } =
      await supabase
        .from("events")
        .insert({ ...event_data, organizer_id: user_id })
        .select()
        .single();
    if (error_create_event) return alert(`❌ 複製失敗：${error_create_event}`);
    const { error: error_role } = await supabase
      .from("event_organizers")
      .insert({
        event_id: data_create_event.event_id,
        role_id: user_id,
        role: "organizer",
      });

    alert(error_role ? `❌ 複製失敗：${error_role.message}` : "✅ 活動已複製");
    if (!error_role)
      router.push(`/event/modify?event_id=${data_create_event.event_id}`);
  };

  const delete_event = async (eventID: string) => {
    if (!confirm("確定要刪除此活動嗎？")) return;
    const { data, error } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("event_id", eventID);
    if (error || !data) return alert("找不到活動");
    if (
      data[0].organizer_id !==
      (await supabase.auth.getUser()).data.user?.id
    )
      return alert("只有這個活動的原主辦人，無法刪除！");
    const { error: err_delete } = await supabase
      .from("events")
      .delete()
      .eq("event_id", eventID);
    if (err_delete) return alert("刪除失敗");
    alert("刪除成功");
    setOrganizedEvents((prev) =>
      prev.filter((e) => e.event_id !== eventID)
    );
    setNormalEvents((prev) =>
      prev.filter((e) => e.event_id !== eventID)
    );
  };

  const renderEventActions = (
    eventId: string,
    visible: boolean,
    hold: boolean,
    org: boolean
  ) => (
    <div className="mt-4 flex gap-3 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {hold && (
        <>
          <button
            onClick={() => router.push(`/event/modify?event_id=${eventId}`)}
            className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            編輯活動
          </button>
          <button
            onClick={() => openEditorModal(eventId)}
            className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            編輯人員
          </button>
          {org && (
            <button
              onClick={() => delete_event(eventId)}
              className="text-sm text-red-600 dark:text-red-300 hover:underline"
            >
              刪除活動
            </button>
          )}
          <button
            onClick={() => handleToggleVisibility(eventId, visible)}
            className={`text-sm ${
              visible
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            } hover:underline`}
          >
            {visible ? "🔒 隱藏活動" : "🔓 顯示活動"}
          </button>
        </>
      )}
      <button
        onClick={() =>
          router.push(`/event/view-register?event_id=${eventId}`)
        }
        className="text-sm text-teal-600 dark:text-teal-300 hover:underline"
      >
        查看報名者
      </button>
      <button
        onClick={() => duplicate_event(eventId)}
        className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
      >
        複製活動
      </button>
    </div>
  );

  const filteredEvents = (events: Event[]) => {
    const now = new Date();
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const start = event.start ? new Date(event.start) : null;
      const isEnded = start ? start < now : false;
      switch (filterOption) {
        case "ended":
          return matchesSearch && isEnded;
        case "not_ended":
          return matchesSearch && !isEnded;
        default:
          return matchesSearch;
      }
    });
  };

  const addUser = async (User) => {
    if (organizers.includes(User.user_id) || normals.includes(User.user_id))
      throw new Error("此人已為活動人員");
    const { error: insertError } = await supabase
      .from("event_organizers")
      .insert({ event_id: editingEventId, role_id: User.user_id, role: UserModalOrg ? "organizer" : "normal" });
    if (!insertError){
      if (UserModalOrg) setOrganizers((prev) => [...prev, User.user_id]);
      else setNormals((prev) => [...prev, User.user_id]);
    }
    else throw new Error("此人員已為活動人員");
  }


  const renderEditorChipInput = (
    state: string[],
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    role: "organizer" | "normal"
  ) => (
    <div className="flex-1">
      <div className="flex flex-wrap gap-2 mb-2">
        <input
          type="email"
          placeholder="或輸入使用者Email"
          className="w-full bg-gray-100 text-black dark:bg-gray-700 dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500"
          onKeyDown={async (e) => {
            if (e.key !== "Enter") return;
            const input = e.currentTarget as HTMLInputElement;
            const email = input.value.trim();
            const { data, error } = await supabase
              .from("users")
              .select("user_id")
              .eq("email", email)
              .single();
            if (error || !data) {
              alert("找不到此 Email");
              input.value = "";
              return;
            }
            const userId = data.user_id;
            if (organizers.includes(userId) || normals.includes(userId)) {
              alert("此人員已經存在");
              return;
            }
            const { error: insertError } = await supabase
              .from("event_organizers")
              .insert({ event_id: editingEventId, role_id: userId, role });
            if (!insertError) setState((prev) => [...prev, userId]);
            else alert(insertError.message);
            input.value = "";
          }}
        />
        {state.map((id, index) => (
          <div
            key={id}
            className="flex items-center bg-blue-600 text-white px-2 py-1 rounded dark:bg-blue-500"
          >
            <span className="mr-1 text-sm">{userMap[id] ?? id}</span>
            <button
              className="text-red-300 hover:text-red-500 dark:text-red-200 dark:hover:text-red-400" 
              onClick={async () => {
                const { data } = await supabase
                  .from("events")
                  .select("organizer_id")
                  .eq("event_id", editingEventId);
                if (!data) return alert("找不到活動");
                if (data[0].organizer_id === id)
                  return alert("無法移除原主辦人");
                const { error } = await supabase
                  .from("event_organizers")
                  .delete()
                  .eq("event_id", editingEventId)
                  .eq("role_id", id)
                  .eq("role", role);
                if (!error)
                  setState((prev) =>
                    prev.filter((_, i) => i !== index)
                  );
                else alert("移除失敗");
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <LoadingScreen />;

  return (
    <main className="w-full max-w-7xl mx-auto py-12 px-4 dark:text-white">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full md:w-64"
          />
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="all">所有活動</option>
            <option value="ended">僅顯示已結束</option>
            <option value="not_ended">僅顯示未結束</option>
          </select>
          <select
            value={filterOrgOption}
            onChange={(e) => setFilterOrgOption(e.target.value)}
            className="border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="all">所有舉辦的活動</option>
            <option value="host">僅顯示主辦活動</option>
            <option value="normal">僅顯示協辦活動</option>
          </select>
        </div>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap"
          onClick={handleCreateEvent}
        >
          ➕ 建立新活動
        </button>
      </header>

      {organizedEvents.length === 0 && NormalEvents.length === 0 ? (
        <div className="text-center mt-10 text-gray-500 dark:text-gray-400">
          <p className="text-xl font-semibold mb-2">尚無活動</p>
          <p className="mb-4">
            您目前尚未主辦或協辦任何活動，趕快來建立一個吧！
          </p>
          <button
            onClick={handleCreateEvent}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            ➕ 建立活動
          </button>
        </div>
      ) : (
        <>
          {filterOrgOption != "normal" && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">主辦的活動</h2>
              {organizedEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  您目前尚未主辦任何活動
                </p>
              ) : ( filteredEvents(organizedEvents) .length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  沒有符合搜尋條件的主辦活動
                </p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEvents(organizedEvents).map((event) => {
                  return (
                  <EventCard event={{...event, users:{name: userNameMap[event.organizer_id]}}} key={event.event_id}>
                    <div className="mt-2">
                      {renderEventActions(event.event_id, event.visible, true, event.organizer_id === userID)}
                    </div>
                  </EventCard>
                )})}
              </div>
              ))}
            </section>
          )}

          {filterOrgOption != "host"  && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">協辦的活動</h2>
              {NormalEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  您目前尚未協辦任何活動
                </p>
              ) : ( filteredEvents(organizedEvents).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  沒有符合搜尋條件的協辦活動
                </p>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEvents(NormalEvents).map((event) => {
                  return (
                  <EventCard event={{...event, users:{name: userNameMap[event.organizer_id] || "匿名主辦人"}}} key={event.event_id}>
                    {/* 下半區塊（標籤與按鈕） */}
                    <div className="mt-2">
                      {renderEventActions(event.event_id, event.visible, false, false)}
                    </div>
                  </EventCard>
                )})}
              </div>
              ))}
            </section>
          )}
        </>
      )}

      {showEditorModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-center justify-center"
          onClick={() => setShowEditorModal(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowEditorModal(false)}
          tabIndex={0}
        >
          <div
            className="bg-white dark:bg-gray-800 w-[80vw] max-w-[1200px] h-[50vh] max-h-[70vh] p-6 rounded-lg shadow-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
              編輯舉辦人員
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-700 dark:text-white">
                    主辦人員
                  </h3>
                  <button
                    onClick={() => {setUserModalOrg(true); setSearchModal(true);}}
                    className="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    搜尋使用者
                  </button>
                </div>
                {renderEditorChipInput(
                  organizers,
                  setOrganizers,
                  "organizer"
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-700 dark:text-white mb-1">
                    協辦人員
                  </h3>
                  <button
                    onClick={() => {setUserModalOrg(false); setSearchModal(true);}}
                    className="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    搜尋使用者
                  </button>
                </div>
                {renderEditorChipInput(normals, setNormals, "normal")}
              </div>
            </div>
          </div>
        </div>
      )}
      <UserSearchModal
          isOpen={SearchModal}
          onClose={() => setSearchModal(false)}
          onAdd={addUser}
          isInvite={false}
          eventId={editingEventId}
          userId={userID}
      />
    </main>
  );
}
