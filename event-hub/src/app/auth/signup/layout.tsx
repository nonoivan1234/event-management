import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Sign up',
  description: '註冊帳號',
  openGraph: {
    title: '🎓 Event Hub - Sign up',
    description: '註冊帳號',
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