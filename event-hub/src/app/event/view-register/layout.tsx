import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - View Register',
  description: '檢視報名資訊',
  openGraph: {
    title: '🎓 Event Hub - View Register',
    description: '檢視報名資料',
    type: 'website',
  },
};

export default function ProfileLayout({ children, }: { children: React.ReactNode;}) {
  return <>{children}</>;
}