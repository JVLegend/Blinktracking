"use client"

import { MainNav } from "@/app/components/main-nav"

export function AppSidebar() {
  return (
    <aside className="hidden lg:block">
      <div className="h-full border-r bg-background px-4 py-6">
        <MainNav />
      </div>
    </aside>
  )
}
