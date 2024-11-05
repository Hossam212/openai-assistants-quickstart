'use client';

import { AnalyticsBrowser } from '@segment/analytics-next';

const analytics = AnalyticsBrowser.load({
  writeKey: process.env['NEXT_PUBLIC_SEGMENT_WRITE_KEY'] as string,
});

export function track(
  event: string,
  properties: Record<string, unknown> = {},
  fn: 'track' | 'page' | 'identify' = 'track',
) {
  analytics[fn](event, { ...properties, website: 'new-website' });
}

export function useTracker() {
  return track;
}
