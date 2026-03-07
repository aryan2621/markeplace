"use client";

import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/models";

type CategoryFilterProps = {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <Button
        variant={selectedId === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(null)}
      >
        All
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedId === cat.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(selectedId === cat.id ? null : cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  );
}
