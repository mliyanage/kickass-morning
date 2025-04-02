import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DaySelectorGridProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}

export function DaySelectorGrid({ selectedDays, onChange }: DaySelectorGridProps) {
  const days = [
    { key: 'sun', label: 'S', full: 'Sunday' },
    { key: 'mon', label: 'M', full: 'Monday' },
    { key: 'tue', label: 'T', full: 'Tuesday' },
    { key: 'wed', label: 'W', full: 'Wednesday' },
    { key: 'thu', label: 'T', full: 'Thursday' },
    { key: 'fri', label: 'F', full: 'Friday' },
    { key: 'sat', label: 'S', full: 'Saturday' },
  ];

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  const selectAllDays = () => {
    onChange(days.map(day => day.key));
  };

  const clearAllDays = () => {
    onChange([]);
  };

  const isAllSelected = useMemo(() => {
    return days.every(day => selectedDays.includes(day.key));
  }, [selectedDays]);

  const isNoneSelected = useMemo(() => {
    return selectedDays.length === 0;
  }, [selectedDays]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Days of the Week</h3>
        <div>
          <Button 
            type="button" 
            variant="link" 
            size="sm" 
            className="text-xs text-primary-600 hover:text-primary-500 font-medium"
            onClick={selectAllDays}
            disabled={isAllSelected}
          >
            Select All
          </Button>
          <span className="text-neutral-300 mx-1">|</span>
          <Button 
            type="button" 
            variant="link" 
            size="sm" 
            className="text-xs text-primary-600 hover:text-primary-500 font-medium"
            onClick={clearAllDays}
            disabled={isNoneSelected}
          >
            Clear All
          </Button>
        </div>
      </div>
      
      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.key}>
            <div className="hidden">
              <Checkbox
                id={`day-${day.key}`}
                checked={selectedDays.includes(day.key)}
                onCheckedChange={() => handleDayToggle(day.key)}
              />
            </div>
            <div
              className={`flex flex-col items-center justify-center rounded-md border ${
                selectedDays.includes(day.key)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:bg-neutral-50'
              } p-2 cursor-pointer`}
              onClick={() => handleDayToggle(day.key)}
            >
              <span className="block text-xs font-medium text-neutral-700" title={day.full}>
                {day.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DaySelectorGrid;
