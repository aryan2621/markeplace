"use client";

import { Input } from "@/components/ui/input";

type AppSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export function AppSearch({ value, onChange, placeholder = "Search apps..." }: AppSearchProps) {
  return (
    <div className="relative">
      <SearchIcon />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
        aria-label="Search apps by name, developer, or description"
      />
    </div>
  );
}
