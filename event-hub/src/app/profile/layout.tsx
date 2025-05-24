import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - User Profile',
  description: '編輯個人資料',
  openGraph: {
    title: '🎓 Event Hub - User Profile',
    description: '編輯個人資料',
    type: 'website',
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}