// app/event/layout.tsx
import { ReactNode } from 'react';
import { supabase } from '@/lib/supabase'
import { Metadata } from 'next';

export async function generateMetadata( { params }: { params: { event_id: string } }): Promise<Metadata> {
  const eventId = params.event_id;

  if (!eventId) {
    return {
      title: 'Event Hub - Event Page',
      description: 'No event selected',
    };
  }

  const { data, error } = await supabase
    .from('events')
    .select('title, description, cover_url')
    .eq('event_id', eventId)
    .single();

  if (error || !data) {
    return {
      title: 'Event Hub - Event Page',
      description: 'Event not found',
    };
  }

  return {
    title: `Event Hub - Event Page`,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: data.cover_url ? data.cover_url : "https://ulannnnbfftsuttmzpea.supabase.co/storage/v1/object/public/event-covers/default.jpg",
    },
  };
}

export default function EventLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
