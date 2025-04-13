import React from "react";
import { cn } from "@/lib/utils";

interface SelectionCardProps {
  id: string;
  title: string;
  description: string;
  tips?: string[];
  example?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

const SelectionCard: React.FC<SelectionCardProps> = ({
  id,
  title,
  description,
  tips,
  example,
  icon,
  iconColor = "text-primary",
  selected,
  onSelect,
  className,
}) => {
  return (
    <div
      className={cn(
        "group relative border rounded-lg transition-all duration-200 cursor-pointer overflow-hidden",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-gray-200 bg-gray-50 hover:bg-gray-100",
        className
      )}
      onClick={onSelect}
      data-selected={selected}
    >
      {/* Selected checkmark badge */}
      {selected && (
        <div className="absolute top-3 right-3 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start">
          {icon && (
            <div className={cn("mr-3 flex-shrink-0 mt-1", iconColor)}>
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>
        
        {/* Examples and tips section removed as requested */}
      </div>
    </div>
  );
};

export default SelectionCard;