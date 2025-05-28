"use client";

import { useEffect, useState, KeyboardEvent, ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import LoadingScreen from "@/components/loading";
import ShareLinkModal from "@/components/ShareLinkModal";
import Spinner from "@/components/ui/Spinner";

async function base64ToBlob(base64: string): Promise<Blob> {
  const res = await fetch(base64)
  return await res.blob()
}

async function uploadEventCover(eventId: string, cover_image: string) {
  const imageBlob = await base64ToBlob(cover_image)

  const fileName = `cover-${eventId}.jpg`
  await supabase.storage
    .from('event-covers')
    .upload(fileName, imageBlob, { contentType: 'image/jpeg', upsert: true })

  const publicUrl = `https://ulannnnbfftsuttmzpea.supabase.co/storage/v1/object/public/event-covers/${fileName}`
  await supabase.from('events').update({ cover_url: publicUrl }).eq('event_id', eventId)
}

const defaultPersonalFields = [
  "name",
  "email",
  "phone",
  "student_id",
  "school",
];
function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString); // 轉成 Date 物件 (UTC)
  const offsetMs = d.getTimezoneOffset() * 60 * 1000; // 取得時區差(分鐘) -> 毫秒
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

interface EventDetails {
  title: string;
  description?: string;
  deadline: string;
  start?: string;
  end?: string;
  images?: string[];
  venue_name?: string;
  venue_address?: string;
  shareLinks?: Record<string, string>;
  categories?: string[];
}

