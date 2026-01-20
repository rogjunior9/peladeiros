"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Settings,
  X,
  Receipt,
  UserCog,
  User,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPlayerTypeLabel } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Peladas", href: "/games", icon: Calendar },
  { name: "Jogadores", href: "/players", icon: Users },
  { name: "Locais", href: "/venues", icon: MapPin, adminOnly: true },
  { name: "Financeiro", href: "/finance", icon: DollarSign },
  { name: "Pagamentos", href: "/payments", icon: Receipt },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-white/10 transform transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shadow-[0_0_10px_rgba(197,160,89,0.3)]">
              <span className="text-black font-display font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-display font-bold text-white uppercase tracking-wider">Peladeiros</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                )}
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 transition-colors",
                    isActive ? "text-accent" : "text-zinc-500 group-hover:text-white"
                  )}
                />
                <span className="font-display uppercase tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-black border-r border-white/10">
          <div className="flex items-center h-20 px-6 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center shadow-[0_0_15px_rgba(197,160,89,0.4)]">
                <span className="text-black font-display font-bold text-xl">P</span>
              </div>
              <span className="text-xl font-display font-bold text-white uppercase tracking-wider">Peladeiros</span>
            </div>
          </div>
          <nav className="flex-1 mt-8 px-4 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative overflow-hidden",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                  )}
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      isActive ? "text-accent" : "text-zinc-500 group-hover:text-white"
                    )}
                  />
                  <span className="font-display uppercase tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info Mini Footer */}
          {session?.user && (
            <div className="p-4 border-t border-white/5 bg-zinc-950/30">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full text-left hover:bg-white/5 p-2 rounded-lg transition-colors outline-none">
                    <Avatar className="h-9 w-9 border border-zinc-800">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-500 font-bold text-xs">
                        {session.user.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden flex-1">
                      <p className="text-white text-xs font-bold truncate">{session.user.name}</p>
                      <p className="text-zinc-500 text-[10px] truncate">{session.user.email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-white mb-2 ml-4">
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
                    <Link href="/settings" className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-zinc-400" />
                      Meu Perfil
                    </Link>
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
          )}
        </div>
      </div>
    </>
  );
}
