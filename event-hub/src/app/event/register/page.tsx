"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
export const dynamic = 'force-dynamic'


export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");

  const [formSchema, setFormSchema] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [message, setMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        router.replace("/404");
        return;
      }

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("form_schema, deadline")
        .eq("event_id", eventId)
        .single();

      if (!eventData || eventError) {
        router.replace("/404");
        return;
      }

      const now = new Date();
      const eventDeadline = eventData.deadline
        ? new Date(eventData.deadline)
        : null;
      if (eventDeadline && eventDeadline < now) {
        setIsClosed(true);
        setDeadline(eventDeadline.toLocaleDateString());
        return;
      }

      setFormSchema(eventData.form_schema);
      setDeadline(eventDeadline?.toLocaleDateString() || null);

      const { data: authData } = await supabase.auth.getUser();
      const user_id = authData.user?.id;
      if (!user_id) return;

      const fields = [
        "user_id",
        ...(eventData.form_schema.personalFields || []),
      ];
      const { data: userData } = await supabase
        .from("users")
        .select(fields.join(","))
        .eq("user_id", user_id)
        .single();

      setUserInfo(userData || {});

      const { data: registrationData } = await supabase
        .from("registrations")
        .select("answers")
        .eq("event_id", eventId)
        .eq("user_id", user_id)
        .single();

      if (registrationData) {
        setAnswers(registrationData.answers || {});
        setIsEditMode(true);
      }
    };

    fetchData();
  }, [eventId, router]);

  const handleChange = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!userInfo || !formSchema) return;

    // 驗證必填欄位
    const Cust_missingFields =
      formSchema.customQuestions?.filter(
        (q: any) => q.required && !answers[q.id]?.trim()
      ) || [];
    const Person_missingFields =
      formSchema.personalFields?.filter(
        (field: string) => !userInfo[field]?.trim()
      ) || [];

    if (Cust_missingFields.length + Person_missingFields.length > 0) {
      let msg = "請填寫所有必填欄位：";
      if (Person_missingFields.length > 0)
        msg += Person_missingFields.join("、");
      if (Cust_missingFields.length > 0)
        msg += Cust_missingFields.map((q: any) => q.label).join("、");
      setMessage(`⚠️ ${msg}`);
      return;
    }

    const payload = {
      event_id: eventId,
      user_id: userInfo.user_id,
      user_info_snapshot: userInfo,
      answers,
    };

    let error;
    if (isEditMode) {
      ({ error } = await supabase
        .from("registrations")
        .update(payload)
        .eq("event_id", eventId)
        .eq("user_id", userInfo.user_id));
    } else {
      ({ error } = await supabase.from("registrations").insert(payload));
    }

    setMessage(
      error
        ? `❌ ${isEditMode ? "更新" : "報名"}失敗：${error.message}`
        : `✅ ${isEditMode ? "更新成功！" : "報名成功！"} 即將跳轉到報名頁面`
    );
    if (!error) setTimeout(() => router.push(`/event/attend`), 1000);
  };

  if (isClosed) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <h1 className="text-2xl font-bold mb-4">活動已截止</h1>
        <p className="mb-2">此活動的報名截止時間為：</p>
        <p className="font-semibold mb-4">{deadline}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800"
        >
          返回上一頁
        </button>
      </div>
    );
  }

  if (!formSchema || !userInfo)
    return <p className="p-4 text-gray-800 dark:text-white">Loading...</p>;

  return (
    <div className="w-full max-w-2xl lg:max-w-3xl mx-auto p-6 text-gray-900 dark:text-white">
      {" "}
      <h1 className="text-2xl font-bold mb-1">
        {isEditMode ? "修改報名表單" : "報名表單"}
      </h1>
      {deadline && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          報名截止時間：{deadline}
        </p>
      )}
      <div className="mb-6">
        <h2 className="font-semibold mb-2 text-gray-800 dark:text-white">
          個人資料（自動帶入，請至編輯個人資料修改）
        </h2>
        {formSchema.personalFields?.map((field: string) => (
          <div key={field} className="mb-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              {field}
              <input
                className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={userInfo[field] || ""}
                readOnly
              />
            </label>
          </div>
        ))}
      </div>
      {formSchema.customQuestions?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2 text-gray-800 dark:text-white">
            自訂欄位
          </h2>
          {formSchema.customQuestions.map((q: any) => (
            <div key={q.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {q.label} {q.required && "*"}
              </label>
              {q.type === "text" && (
                <input
                  className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                />
              )}
              {q.type === "textarea" && (
                <textarea
                  className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                />
              )}
              {q.type === "select" && (
                <select
                  className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                >
                  <option value="">請選擇</option>
                  {q.options?.map((opt: string, i: number) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="gap-4 flex">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isEditMode ? "更新報名資料" : "送出報名資料"}
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          返回
        </button>
      </div>
      {message && (
        <p className="text-green-600 dark:text-green-400 mt-4 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
