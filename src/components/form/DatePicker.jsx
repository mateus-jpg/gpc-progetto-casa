"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Reusable DatePicker component adapted from your Calendar22
export default function DatePicker({
  value,
  onChange,
  label,
  required,
  fromYear = 1920,
  toYear = new Date().getFullYear(),
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor="date" className="text-sm font-medium">
        {label} {required && "*"}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-full justify-between text-left font-normal h-11"
          >
            {value ? (
              format(value, "PPP", { locale: it })
            ) : (
              <span className="text-muted-foreground">Seleziona una data</span>
            )}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
