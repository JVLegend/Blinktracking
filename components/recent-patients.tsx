import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function RecentPatients() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/01.png" alt="Avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">João Silva</p>
          <p className="text-sm text-muted-foreground">
            Análise realizada em 12/03/2024
          </p>
        </div>
      </div>
      
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/02.png" alt="Avatar" />
          <AvatarFallback>MS</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Maria Santos</p>
          <p className="text-sm text-muted-foreground">
            Análise realizada em 11/03/2024
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/03.png" alt="Avatar" />
          <AvatarFallback>PO</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Pedro Oliveira</p>
          <p className="text-sm text-muted-foreground">
            Análise realizada em 10/03/2024
          </p>
        </div>
      </div>
    </div>
  )
}
