'use client'

import React from 'react';
import { useRouter } from 'next/navigation';

const options = {
  year:   'numeric',
  month:  '2-digit',
  day:    '2-digit',
  hour:   '2-digit',
  minute: '2-digit',
  hour12: false,
};

type Event_Detail = {
    event_id: string;
    title: string;
    description: string;
    category: string[];
    start: string | null;
    end: string | null;
    deadline: string;
    users: {name: string;};
}

export default function EventCard({ event, children }: { event: Event_Detail, children?: React.ReactNode }) {
    console.log(event);
    const router = useRouter();
    const today = new Date();
    const past = event.start != null && new Date(event.start) < today;
    const deadline = new Date(event.deadline);
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 1);
    const isExpired = deadline < today;
    return (
        <div
            key={event.event_id}
            onClick={() => router.push(`/event/${event.event_id}`)}
            className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between hover:shadow-md duration-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
        >
            <div>
                <h2 className="text-lg font-semibold truncate">
                    {event.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    活動時間：{event.start && new Date(event.start).toLocaleString('zh-tw', options)}{(event.start || event.end) ? ' - ' : 'Coming Soon'}
                    {event.end && new Date(event.end).toLocaleString('zh-tw', options)}{past && <span className="text-red-500 ml-2">(已結束)</span>}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    截止日期：{event.deadline}
                    {isExpired && <span className="text-red-500 ml-2">(已截止)</span>}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 mt-2 ml-1 max-h-36 overflow-y-auto whitespace-pre-line">
                    {event.description.split('\n').map((line, index) => (
                    <span key={index}>
                        {line}
                        <br />
                    </span>
                    ))}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    🧑‍💼 {event.users.name || "匿名主辦人"}
                </p>
                {Array.isArray(event.category) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                    {event.category.map((cat: string) => (
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
            {children && <div className="mt-2">{children}</div>}
        </div>
    )
}
