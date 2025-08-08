import countries from 'world-countries';

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
      // Handle calling codes - some countries have multiple suffixes
      const callingCode = country.idd.root + (country.idd.suffixes[0] || '');
      
      return {
        code: callingCode,
        name: `${country.name.common} (${callingCode})`,
        flag: country.flag,
        callingCode: callingCode,
      };
    })
    .filter((country: CountryOption) => country.code) // Remove any entries without calling codes
    .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name));

  return countryOptions;
}

// Get popular countries first for better UX
export function getPopularCountries(): CountryOption[] {
  const popularCountryCodes = ['+1', '+44', '+91', '+61', '+33', '+49', '+81', '+86', '+52', '+55', '+234', '+27', '+82', '+65', '+971', '+7'];
  const allCountries = getCountryOptions();
  
  const popular = popularCountryCodes
    .map(code => allCountries.find(country => country.code === code))
    .filter(Boolean) as CountryOption[];
  
  const others = allCountries.filter(country => !popularCountryCodes.includes(country.code));
  
  return [...popular, ...others];
}

// Find country by calling code
export function findCountryByCode(callingCode: string): CountryOption | undefined {
  return getCountryOptions().find(country => country.code === callingCode);
}