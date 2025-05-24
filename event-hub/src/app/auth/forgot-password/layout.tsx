import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Forgot Password',
  description: '忘記密碼',
  openGraph: {
    title: '🎓 Event Hub - Forgot Password',
    description: '忘記密碼',
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