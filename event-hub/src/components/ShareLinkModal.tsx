// components/ShareLinkModal.tsx
"use client";

import React, { useState, useEffect } from "react";

export interface ShareLinkModalProps {
  visible: boolean;
  initialLinks?: Record<string, string>;
  onClose: () => void;
  onSubmit: (links: Record<string, string>) => void;
}

interface LinkEntry {
  id: number;
  platform: string;
  url: string;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  visible,
  initialLinks = {},
  onClose,
  onSubmit,
}) => {
  const [entries, setEntries] = useState<LinkEntry[]>([]);

  useEffect(() => {
    if (visible) {
      const initial: LinkEntry[] = Object.entries(initialLinks).map(
        ([platform, url], idx) => ({ id: idx, platform, url })
      );
      setEntries(initial.length ? initial : [{ id: 0, platform: "", url: "" }]);
    }
  }, [visible, initialLinks]);

  const handleChange = (
    id: number,
    field: "platform" | "url",
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const addRow = () =>
    setEntries((prev) => [
      ...prev,
      { id: Date.now(), platform: "", url: "" },
    ]);

  const removeRow = (id: number) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const links: Record<string, string> = {};
    entries.forEach(({ platform, url }) => {
      if (platform.trim() && url.trim()) {
        links[platform.trim()] = url.trim();
      }
    });
    onSubmit(links);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          編輯分享連結
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {entries.map(({ id, platform, url }) => (
            <div key={id} className="flex items-center gap-2">
              {/* 平台名稱固定寬度 */}
              <input
                type="text"
                placeholder="平台名稱"
                value={platform}
                onChange={(e) => handleChange(id, "platform", e.target.value)}
                className="flex-none w-28 px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              {/* 連結自動撐滿 */}
              <input
                type="url"
                placeholder="連結 URL"
                value={url}
                onChange={(e) => handleChange(id, "url", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              {/* 刪除按鈕 */}
              <button
                type="button"
                onClick={() => removeRow(id)}
                className="flex-none px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                刪除
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            新增一行
          </button>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              確認
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareLinkModal;
