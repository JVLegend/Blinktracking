interface SidebarInsetProps {
  children: React.ReactNode
}

export default function SidebarInset({ children }: SidebarInsetProps) {
  return (
    <div className="flex flex-col h-screen">
      {children}
    </div>
  )
} 