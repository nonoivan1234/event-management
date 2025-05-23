"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import LoadingScreen from "@/components/loading";
import UserSearchModal from "@/components/UserSearchModal";
import { Sen } from "next/font/google";

interface EventDetail {
  event_id: string;
  title: string;
  description: string;
  start?: string;
  end?: string;
  deadline: string;
  venue_name?: string;
  venue_address?: string;
  capacity?: number;
  price?: number;
  category?: string[];
  images?: string[];
  share_link?: Record<string, string>;
  organizer?: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString)                                 // 轉成 Date 物件 (UTC)
  const offsetMs = d.getTimezoneOffset() * 60 * 1000            // 取得時區差(分鐘) -> 毫秒
  const local = new Date(d.getTime() - offsetMs)               // 把 UTC 換成本地時間
  return local.toISOString().slice(0, 16).replace('T', ' ')                      // YYYY-MM-DDTHH:MM
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const eventId = params.get("event_id");
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [attending, setAttending] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [IsOrganizer, setIsOrganizer] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const slideInterval = useRef<number>();
  const now = new Date();

  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return router.push("/404");

      const { data, error } = await supabase
        .from("events")
        .select(`*, users:organizer_id(name, email, avatar)`)
        .eq("event_id", eventId)
        .eq("visible", true)
        .single();

      if (error || !data) return router.push("/404");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (user && !userError) {
        setUser(user);
        const { data: joinedData } = await supabase
          .from("registrations")
          .select("user_id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .single();
        if (joinedData) setAttending(true);
      }

      const { data: organizerData } = await supabase
        .from("event_organizers")
        .select("role_id")
        .eq("event_id", eventId)
        .eq("role_id", user?.id)
        .eq("role", "organizer")
        .single();
      if (organizerData) setIsOrganizer(true);

      const category =
        typeof data.category === "string"
          ? JSON.parse(data.category)
          : data.category;

      const shareLink =
        data.share_link && typeof data.share_link === "string"
          ? JSON.parse(data.share_link)
          : data.share_link;

      setEvent({
        ...data,
        category,
        share_link: shareLink,
        organizer: data.users
      });
      setLoading(false);
    }
    fetchEvent();
  }, [eventId, router]);

  // 自動輪播
  useEffect(() => {
    if (event?.images && event.images.length > 0) {
      slideInterval.current = window.setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % event.images!.length);
      }, 5000);
      return () => {
        if (slideInterval.current) clearInterval(slideInterval.current);
      };
    }
  }, [event]);

  if (loading) return <LoadingScreen />;

  const isExpired = new Date(event.deadline) < now;

  const title = !user
    ? "請先登入才能報名"
    : isExpired
    ? "活動已結束"
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const prevSlide = () => {
    if (!event.images) return;
    setCurrentIndex((prev) => (prev - 1 + event.images!.length) % event.images!.length);
    clearInterval(slideInterval.current!);
    slideInterval.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % event.images!.length);
    }, 5000);
  };
  const nextSlide = () => {
    if (!event.images) return;
    setCurrentIndex((prev) => (prev + 1) % event.images!.length);
    clearInterval(slideInterval.current!);
    slideInterval.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % event.images!.length);
    }, 5000);
  };

  const SendInvitation = async (User) => {
    if(user.id === User.user_id) throw new Error("不能邀請自己");
    const { data:Reg, error:RegError } = await supabase
      .from("registrations")
      .select("user_id")
      .eq("event_id", event.event_id)
      .eq("user_id", User.user_id)
      .single();
    console.log(Reg, RegError);
    if(Reg) throw new Error("該使用者已報名");
    const { data:Inv, error:InvError } = await supabase
      .from("invitations")
      .select("pending")
      .eq("event_id", event.event_id)
      .eq("inviter_id", user.id)
      .eq("friend_id", User.user_id)
      .single();
    if(Inv && Inv.pending)
      throw new Error("已邀請過該使用者");
    if (Inv){
      const { data, error } = await supabase
        .from("invitations")
        .update({
          event_id: event.event_id,
          inviter_id: user.id,
          friend_id: User.user_id,
          pending: true,
        })
        .eq("event_id", event.event_id)
        .eq("inviter_id", user.id)
        .eq("friend_id", User.user_id)
        .single();
      if (error)
        throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          event_id: event.event_id,
          inviter_id: user.id,
          friend_id: User.user_id,
        })
        .single();
      if (error)
        throw new Error(error.message);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* 標題與時間 */}
      <header>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
          {IsOrganizer && (
              <button
                onClick={() => router.push(`/event/modify?event_id=${event.event_id}`)}
                className="ml-4 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                編輯活動
              </button>
            )}
          </div>
        {(event.start || event.end) && (
          <p className="text-md text-gray-600 dark:text-gray-400 mb-1">
            {toDatetimeLocal(event.start)} ~ {toDatetimeLocal(event.end)}
          </p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          截止報名：{event.deadline}
          {isExpired && <span className="text-red-500 ml-2">(已結束)</span>}
        </p>
        {event.category && (
          <div className="flex flex-wrap gap-2 mb-4">
            {event.category.map((c) => (
              <span
                key={c}
                className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-white px-2 py-0.5 rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* 活動介紹 */}
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">活動介紹</h2>
        <p className="text-gray-700 dark:text-gray-300">{event.description}</p>
      </section>

      {/* 詳細資訊 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">地點</h3>
          <p className="text-gray-800 dark:text-gray-200">
            {event.venue_name ? event.venue_name : "地點待公布"}
          </p>
          {event.venue_address && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {event.venue_address}
            </p>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">主辦單位</h3>
          <div className="flex items-center gap-2">
            {event.organizer?.avatar && (
              <img
                src={event.organizer.avatar}
                alt="主辦人頭像"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="text-gray-800 dark:text-gray-200">
                {event.organizer?.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {event.organizer?.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 圖片輪播 */}
      {event.images && event.images.length > 0 && (
        <div className="relative overflow-hidden h-[40vh] mb-6 px-4">
          {event.images.map((url, index) => (
            <img
              key={url}
              src={url}
              alt={`slide-${index}`}
              className={`absolute top-0 left-1/2 transform -translate-x-1/2 h-full object-cover transition-opacity duration-700 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}
              `}
            />
          ))}

          {/* 左一鍵切換 */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
          >
            ‹
          </button>

          {/* 右一鍵切換 */}
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
          >
            ›
          </button>
        </div>
      )}

      {/* 報名資訊 */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">報名狀態</h3>
        <div className="flex items-center gap-5 mb-4">
          {attending && (
            <button
              onClick={() =>
                router.push(`/event/view-data?event_id=${event.event_id}`)
              }
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              檢視報名資訊
            </button>
          )}

          <button
            onClick={() => {
              if (user && !isExpired)
                router.push(`/event/register?event_id=${event.event_id}`);
            }}
            disabled={!user || isExpired}
            title={title}
            className={`mt-4 px-4 py-2 rounded ${
              (!user || isExpired)
              ? "bg-gray-300 text-gray-500 rounded cursor-not-allowed"
              : attending
              ? "bg-green-600 text-white rounded hover:bg-green-700"
              : "bg-blue-600 text-white rounded hover:bg-blue-700"
              }`}
          >
            {isExpired
              ? "活動已報名結束"
              : attending
              ? "修改報名資訊"
              : "立刻報名"}
          </button>
        </div>
      </section>

      <hr className="my-6 border-gray-300 dark:border-gray-700" />

      {/* 分享活動 */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            分享活動
        </h3>

        {/* 複製連結按鈕 */}
        <div className="flex items-center gap-3 mb-4">
          {user && !isExpired && 
          <button
            onClick={() => setShowUserSearchModal(true)}
            className="
            px-4 py-2
            bg-blue-600 text-white border border-blue-700
            rounded
            hover:bg-blue-700
            dark:bg-blue-800 dark:text-white dark:border-blue-700 dark:hover:bg-blue-700
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
            "
          >
            傳送邀請給朋友
          </button>}
          <button
              onClick={handleCopyLink}
              className="
              px-4 py-2
              bg-gray-200 text-gray-800 border border-gray-300
              rounded
              hover:bg-gray-100
              dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
              "
          >
              🔗 複製連結
          </button>
          {copySuccess && (
              <span className="text-green-500 dark:text-green-400">已複製</span>
          )}
        </div>
        {event.share_link &&
        <h4 className="text-md font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">
            或者分享至社群平台
        </h4>}

        <div className="flex flex-wrap gap-2 mb-4">
            {event.share_link &&
            Object.entries(event.share_link).map(([platform, url]) => (
                <button
                key={platform}
                onClick={() =>
                    window.open(url, "_blank", "noopener,noreferrer")
                }
                className="
                    px-4 py-2 bg-blue-600 text-white border rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
                "
                >
                {platform}
                </button>
            ))}
        </div>
      </section>
      <UserSearchModal
        isOpen={showUserSearchModal}
        onClose={() => setShowUserSearchModal(false)}
        onAdd={SendInvitation}
        isInvite={true}
        eventId={event.event_id}
        userId={user.id}
      />
    </main>
  );
}
