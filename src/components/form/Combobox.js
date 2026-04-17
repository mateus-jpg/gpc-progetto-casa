"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "../ui/scroll-area";

/**
 * Common popover content styling and behavior
 */
const PopoverContent = memo(function PopoverContent({ children }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="p-0 w-full z-50 max-h-100 border rounded-lg mt-0.5"
        align="start"
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
});

/**
 * Selected tags display for multi-select components
 */
const SelectedTags = memo(function SelectedTags({ values, onRemove }) {
  if (values.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {values.map((val) => (
        <span
          key={val}
          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
        >
          {val}
          <button
            onClick={() => onRemove(val)}
            className="ml-1 text-blue-600 hover:text-blue-800"
            type="button"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
});

/**
 * Helper to truncate display text
 */
function truncateText(text, maxLength = 50) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

/**
 * Helper to generate display text for multi-select
 */
function getMultiDisplayText(values, placeholder) {
  if (values.length === 0) return placeholder;
  if (values.length <= 2) return values.join(", ");
  return `${values.slice(0, 2).join(", ")} +${values.length - 2} altri`;
}

// A reusable Combobox with "create" functionality
export const CreateCombobox = memo(function CreateCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(options);
  const [searchQuery, setSearchQuery] = useState("");

  // Memoize filtered items to prevent recalculation on every render
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [items, searchQuery],
  );

  const isNewItem = useMemo(
    () =>
      searchQuery.length > 0 &&
      !items.some((item) => item.toLowerCase() === searchQuery.toLowerCase()),
    [items, searchQuery],
  );

  useEffect(() => {
    setItems(options);
  }, [options]);

  const handleSelect = useCallback(
    (selectedItem) => {
      onChange(selectedItem);
      setSearchQuery("");
      setOpen(false);
    },
    [onChange],
  );

  const handleCreate = useCallback(() => {
    const newItem = searchQuery.trim();
    if (!newItem) return;
    setItems((prev) => [...prev, newItem]);
    onChange(newItem);
    setSearchQuery("");
    setOpen(false);
  }, [searchQuery, onChange]);

  const handleOpenChange = useCallback((isOpen) => {
    setOpen(isOpen);
    if (!isOpen) setSearchQuery("");
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between w-full overflow-hidden text-ellipsis whitespace-nowrap"
          >
            <span className="truncate">
              {value ? truncateText(value) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Cerca o aggiungi ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <ScrollArea
              className={"[&>[data-radix-scroll-area-viewport]]:max-h-100"}
            >
              <CommandGroup>
                {filteredItems.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => handleSelect(opt)}
                  >
                    {opt}
                  </CommandItem>
                ))}
                {isNewItem && (
                  <CommandItem
                    key={searchQuery}
                    value={searchQuery}
                    onSelect={handleCreate}
                    className="text-primary"
                  >
                    + Aggiungi nuova voce "{searchQuery}"
                  </CommandItem>
                )}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

// A reusable Multi-Select Combobox with "create" functionality
export const CreateMultiCombobox = memo(function CreateMultiCombobox({
  label,
  values = [],
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(options);
  const [searchQuery, setSearchQuery] = useState("");

  // Memoize filtered items
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [items, searchQuery],
  );

  const isNewItem = useMemo(
    () =>
      searchQuery.length > 0 &&
      !items.some((item) => item.toLowerCase() === searchQuery.toLowerCase()),
    [items, searchQuery],
  );

  const displayText = useMemo(
    () => getMultiDisplayText(values, placeholder),
    [values, placeholder],
  );

  useEffect(() => {
    setItems(options);
  }, [options]);

  const toggleValue = useCallback(
    (val) => {
      if (values.includes(val)) {
        onChange(values.filter((v) => v !== val));
      } else {
        onChange([...values, val]);
      }
      setSearchQuery("");
    },
    [values, onChange],
  );

  const handleCreate = useCallback(() => {
    const newItem = searchQuery.trim();
    if (!newItem) return;
    setItems((prev) => [...prev, newItem]);
    onChange([...values, newItem]);
    setSearchQuery("");
  }, [searchQuery, values, onChange]);

  const handleOpenChange = useCallback((isOpen) => {
    setOpen(isOpen);
    if (!isOpen) setSearchQuery("");
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between overflow-hidden text-ellipsis whitespace-nowrap"
          >
            <span className="truncate">{displayText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Cerca o aggiungi ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <ScrollArea
              className={"[&>[data-radix-scroll-area-viewport]]:max-h-90"}
            >
              <CommandGroup>
                {filteredItems.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => toggleValue(opt)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center w-full">
                      <input
                        type="checkbox"
                        checked={values.includes(opt)}
                        readOnly
                        className="mr-2 h-4 w-4"
                      />
                      <span>{opt}</span>
                    </div>
                  </CommandItem>
                ))}
                {isNewItem && (
                  <CommandItem
                    key={searchQuery}
                    value={searchQuery}
                    onSelect={handleCreate}
                    onMouseDown={(e) => e.preventDefault()}
                    className="text-primary cursor-pointer"
                  >
                    + Aggiungi nuova voce "{searchQuery}"
                  </CommandItem>
                )}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
      <SelectedTags values={values} onRemove={toggleValue} />
    </div>
  );
});

// Simple Combobox component (read-only options)
export const Combobox = memo(function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [options, searchQuery],
  );

  const handleSelect = useCallback(
    (opt) => {
      onChange(opt);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between w-full overflow-hidden text-ellipsis whitespace-nowrap"
          >
            <span className="truncate">
              {value ? truncateText(value) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Cerca ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <ScrollArea
              className={"[&>[data-radix-scroll-area-viewport]]:max-h-100"}
            >
              <CommandGroup>
                {filteredOptions.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => handleSelect(opt)}
                  >
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

// Simple MultiCombobox component (read-only options)
export const MultiCombobox = memo(function MultiCombobox({
  label,
  values = [],
  onChange,
  options,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [options, searchQuery],
  );

  const displayText = useMemo(
    () => getMultiDisplayText(values, placeholder),
    [values, placeholder],
  );

  const toggleValue = useCallback(
    (val) => {
      if (values.includes(val)) {
        onChange(values.filter((v) => v !== val));
      } else {
        onChange([...values, val]);
      }
    },
    [values, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover open={open} modal={false} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full overflow-hidden text-ellipsis whitespace-nowrap"
          >
            <span className="truncate">{displayText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Cerca ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <ScrollArea
              className={"[&>[data-radix-scroll-area-viewport]]:max-h-100"}
            >
              <CommandGroup>
                {filteredOptions.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => toggleValue(opt)}
                    onMouseDown={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center w-full">
                      <input
                        type="checkbox"
                        checked={values.includes(opt)}
                        readOnly
                        className="mr-2 h-4 w-4"
                      />
                      <span>{opt}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
      <SelectedTags values={values} onRemove={toggleValue} />
    </div>
  );
});
