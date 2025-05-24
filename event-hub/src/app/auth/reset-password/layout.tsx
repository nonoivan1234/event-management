import type { Metadata } from 'next'
import React from 'react';

// app/layout.tsx (App Router)
export const metadata: Metadata = {
  title: 'Event Hub - Reset Password',
  description: '重設密碼',
  openGraph: {
    title: '🎓 Event Hub - Reset Password',
    description: '重設密碼',
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