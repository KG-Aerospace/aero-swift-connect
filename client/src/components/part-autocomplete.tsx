import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Part {
  id: number;
  partNumber: string;
  description: string;
  normalized?: string;
}

interface PartAutocompleteProps {
  partNumber: string;
  description: string;
  onPartNumberChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  className?: string;
}

export function PartAutocomplete({
  partNumber,
  description,
  onPartNumberChange,
  onDescriptionChange,
  className
}: PartAutocompleteProps) {
  const [partNumberQuery, setPartNumberQuery] = useState(partNumber);
  const [descriptionQuery, setDescriptionQuery] = useState(description);
  const [showPartNumberSuggestions, setShowPartNumberSuggestions] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const partNumberRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  // Search parts by part number
  const { data: partNumberResults = [] } = useQuery<Part[]>({
    queryKey: ['/api/parts/search', partNumberQuery],
    queryFn: async () => {
      if (!partNumberQuery || partNumberQuery.length < 2) return [];
      const res = await fetch(`/api/parts/search?q=${encodeURIComponent(partNumberQuery)}`);
      return res.json();
    },
    enabled: partNumberQuery.length >= 2,
  });

  // Search parts by description
  const { data: descriptionResults = [] } = useQuery<Part[]>({
    queryKey: ['/api/parts/search', descriptionQuery],
    queryFn: async () => {
      if (!descriptionQuery || descriptionQuery.length < 2) return [];
      const res = await fetch(`/api/parts/search?q=${encodeURIComponent(descriptionQuery)}`);
      return res.json();
    },
    enabled: descriptionQuery.length >= 2,
  });

  useEffect(() => {
    setPartNumberQuery(partNumber);
  }, [partNumber]);

  useEffect(() => {
    setDescriptionQuery(description);
  }, [description]);

  const handlePartNumberSelect = (part: Part) => {
    onPartNumberChange(part.partNumber);
    onDescriptionChange(part.description);
    setPartNumberQuery(part.partNumber);
    setDescriptionQuery(part.description);
    setShowPartNumberSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleDescriptionSelect = (part: Part) => {
    onPartNumberChange(part.partNumber);
    onDescriptionChange(part.description);
    setPartNumberQuery(part.partNumber);
    setDescriptionQuery(part.description);
    setShowDescriptionSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent, isPartNumber: boolean) => {
    const suggestions = isPartNumber ? partNumberResults : descriptionResults;
    const showSuggestions = isPartNumber ? showPartNumberSuggestions : showDescriptionSuggestions;
    
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      if (isPartNumber) {
        handlePartNumberSelect(selected);
      } else {
        handleDescriptionSelect(selected);
      }
    } else if (e.key === 'Escape') {
      setShowPartNumberSuggestions(false);
      setShowDescriptionSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}>
      {/* Part Number Field */}
      <div className="relative">
        <div className="space-y-1">
          <Label className="text-xs">Part Number</Label>
          <Input
            ref={partNumberRef}
            value={partNumberQuery}
            onChange={(e) => {
              const value = e.target.value;
              setPartNumberQuery(value);
              onPartNumberChange(value);
              setShowPartNumberSuggestions(value.length >= 2);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowPartNumberSuggestions(partNumberQuery.length >= 2 && partNumberResults.length > 0)}
            onBlur={() => setTimeout(() => setShowPartNumberSuggestions(false), 200)}
            onKeyDown={(e) => handleKeyDown(e, true)}
            placeholder="Enter part number"
            autoComplete="off"
          />
        </div>
        
        {showPartNumberSuggestions && partNumberResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {partNumberResults.map((part, index) => (
              <div
                key={part.id}
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-gray-100",
                  selectedIndex === index && "bg-gray-100"
                )}
                onMouseDown={() => handlePartNumberSelect(part)}
              >
                <div className="font-medium text-sm">{part.partNumber}</div>
                <div className="text-xs text-gray-600">{part.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description Field */}
      <div className="relative">
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input
            ref={descriptionRef}
            value={descriptionQuery}
            onChange={(e) => {
              const value = e.target.value;
              setDescriptionQuery(value);
              onDescriptionChange(value);
              setShowDescriptionSuggestions(value.length >= 2);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowDescriptionSuggestions(descriptionQuery.length >= 2 && descriptionResults.length > 0)}
            onBlur={() => setTimeout(() => setShowDescriptionSuggestions(false), 200)}
            onKeyDown={(e) => handleKeyDown(e, false)}
            placeholder="Enter description"
            autoComplete="off"
          />
        </div>
        
        {showDescriptionSuggestions && descriptionResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {descriptionResults.map((part, index) => (
              <div
                key={part.id}
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-gray-100",
                  selectedIndex === index && "bg-gray-100"
                )}
                onMouseDown={() => handleDescriptionSelect(part)}
              >
                <div className="text-xs text-gray-600">{part.partNumber}</div>
                <div className="font-medium text-sm">{part.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}