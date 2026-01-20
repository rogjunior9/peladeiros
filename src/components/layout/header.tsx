"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getPlayerTypeLabel } from "@/lib/utils";
import { NotificationsPopover } from "@/components/layout/notifications-popover";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenuClick}
          className="text-zinc-400 hover:text-white lg:hidden transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex-1 lg:flex-none" />

        <div className="flex items-center space-x-6">

          <NotificationsPopover />

          {session?.user?.role === "ADMIN" && (
            <Badge className="hidden sm:inline-flex bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 uppercase tracking-widest font-display text-[10px]">
              Administrador
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/10 hover:border-accent/50 transition-colors">
                <Avatar>
                  <AvatarImage
                    src={session?.user?.image || ""}
                    alt={session?.user?.name || ""}
                  />
                  <AvatarFallback className="bg-zinc-900 text-zinc-400 font-bold">
                    {getInitials(session?.user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-white">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold font-display uppercase tracking-wide text-white">{session?.user?.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {session?.user?.email}
                  </p>
                  <p className="text-[10px] text-accent font-mono uppercase tracking-widest mt-1">
                    {getPlayerTypeLabel(session?.user?.playerType || "CASUAL")}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild className="focus:bg-white/5 focus:text-white cursor-pointer">
                <a href="/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-zinc-400" />
                  Meu Perfil
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-red-500 focus:text-red-400 focus:bg-red-950/20 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
