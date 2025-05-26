import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Event Signup',
  description: '活動報名',
  openGraph: {
    title: '🎓 Event Hub - Event Signup',
    description: '活動報名',
    type: 'website',
  },
};

export default function ProfileLayout({ children, }: { children: React.ReactNode;}) {
  return <>{children}</>;
}