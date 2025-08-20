import posthog from 'posthog-js';

// Define PostHog types
declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

// Initialize PostHog
export const initPostHog = () => {
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!apiKey || !host) {
    console.warn('Missing required PostHog keys: VITE_POSTHOG_API_KEY and VITE_POSTHOG_HOST');
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    // Enable session recordings and heatmaps
    capture_pageview: true,
    capture_pageleave: true,
    // Better privacy controls
    respect_dnt: true,
    // Enable session recordings
    disable_session_recording: false,
    // Autocapture settings
    autocapture: {
      dom_event_allowlist: ['click', 'change', 'submit'],
    },
  });

  // Make PostHog available globally for debugging
  window.posthog = posthog;
};

// Track page views - PostHog does this automatically, but we keep for consistency
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  
  posthog.capture('$pageview', {
    $current_url: window.location.origin + url,
  });
};

// Track events for marketing analytics
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  
  posthog.capture(action, {
    category,
    label,
    value,
    // Add additional context
    $current_url: window.location.href,
  });
};

// Conversion tracking functions for marketing campaigns
export const trackConversion = (conversionType: 'signup' | 'phone_verified' | 'first_schedule' | 'first_call') => {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  
  posthog.capture('conversion', {
    conversion_type: conversionType,
    category: 'user_journey',
    // Set user properties for better segmentation
    $set: {
      [`has_${conversionType}`]: true,
      last_conversion: conversionType,
      last_conversion_time: new Date().toISOString(),
    }
  });
};

// Marketing campaign tracking
export const trackCampaignClick = (source: 'meta_ad' | 'affiliate' | 'organic', campaign?: string) => {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  
  posthog.capture('campaign_click', {
    source,
    campaign,
    category: 'marketing',
    // Track campaign attribution
    $set: {
      utm_source: source,
      utm_campaign: campaign,
      first_referrer: source,
    }
  });
  
  if (campaign) {
    posthog.capture('campaign_specific', {
      campaign,
      source,
      category: 'marketing',
    });
  }
};

// User engagement tracking
export const trackEngagement = (action: 'schedule_created' | 'personalization_completed' | 'call_answered' | 'app_opened') => {
  if (typeof window === 'undefined' || !posthog.__loaded) return;
  
  posthog.capture('engagement', {
    action,
    category: 'user_behavior',
    // Update user engagement properties
    $set: {
      [`last_${action}`]: new Date().toISOString(),
      total_engagements: '$increment',
    }
  });
};