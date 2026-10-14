import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  Check,
  Plus,
  X,
  School,
  HeartPulse,
  Building2,
  Train,
  Utensils,
  ShoppingBag,
  Sparkles,
  Landmark,
  Trees,
  AlertTriangle,
  Factory,
  Compass,
} from 'lucide-react';

export interface CategoryGroup {
  name: string;
  icon: typeof School;
  items: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: 'Education & Academics',
    icon: School,
    items: [
      'School',
      'High School',
      'College / Degree College',
      'Engineering / Polytechnic College',
      'University',
      'Coaching & Tuition Center',
      'Library & Study Hall',
      'Kindergarten & Daycare',
      'Vocational Training Center',
      'Research Institute',
    ],
  },
  {
    name: 'Healthcare & Medical',
    icon: HeartPulse,
    items: [
      'Hospital',
      'Government Hospital / PHC',
      'Clinic & Dispensary',
      'Pharmacy / Chemist',
      'Diagnostic & Pathology Lab',
      'Dental Clinic',
      'Eye Care / Optometrist',
      'Veterinary Clinic',
      'Ayurvedic & Homeopathy Center',
      'Blood Bank',
    ],
  },
  {
    name: 'Public & Government Institutions',
    icon: Building2,
    items: [
      'Police Station',
      'Fire Station',
      'Post Office',
      'Municipal Corporation / Nagar Palika',
      'Panchayat Office',
      'Court / Legal Office',
      'Bank Branch',
      'ATM',
      'Electricity (MSEDCL) Office',
      'Water Supply Office',
      'Community Center / Samaj Mandir',
    ],
  },
  {
    name: 'Transit & Transportation',
    icon: Train,
    items: [
      'Railway Station',
      'Bus Station / Stand',
      'Bus Stop',
      'Auto Rickshaw Stand',
      'Taxi / Cab Stand',
      'Petrol Pump / Fuel Station',
      'CNG Pump',
      'EV Charging Station',
      'Parking Lot',
      'Metro Station',
      'Toll Plaza',
    ],
  },
  {
    name: 'Food, Dining & Hospitality',
    icon: Utensils,
    items: [
      'Restaurant',
      'Cafe & Coffee Shop',
      'Fast Food & Snacks',
      'Street Food Vendor',
      'Bakery & Cake Shop',
      'Sweet Shop (Mithai)',
      'Dhaba',
      'Hotel & Lodging',
      'Bar & Pub',
      'Banquet & Marriage Hall',
    ],
  },
  {
    name: 'Commerce, Retail & Markets',
    icon: ShoppingBag,
    items: [
      'Shopping Mall',
      'Supermarket / D-Mart',
      'Grocery Store (Kirana)',
      'Electronics & Mobile Store',
      'Clothing & Garment Shop',
      'Footwear Store',
      'Jewellery Shop',
      'Hardware & Sanitary Store',
      'Vegetable & Fruit Market',
      'Fish & Meat Market',
      'Stationery & Book Store',
      'Shop',
    ],
  },
  {
    name: 'Personal & Professional Services',
    icon: Sparkles,
    items: [
      'Salon & Beauty Parlour',
      'Barber Shop',
      'Gym & Fitness Center',
      'Automobile Garage & Repair',
      'Puncture & Tyre Repair',
      'Laundry & Dry Cleaners',
      'Xerox & Printing Center',
      'Courier & Parcel Office',
      'Tailor & Boutique',
      'Photography Studio',
    ],
  },
  {
    name: 'Places of Worship & Faith',
    icon: Landmark,
    items: [
      'Temple (Mandir)',
      'Mosque (Masjid)',
      'Church',
      'Gurudwara',
      'Jain Temple (Derasar)',
      'Ashram / Spiritual Center',
      'Crematorium (Shamshan)',
      'Cemetery (Kabristan)',
    ],
  },
  {
    name: 'Parks, Nature & Tourism',
    icon: Trees,
    items: [
      'Landmark',
      'Public Park & Garden',
      'Playground & Sports Complex',
      'Lake / Talao / Waterbody',
      'Beach & Seashore',
      'Tourist Attraction / Viewpoint',
      'Cinema / Theatre',
      'Swimming Pool',
    ],
  },
  {
    name: 'Civic & Road Issues',
    icon: AlertTriangle,
    items: [
      'Road Issue',
      'Road Issue / Pothole',
      'Hazard',
      'Hazard / Danger Point',
      'Broken Streetlight',
      'Water Leakage / Drainage Issue',
      'Garbage Dump / Waste Pile',
      'Stray Animal Alert',
    ],
  },
  {
    name: 'Residential & Industry',
    icon: Factory,
    items: [
      'Residential Society / Colony',
      'Apartment Complex',
      'Industrial Unit / MIDC Factory',
      'Warehouse & Godown',
      'Corporate Office / IT Park',
      'Other',
    ],
  },
];

