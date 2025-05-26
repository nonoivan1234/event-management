import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Attended Events',
  description: '參加活動列表',
  openGraph: {
    title: '🎓 Event Hub - Attended Events',
    description: '參加活動列表',
    type: 'website',
  },
};

export default function ProfileLayout({ children, }: { children: React.ReactNode;}) {
  return <>{children}</>;
}