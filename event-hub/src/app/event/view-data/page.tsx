"use client"

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

// 簡易載入畫面元件
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 dark:border-blue-400"></div>
      <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">載入中...</p>
    </div>
  );
}

export default function RegistrationViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");

  const [formSchema, setFormSchema] = useState(null);
  const [userSnapshot, setUserSnapshot] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId)
        return router.replace("/404");
    

      // 取得活動設定
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("form_schema")
        .eq("event_id", eventId)
        .single();

      if (eventError || !eventData) 
        return router.replace("/404");

      setFormSchema(eventData.form_schema);

      // 取得目前登入使用者 ID
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) 
        return router.replace("/login");

      // 從 registrations 撈取報名資料快照、答案與建立時間
      const { data: regData, error: regError } = await supabase
        .from("registrations")
        .select("user_info_snapshot, answers, created_at")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .single();

      if (regError || !regData) {
        return router.replace("/404");
      } else {
        setUserSnapshot(regData.user_info_snapshot);
        setAnswers(regData.answers);
        setCreatedAt(regData.created_at);
      }
      setLoading(false);
    };

    fetchData();
  }, [eventId, router]);

  if (loading)
    return <LoadingScreen />;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-1">報名資料檢視</h1>
      {createdAt && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          提交時間：{new Date(createdAt).toLocaleString()}
        </p>
      )}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">個人資料</h2>
        {formSchema.personalFields?.map((field) => (
          <div key={field} className="mb-2">
            <label className="block text-sm font-medium">
              {field}
            </label>
            <input
              className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={userSnapshot?.[field] ?? ""}
              readOnly
            />
          </div>
        ))}
      </div>
      {formSchema.customQuestions?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">自訂欄位答案</h2>
          {formSchema.customQuestions.map((q) => (
            <div key={q.id} className="mb-4">
              <label className="block text-sm font-medium">
                {q.label}
              </label>
              {q.type === "textarea" ? (
                <textarea
                  className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers?.[q.id] ?? ""}
                  readOnly
                />
              ) : (
                <input
                  className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers?.[q.id] ?? ""}
                  readOnly
                />
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => router.back()}
        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
      >
        返回上一頁
      </button>
    </div>
  );
}