// Quick popular chips for 1-tap fast tagging
export const POPULAR_CATEGORIES = [
  'School',
  'Hospital',
  'Restaurant',
  'Shop',
  'Bank',
  'ATM',
  'Railway Station',
  'Road Issue',
  'Landmark',
  'Temple (Mandir)',
];

export interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  testId?: string;
  placeholder?: string;
  className?: string;
}

export function CategoryCombobox({
  value,
  onChange,
  required = true,
  id,
  testId = 'select-pin-category',
  placeholder = 'Search institution, place or type custom...',
  className = '',
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal query state with external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter categories based on search query
  const filteredGroups = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return CATEGORY_GROUPS;

    return CATEGORY_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.toLowerCase().includes(trimmed)),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  // Check if typed query exactly matches any existing category
  const hasExactMatch = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return true;
    for (const group of CATEGORY_GROUPS) {
      for (const item of group.items) {
        if (item.toLowerCase() === trimmed) return true;
      }
    }
    return false;
  }, [query]);

  const handleSelect = (category: string) => {
    onChange(category);
    setQuery(category);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        handleSelect(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Combobox Input with Search & Dropdown Icons */}
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-[#708079]">
          <Search size={15} />
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          data-testid={testId}
          autoComplete="off"
          className="w-full rounded-xl border border-[#c4d0c6] bg-[#fffdf4] py-2.5 pl-9 pr-16 text-xs sm:text-sm font-semibold text-[#172a3a] outline-none transition focus:border-[#2d6b60] focus:bg-white focus:ring-2 focus:ring-[#2d6b60]/20"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onChange('');
                inputRef.current?.focus();
              }}
              className="rounded-full p-1 text-[#8b9b94] hover:bg-[#e8ede6] hover:text-[#243f48] transition"
              title="Clear category"
              aria-label="Clear category"
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="rounded-lg p-1 text-[#6b7d76] hover:bg-[#e8ede6] hover:text-[#243f48] transition"
            title="Browse all categories"
            aria-label="Browse all categories"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Quick 1-Tap Popular Category Chips */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {POPULAR_CATEGORIES.slice(0, 5).map((pop) => (
          <button
            key={pop}
            type="button"
            onClick={() => handleSelect(pop)}
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${
              value === pop
                ? 'bg-[#2d6b60] text-white shadow-xs'
                : 'bg-[#edf3ec] text-[#345c52] hover:bg-[#e0ece0] border border-[#d2dfd4]'
            }`}
          >
            {pop}
          </button>
        ))}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-[#c5d0c6] bg-[#fffdf4] p-2 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95">
          {/* Custom Typed Category Option if not an exact match */}
          {query.trim() && !hasExactMatch && (
            <div className="mb-2 border-b border-[#e5ece3] pb-2">
              <button
                type="button"
                onClick={() => handleSelect(query.trim())}
                className="flex w-full items-center justify-between rounded-lg bg-[#e2ede6] p-2 text-left text-xs font-bold text-[#1f4a43] hover:bg-[#d6e5dc] transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#2d6b60] text-white">
                    <Plus size={14} />
                  </span>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-[#456b5f] block">
                      Use custom typed category
                    </span>
                    <span className="text-xs font-extrabold text-[#172a3a]">
                      &ldquo;{query.trim()}&rdquo;
                    </span>
                  </div>
                </div>
                <span className="rounded bg-[#2d6b60] px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
                  Select
                </span>
              </button>
            </div>
          )}

          {/* Grouped Categories */}
          {filteredGroups.length === 0 ? (
            <div className="p-3 text-center text-xs text-[#708079]">
              No predefined categories match &ldquo;{query}&rdquo;.
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => handleSelect(query.trim())}
                  className="font-bold text-[#2d6b60] underline"
                >
                  Click here to save &ldquo;{query.trim()}&rdquo; as a custom category
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGroups.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.name} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#637d73]">
                      <GroupIcon size={12} className="text-[#2d6b60]" />
                      <span>{group.name}</span>
                      <span className="ml-auto font-mono text-[9px] text-[#8ea49c]">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {group.items.map((item) => {
                        const isSelected = value === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-[#2d6b60] text-[#fff8ee] shadow-xs'
                                : 'text-[#243f48] hover:bg-[#ede8db]'
                            }`}
                          >
                            <span className="truncate">{item}</span>
                            {isSelected && (
                              <Check size={13} className="ml-1 shrink-0 text-[#fff8ee]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