export default function EventFormPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event_id");
  const isEdit = !!eventId;
  const router = useRouter();

  // Tab state: 'basic' or 'form'
  const [activeTab, setActiveTab] = useState<"basic" | "form">("basic");

  // Basic info state
  const [form, setForm] = useState<EventDetails>({
    title: "",
    description: "",
    deadline: "",
    start: "",
    end: "",
    images: [],
    venue_name: "",
    venue_address: "",
    shareLinks: {},
    categories: [],
  });
  const [categoryInput, setCategoryInput] = useState("");

  // Form settings state
  const [personalFields, setPersonalFields] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);

  // Loading and messages
  const [imageError, setImageError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [notAuthorized, setNotAuthorized] = useState(false);

  // share link modal state
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const id = searchParams.get("event_id");
    if (!id)
      setLoading(false);
    else {
      // Fetch event data for edit
      const fetchEventData = async () => {
        const { data: userData } = await supabase.auth.getUser();
        const currentUser = userData?.user;
        if (!currentUser) {
          setLoading(false);
          setNotAuthorized(true);
          return;
        }

        const { data, error } = await supabase
          .from("events")
          .select(
            "title, description, deadline, category, form_schema, organizer_id, start, end, images, venue_name, venue_address, share_link"
          )
          .eq("event_id", id)
          .single();

        if (error || !data) {
          router.replace("/404");
          return;
        }

        const { data: organizerData, error: org_err } = await supabase
          .from("event_organizers")
          .select("role")
          .eq("event_id", id)
          .eq("role_id", currentUser.id)
          .eq("role", "organizer")
          .single();

        if (org_err || !organizerData) {
          setLoading(false);
          setNotAuthorized(true);
          return;
        }

        const categories =
          typeof data.category === "string"
            ? JSON.parse(data.category)
            : data.category;
        const shareLinks =
          data.share_link && typeof data.share_link === "string"
            ? JSON.parse(data.share_link)
            : data.share_link;

        setForm({
          title: data.title,
          description: data.description || "",
          deadline: data.deadline,
          start: data.start || "",
          end: data.end || "",
          images: data.images || [],
          venue_name: data.venue_name || "",
          venue_address: data.venue_address || "",
          shareLinks,
          categories,
        });
        setPersonalFields(data.form_schema?.personalFields ?? []);
        setCustomQuestions(data.form_schema?.customQuestions ?? []);
        setLoading(false);
      };
      fetchEventData();
    }
  }, [searchParams]);

  // 時間驗證
  useEffect(() => {
    setTimeError((form.start && form.end && new Date(form.end) < new Date(form.start)) ? "❗ 結束時間不得早於開始時間" : "");
  }, [form.start, form.end]);

  // 截止日期驗證
  useEffect(() => {
    setDeadlineError((form.deadline && form.start && new Date(form.start) < new Date(form.deadline)) ? "❗ 報名截止日期不得晚於活動開始時間" : "");
  }, [form.deadline, form.start]);

  // Handlers for basic info
  const handleChange = (field: string, value: string) => {
    if (field === "start" || field === "end") {
      const localDate = new Date(value);
      setForm((prev) => ({ ...prev, [field]: localDate.toISOString() }));
    } else setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if(e.nativeEvent.isComposing) return;
      const value = categoryInput.trim();
      if (value && !form.categories.includes(value))
        setForm((prev) => ({...prev, categories: [...prev.categories, value],}));
      setCategoryInput("");
    }
  };

  const removeCategory = (cat: string) =>
    setForm((prev) => ({...prev, categories: prev.categories.filter((c) => c !== cat)}));

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setImageError("");
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setImageError("❗ 只能上傳圖片檔案（jpg/png/gif檔）");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setImageError("❗ 圖片超過 10MB，請重新選擇");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () =>
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, reader.result as string],
        }));
      reader.readAsDataURL(file);
    });
  };
  const removeImage = (i: number) =>
    setForm((prev) => ({...prev, images: prev.images.filter((_, idx) => idx !== i)}));

  // Handlers for form settings
  const togglePersonalField = (field: string) =>
    setPersonalFields((prev) => prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]);

  const addQuestion = () => 
    setCustomQuestions((prev) => [...prev,{id: uuidv4(), label: "新問題", type: "text", required: false, options: []}])

  const updateQuestion = (id: string, changes: any) =>
    setCustomQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));

  const deleteQuestion = (id: string) =>
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));

  const handleShareSubmit = (links: Record<string, string>) => {
    setForm((prev) => ({ ...prev, shareLinks: links }));
    setModalVisible(false);
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = "auto"; // reset
    e.target.style.height = e.target.scrollHeight + "px";
    handleChange("description", e.target.value);
  };

  // Submit handler
  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage("");

    // Validation
    if (timeError !== "") {
      setMessage("❗ 結束時間不得早於開始時間");
      setTimeError("❗ 結束時間不得早於開始時間");
      setSubmitting(false);
      return;
    }
    if (deadlineError !== "") {
      setMessage("❗ 報名截止日期不得晚於活動開始時間");
      setDeadlineError("❗ 報名截止日期不得晚於活動開始時間");
      setSubmitting(false);
      return;
    }
    if (!form.title || !form.deadline) {
      setMessage("❗ 請完整填寫所有欄位");
      setSubmitting(false);
      return;
    }
    if (personalFields.length === 0 && customQuestions.length === 0) {
      setMessage("❗請至少選擇一項個人欄位或新增一題自訂問題");
      setSubmitting(false);
      return;
    }
    if (customQuestions.some((q) => !q.label.trim())) {
      setMessage("❗ 所有自訂問題都必須填寫標題");
      setSubmitting(false);
      return;
    }

    const {data: { user }} = await supabase.auth.getUser();
    if (!user) { setMessage("❗ 請先登入"); setSubmitting(false); return;}

    const payload = {
      title: form.title,
      description: form.description,
      deadline: form.deadline,
      start: form.start == "" ? null : form.start,
      end: form.end == "" ? null : form.end,
      images: form.images,
      venue_name: form.venue_name,
      venue_address: form.venue_address,
      category: JSON.stringify(form.categories),
      share_link: JSON.stringify(form.shareLinks),
      form_schema: { personalFields, customQuestions },
    };

    if (isEdit) {
      const { error } = await supabase
        .from("events")
        .update(payload)
        .eq("event_id", eventId);
      if(form.images.length > 0)
        await uploadEventCover(eventId, form.images[0]);
      setMessage(error ? `❌ 更新失敗：${error.message}` : "✅ 活動已更新");
    } else {
      const { error, data } = await supabase
        .from("events")
        .insert({ ...payload, organizer_id: user.id })
        .select()
        .single();
      if (error) {
        setMessage(`❌ 建立失敗：${error.message}`);
      } else {
        await supabase.from("event_organizers").insert({ event_id: data.event_id, role_id: user.id, role: "organizer"});
        if(form.images.length > 0)
          await uploadEventCover(data.event_id, form.images[0]);
        setMessage("✅ 活動已建立");
        router.push(`/event/hold`);
      }
    }
    setSubmitting(false);
  };

  if (loading) return <LoadingScreen />;
  if (notAuthorized)
    return (
      <p className="p-4 text-red-600 dark:text-red-400">
        您沒有權限查看此報名資料。
      </p>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-gray-900 dark:text-white">
      {/* Header Tabs */}
      <h1 className="text-2xl font-bold mb-4">
        {isEdit ? "編輯活動" : "建立新活動"}
      </h1>
      <div className="flex justify-center mb-6 space-x-4">
        <button
          className={`px-4 py-2 font-semibold rounded ${
            activeTab === "basic"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          }`}
          onClick={() => setActiveTab("basic")}
        >
          基本資料
        </button>
        <button
          className={`px-4 py-2 font-semibold rounded ${
            activeTab === "form"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          }`}
          onClick={() => setActiveTab("form")}
        >
          表單設定
        </button>
      </div>

      {/* Basic Info Section */}
      {activeTab === "basic" && (
        <>
          {/* Activity Title */}
          <label className="block mb-2">
            活動名稱（必填）
            <input
              className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </label>
          {/* Description */}
          <label className="block mb-2">
            活動說明
            <textarea
              rows={3}
              className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white resize-none overflow-hidden"
              value={form.description}
              onChange={autoResize}
            />
          </label>
          {/* Deadline */}
          <label className="block mb-2">
            截止日期（必填）
            <input
              type="date"
              className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
              value={form.deadline}
              onChange={(e) => handleChange("deadline", e.target.value)}
            />
          </label>
          {deadlineError && (
            <p className="text-red-600 text-sm mb-4">{deadlineError}</p>
          )}
          <div className="flex items-center gap-4 w-full">
            {/* Start Time */}
            <label className="flex-1">
              開始時間
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
                value={toDatetimeLocal(form.start)}
                onChange={(e) => handleChange("start", e.target.value)}
              />
            </label>
            {/* End Time */}
            <label className="flex-1">
              結束時間
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
                value={toDatetimeLocal(form.end)}
                onChange={(e) => handleChange("end", e.target.value)}
              />
            </label>
          </div>
          {timeError && (
            <p className="text-red-600 text-sm mb-4">{timeError}</p>
          )}
          {/* Venue */}
          <div className="flex items-center gap-4 w-full">
            <label className="flex-1">
              活動地點名稱
              <input
                type="text"
                className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
                value={form.venue_name}
                onChange={(e) => handleChange("venue_name", e.target.value)}
              />
            </label>
            <label className="flex-1">
              活動地點地址
              <input
                type="text"
                className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
                value={form.venue_address}
                onChange={(e) => handleChange("venue_address", e.target.value)}
              />
            </label>
          </div>
          {/* Categories */}
          <label className="block mb-2">活動類別</label>
          <div className="w-full border px-3 py-2 rounded flex flex-wrap items-center gap-2 dark:bg-gray-700">
            {form.categories.map((cat) => (
              <span
                key={cat}
                className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-sm flex items-center"
              >
                {cat}
                <button
                  className="ml-1 text-red-500"
                  onClick={() => removeCategory(cat)}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={handleCategoryKeyDown}
              placeholder="輸入後按 Enter"
              className="flex-grow bg-transparent text-sm focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">分享連結</label>
            <button
              type="button"
              onClick={() => setModalVisible(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              編輯分享連結
            </button>
            {/* show current links */}
            <div className="mt-2 flex flex-wrap gap-2">
              {form.shareLinks &&
                Object.entries(form.shareLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded"
                  >
                    {platform}
                  </a>
                ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block mb-1">上傳圖片（最多10MB/張，可多張）</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </div>
          {imageError && <p className="text-red-600 text-sm mb-2">{imageError}</p>}
          <div className="flex flex-wrap gap-3 mb-4">
            {form.images.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  className="w-24 h-24 object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0 right-0 text-red-600 bg-white rounded-full px-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form Settings Section */}
      {activeTab === "form" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Fields */}
            <div>
              <h2 className="font-semibold mb-2">
                Select Personal Information Fields
              </h2>
              {defaultPersonalFields.map((field) => (
                <label
                  key={field}
                  className="block text-gray-700 dark:text-gray-300 mb-1"
                >
                  <input
                    type="checkbox"
                    checked={personalFields.includes(field)}
                    onChange={() => togglePersonalField(field)}
                    className="mr-2"
                  />
                  {field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ")}
                </label>
              ))}
            </div>
            {/* Preview */}
            <div>
              <h2 className="font-semibold mb-2">Form Preview</h2>
              <div className="border rounded-md p-4 bg-white dark:bg-gray-800 dark:border-gray-600">
                {personalFields.length === 0 && customQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    尚無表單欄位
                  </p>
                ) : (
                  <>
                    {personalFields.length > 0 && (
                      <>
                        <p className="font-medium mb-2">Personal Information</p>
                        {personalFields.map((field) => (
                          <p
                            key={field}
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            {field}: [Auto-filled]
                          </p>
                        ))}
                        <hr className="my-2 dark:border-gray-600" />
                      </>
                    )}
                    {customQuestions.map((q) => (
                      <div key={q.id} className="mb-3">
                        <p className="font-semibold">
                          {q.label} {q.required ? "*" : ""}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                          Type: {q.type}
                        </p>
                        {q.type === "select" && (
                        <div className="w-full flex flex-wrap items-center gap-2 mt-1 ml-2">
                          {q.options.map((opt: string, i: number) => (
                            <span
                              key={i}
                              className="bg-gray-300 dark:bg-gray-600 px-1 py-0.5 rounded text-xs flex items-center"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Custom Questions Editor */}
          <hr className="my-6" />
          <h2 className="font-semibold mb-2">Custom Questions</h2>
          {customQuestions.map((q) => (
            <div
              key={q.id}
              className="border p-4 rounded mb-4 dark:border-gray-600"
            >
              <input
                className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:text-white"
                value={q.label}
                onChange={(e) =>
                  updateQuestion(q.id, { label: e.target.value })
                }
              />
              <select
                className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:text-white"
                value={q.type}
                onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
              >
                <option value="text">Text</option>
                <option value="textarea">Paragraph</option>
                <option value="select">Dropdown</option>
              </select>
              {q.type === "select" && 
                <div className="w-full border px-3 py-2 mb-1 rounded flex flex-wrap items-center gap-2 dark:bg-gray-700">
                  {q.options.map((opt: string, i: number) => (
                    <span
                      key={i}
                      className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-sm flex items-center"
                    >
                      {opt}
                      <button
                        className="ml-1 text-red-500"
                        onClick={() => updateQuestion(q.id, {options: q.options.filter((_: any, idx: number) => idx !== i)})}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if(e.nativeEvent.isComposing) return;
                        const input = e.target as HTMLInputElement;
                        const value = input.value.trim();
                        if (value && !q.options.includes(value))
                          updateQuestion(q.id, {options: [...q.options, value]});
                        input.value = "";
                      }
                    }}
                    placeholder="輸入後按 Enter"
                    className="flex-grow bg-transparent text-sm focus:outline-none"
                  />
                </div>}
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) =>
                    updateQuestion(q.id, { required: e.target.checked })
                  }
                />
                必填
              </label>
              <button
                onClick={() => deleteQuestion(q.id)}
                className="bg-red-100 text-red-700 text-sm mt-2 px-2 py-1 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
              >
                刪除此題
              </button>
            </div>
          ))}
          <button
            onClick={addQuestion}
            className="mb-6 px-4 py-2 rounded bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            ➕ 新增問題
          </button>
        </>
      )}

      {/* Actions */}
      <hr className="my-6" />
      <div className="flex flex-col md:flex-row gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-[3] bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 min-w-[6rem] items-center justify-items-center"
        >
          {submitting ? <Spinner className="w-6 h-6"/> : isEdit ? "更新活動" : "建立活動"}
        </button>
        <button
          onClick={() => router.back()}
          className="flex-[1] bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          返回
        </button>
      </div>
      {message && <p className="text-center mt-2 text-sm">{message}</p>}
      {/* Modal */}
      <ShareLinkModal
        visible={modalVisible}
        initialLinks={form.shareLinks}
        onClose={() => setModalVisible(false)}
        onSubmit={handleShareSubmit}
      />
    </div>
  );
}
