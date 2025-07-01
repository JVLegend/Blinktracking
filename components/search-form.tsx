"use client"

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SearchForm() {
  return (
    <div className="px-2">
      <Label htmlFor="search" className="sr-only">
        Buscar
      </Label>
      <Input
        id="search"
        placeholder="Buscar..."
        className="h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      />
    </div>
  );
}
