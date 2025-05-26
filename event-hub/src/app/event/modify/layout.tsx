import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Event Edit',
  description: '活動編輯',
  openGraph: {
    title: '🎓 Event Hub - Event Edit',
    description: '活動編輯',
    type: 'website',
  },
};

export default function ProfileLayout({ children, }: { children: React.ReactNode;}) {
  return <>{children}</>;
}