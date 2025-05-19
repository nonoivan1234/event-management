'use client'
export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 dark:border-blue-400"></div>
      <p className="ml-4 text-lg text-gray-700 dark:text-gray-300">載入中...</p>
    </div>
  );
}