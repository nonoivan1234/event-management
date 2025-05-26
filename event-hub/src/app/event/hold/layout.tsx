import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Evnent Management Dashboard',
  description: '活動管理',
  openGraph: {
    title: '🎓 Event Hub - Event Management Dashboard',
    description: '活動管理',
    type: 'website',
  },
};

export default function ProfileLayout({ children, }: { children: React.ReactNode;}) {
  return <>{children}</>;
}