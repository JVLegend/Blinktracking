"use client";

import { Sidebar } from "@/app/components/sidebar";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarInset({ className, children }: React.PropsWithChildren<SidebarProps>) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:block fixed h-screen w-72 z-30">
        <Sidebar />
      </aside>
      <div className="flex-1 lg:pl-72">
        {children}
      </div>
    </div>
  );
}
