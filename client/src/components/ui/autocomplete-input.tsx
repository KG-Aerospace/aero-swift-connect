import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onValueChange?: (value: string) => void;
}

export function AutocompleteInput({ 
  suggestions, 
  onValueChange,
  value,
  onChange,
  className,
  ...props 
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to safely convert value to string
  const getStringValue = (val: any): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null) {
      // Try common object properties
      if (val.type) return val.type;
      if (val.name) return val.name;
      if (val.value) return val.value;
      if (val.label) return val.label;
      // If it's an array, take the first element
      if (Array.isArray(val) && val.length > 0) return String(val[0]);
      // Try to get the first property value
      const values = Object.values(val);
      if (values.length > 0) return String(values[0]);
    }
    return String(val);
  };

  useEffect(() => {
    const inputValue = getStringValue(value).toLowerCase();
    if (inputValue.length > 0 && suggestions.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(inputValue)
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredSuggestions(filtered);
      // Don't automatically show dropdown on value change - only on focus or input
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(newValue);
    setSelectedIndex(-1);
    
    // Only show dropdown if input has text and is focused
    if (newValue.length > 0 && suggestions.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(newValue.toLowerCase())
      ).slice(0, 10);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    // Update the input value immediately
    if (inputRef.current) {
      inputRef.current.value = suggestion;
    }
    
    // Call both callbacks
    if (onValueChange) onValueChange(suggestion);
    if (onChange) {
      const event = {
        target: { value: suggestion }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
    
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Delay blur to ensure value is set
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, 50);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={getStringValue(value)}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          const inputValue = getStringValue(value).toLowerCase();
          if (inputValue.length > 0 && filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          // Delay closing to allow for clicks on dropdown items
          setTimeout(() => setIsOpen(false), 100);
        }}
        className={className}
        {...props}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={cn(
                "px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100",
                selectedIndex === index && "bg-gray-100 dark:bg-gray-700"
              )}
              onMouseDown={(e) => {
                // Prevent blur event from firing before click
                e.preventDefault();
                selectSuggestion(suggestion);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}