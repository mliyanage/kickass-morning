import { formatInTimeZone } from 'date-fns-tz';

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
  city: string;
}

// Get current UTC offset for a timezone
function getCurrentOffset(timezone: string): string {
  const now = new Date();
  const offsetMs = new Date(now.toLocaleString("en-US", { timeZone: timezone })).getTime() - 
                   new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const offsetHours = Math.floor(offsetMs / (1000 * 60 * 60));
  const offsetMinutes = Math.abs(offsetMs % (1000 * 60 * 60)) / (1000 * 60);
  
  const sign = offsetHours >= 0 ? '+' : '';
  if (offsetMinutes === 0) {
    return `UTC${sign}${offsetHours}`;
  }
  const minutes = offsetMinutes === 30 ? ':30' : '';
  return `UTC${sign}${offsetHours}${minutes}`;
}

// Parse timezone identifier to get region and city
function parseTimezone(timezone: string): { region: string; city: string } {
  const parts = timezone.split('/');
  const region = parts[0] || '';
  const city = parts.slice(1).join('/').replace(/_/g, ' ');
  return { region, city };
}

// Get all timezone options using browser API
export function getTimezoneOptions(): TimezoneOption[] {
  let timezones: string[] = [];
  
  try {
    // Use modern browser API if available
    if ('supportedValuesOf' in Intl) {
      timezones = Intl.supportedValuesOf('timeZone');
    } else {
      // Fallback to a curated list of common timezones
      timezones = [
        'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
        'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
        'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Moscow',
        'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong',
        'Asia/Singapore', 'Asia/Bangkok', 'Asia/Mumbai', 'Asia/Kolkata', 'Asia/Dubai',
        'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth',
        'Pacific/Auckland', 'Pacific/Honolulu',
        'America/Sao_Paulo', 'America/Buenos_Aires', 'America/Santiago',
        'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos'
      ];
    }
  } catch {
    // Fallback if API fails
    timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
  }
  
  return timezones
    .map((timezone: string) => {
      const { region, city } = parseTimezone(timezone);
      const offset = getCurrentOffset(timezone);
      
      return {
        value: timezone,
        label: `${city} (${offset})`,
        offset,
        region,
        city,
      };
    })
    .sort((a: TimezoneOption, b: TimezoneOption) => {
      // Sort by region first, then by city
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region);
      }
      return a.city.localeCompare(b.city);
    });
}

// Get popular timezones for better UX
export function getPopularTimezones(): TimezoneOption[] {
  const popularZones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
    'America/Toronto',
    'America/Vancouver',
    'Asia/Singapore',
    'Asia/Hong_Kong',
  ];

  const allTimezones = getTimezoneOptions();
  const popular = popularZones
    .map(zone => allTimezones.find(tz => tz.value === zone))
    .filter(Boolean) as TimezoneOption[];
  
  const others = allTimezones.filter(tz => !popularZones.includes(tz.value));
  
  return [...popular, ...others];
}

// Group timezones by region
export function getGroupedTimezones(): Record<string, TimezoneOption[]> {
  const timezones = getTimezoneOptions();
  const grouped: Record<string, TimezoneOption[]> = {};
  
  timezones.forEach((timezone: TimezoneOption) => {
    const region = timezone.region;
    if (!grouped[region]) {
      grouped[region] = [];
    }
    grouped[region].push(timezone);
  });
  
  return grouped;
}

// Auto-detect user's current timezone
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // Fallback
  }
}

// Find timezone option by value
export function findTimezoneByValue(value: string): TimezoneOption | undefined {
  return getTimezoneOptions().find(tz => tz.value === value);
}