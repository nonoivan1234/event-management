"use client"

import { useSearchParams, useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "@/components/loading";
import Spinner from "@/components/ui/Spinner";


export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");

  const [formSchema, setFormSchema] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<Record<string, any>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [message, setMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [nologin, setNologin] = useState(true);
  const [loading, setLoading] = useState(false);

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
      const eventDeadline = new Date(eventData.deadline);
      const deadline = new Date(eventData.deadline);
      deadline.setHours(0, 0, 0, 0);
      deadline.setDate(deadline.getDate() + 1);
      if (deadline < now) {
        setIsClosed(true);
        setDeadline(eventDeadline.toLocaleDateString());
        return;
      }

      setFormSchema(eventData.form_schema);
      setDeadline(eventDeadline?.toLocaleDateString() || null);

      const { data: authData } = await supabase.auth.getUser();
      const user_id = authData.user?.id;

      if (!user_id) {
        setUserInfo({});
        setAnswers({});
        setIsEditMode(false);
        setNologin(true);
        if(!eventData.form_schema.personalFields.includes("email")) 
          eventData.form_schema.personalFields.push("email");
      } else {
        setNologin(false);
        const fields = ["user_id", ...(eventData.form_schema.personalFields || [])];
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
      }
    };
    fetchData();
  }, [eventId, router]);

  const handleChange = (key: string, value: any) => setAnswers((prev) => ({ ...prev, [key]: value }))
  const handleUserInfoChange = (key: string, value: any) => setUserInfo((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    if (!formSchema) return;
    setLoading(true);
    // 驗證必填欄位
    const Cust_missingFields = formSchema.customQuestions?.filter((q: any) => q.required && !answers[q.id]?.trim()) || [];
    const Person_missingFields = formSchema.personalFields?.filter((field: string) => !userInfo[field]?.trim()) || [];
    const nologin_missingPasswd = nologin && userInfo.password == "";
    console.log(userInfo)
    if (Cust_missingFields.length || Person_missingFields.length || nologin_missingPasswd) {
      let msg = "請填寫所有必填欄位：";
      if (Person_missingFields.length > 0)
        msg += Person_missingFields.join("、");
      if (Cust_missingFields.length > 0)
        msg += Cust_missingFields.map((q: any) => q.label).join("、");
      if (nologin_missingPasswd)
        msg += "密碼";
      setMessage(`⚠️ ${msg}`);
      setLoading(false);
      return;
    }
    let error;
    if(nologin){
      let signUpData;
      ({ data: signUpData, error } = await supabase.auth.signUp({email: userInfo.email, password: userInfo.password}))
      if (error && error.message.includes("already registered")) {
        setMessage("⚠️ 已有帳號，請登入，即將跳轉。");
        setTimeout(() => router.push("/auth/login"), 1000);
        setLoading(false);
        return;
      } else if (error) {
        setMessage(`❌ 註冊失敗：${error.message}`);
      } else {
        const UserUpdate_Data = {
          email: userInfo.email,
          name: userInfo.name || null,
          student_id: userInfo.student_id || null,
          phone: userInfo.phone || null,
          school: userInfo.school || null,
        };
        ({error} = await supabase.from("users").update(UserUpdate_Data).eq("user_id", signUpData.user.id));
        if (!error) {
          const UserInfoPayload = {user_id: signUpData.user.id};
          formSchema.personalFields.map((field: string) => {UserInfoPayload[field] = UserUpdate_Data[field] || "";})
          const payload = {
            event_id: eventId,
            user_id: signUpData.user.id,
            user_info_snapshot: UserInfoPayload,
            answers,
          };
          ({ error } = await supabase.from("registrations").insert(payload));
        }
      }
    }
    else {
      ({error} = await supabase.from("users")
        .update(userInfo)
        .eq("user_id", userInfo.user_id));
      if (!error) {
        const payload = {
          event_id: eventId,
          user_id: userInfo.user_id,
          user_info_snapshot: userInfo,
          answers,
        };
        if (isEditMode)
          ({ error } = await supabase
            .from("registrations")
            .update(payload)
            .eq("event_id", eventId)
            .eq("user_id", userInfo.user_id));
        else
          ({ error } = await supabase.from("registrations").insert(payload));
      }
    }

    setMessage(error
      ? `❌ ${isEditMode ? "更新" : "報名"}失敗：${error.message}`
      : nologin ? "✅ 報名並建立帳號成功！"
      : `✅ ${isEditMode ? "更新成功！" : "報名成功！"} 即將跳轉到報名頁面`
    );
    setLoading(false);
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

  if (!formSchema) return <LoadingScreen />;

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
          個人資料（自動帶入）
        </h2>
        {formSchema.personalFields?.map((field: string) => (
          <div key={field} className="mb-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              {field}*
              <input
                className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={userInfo[field] || ""}
                onChange={(e) => handleUserInfoChange(field, e.target.value)}
                readOnly={field == "email" && !nologin}
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
      {nologin && (<>
        <hr className="my-6 border-gray-300 dark:border-gray-600" />
        <div className="mb-6">
          <h2 className="font-semibold mb-2 text-gray-800 dark:text-white">
            帳號密碼（修改報名資料用）
          </h2>
          <div className="mb-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              密碼*
              <input
                className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                type="password"
                autoComplete="new-password"
                onChange={(e) => handleUserInfoChange("password", e.target.value)}
              />
            </label>
          </div>
        </div>
      </>)}
      <hr className="my-6 border-gray-300 dark:border-gray-600" />
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {nologin ? "請填寫欄位完成報名並建立帳號。" : "請確認填寫的資料無誤，然後提交報名表單並更新個人資料。"}
      </p>
      <div className="gap-4 flex">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 min-w-[8rem] disabled:opacity-50 disabled:cursor-not-allowed items-center justify-items-center"
        >
          {loading ? <Spinner className="w-6 h-5"/>: isEditMode ? "更新報名資料" : "送出報名資料"}
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
