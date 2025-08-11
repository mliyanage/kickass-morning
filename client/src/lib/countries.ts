import countries from "world-countries";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  callingCode: string;
}

// Type for world-countries data structure
interface Country {
  name: {
    common: string;
  };
  flag: string;
  idd: {
    root: string;
    suffixes: string[];
  };
}

// Create a formatted list of countries with calling codes
export function getCountryOptions(): CountryOption[] {
  const countryOptions = (countries as Country[])
    .filter((country: Country) => country.idd.root && country.idd.suffixes)
    .map((country: Country) => {
      // Handle calling codes - for +1 countries, use just +1 (not area codes)
      let callingCode = country.idd.root;
      
      // For most countries, append the first suffix, but for +1 countries use just +1
      if (country.idd.root !== "+1") {
        callingCode = country.idd.root + (country.idd.suffixes[0] || "");
      }

      return {
        code: callingCode,
        name: `${country.name.common} (${callingCode})`,
        flag: country.flag,
        callingCode: callingCode,
      };
    })
    .filter((country: CountryOption) => country.code) // Remove any entries without calling codes
    
  // Remove duplicates (multiple +1 countries will be merged)
  const uniqueCountries = new Map();
  countryOptions.forEach(country => {
    const existing = uniqueCountries.get(country.code);
    if (!existing) {
      uniqueCountries.set(country.code, country);
    } else {
      // For +1, prefer US over other countries for display
      if (country.code === "+1" && country.name.includes("United States")) {
        uniqueCountries.set(country.code, country);
      }
    }
  });

  return Array.from(uniqueCountries.values())
    .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));
}

// Get popular countries first for better UX
export function getPopularCountries(): CountryOption[] {
  const popularCountryCodes = [
    "+1",
    "+44",
    "+91",
    "+61",
    "+33",
    "+49",
    "+81",
    "+86",
    "+52",
    "+55",
    "+234",
    "+27",
    "+82",
    "+65",
    "+971",
    "+7",
  ];
  const allCountries = getCountryOptions();

  const popular = popularCountryCodes
    .map((code) => allCountries.find((country) => country.code === code))
    .filter(Boolean) as CountryOption[];

  const others = allCountries.filter(
    (country) => !popularCountryCodes.includes(country.code),
  );

  return [...popular, ...others];
}

// Find country by calling code
export function findCountryByCode(
  callingCode: string,
): CountryOption | undefined {
  return getCountryOptions().find((country) => country.code === callingCode);
}

// Get a specific list of countries by calling codes
export function getSpecificCountries(): CountryOption[] {
  const specificCountryCodes = ["+1", "+64", "+61", "+65", "+91"];
  const allCountries = getCountryOptions();

  const specificCountries = specificCountryCodes
    .map((code) => allCountries.find((country) => country.code === code))
    .filter(Boolean) as CountryOption[];

  return specificCountries;
}
