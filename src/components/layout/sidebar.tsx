"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

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
  { name: "Usuarios", href: "/users", icon: UserCog, adminOnly: true },
  { name: "Configuracoes", href: "/settings", icon: Settings },
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
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Peladeiros</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-4 px-2 space-y-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "text-green-600"
                    : "text-gray-400"
                )}
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Peladeiros</span>
            </div>
          </div>
          <nav className="flex-1 mt-4 px-2 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "text-green-600"
                      : "text-gray-400"
                  )}
                />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
