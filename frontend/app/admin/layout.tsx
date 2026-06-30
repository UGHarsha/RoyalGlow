"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { User } from "@supabase/supabase-js";
import {
    LogOut,
    LayoutDashboard,
    Users,
    Calendar,
    Scissors,
    Image as ImageIcon,
    ArrowLeft,
} from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Bookings", href: "/admin/bookings", icon: Calendar },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Services", href: "/admin/services", icon: Scissors },
    { name: "Lookbook", href: "/admin/lookbook", icon: ImageIcon },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const isActive = (href: string) => {
        if (href === "/admin") return pathname === "/admin";
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link href="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm">Back to site</span>
                        </Link>
                        <div className="h-5 w-px bg-stone-200" />
                        <div className="min-w-0">
                            <h1 className="text-sm font-semibold text-stone-900">Admin Panel</h1>
                            <p className="text-xs text-stone-500">Simple salon management tools</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="truncate text-sm font-medium text-stone-700" style={{ maxWidth: 220 }}>
                                {user?.email || "Loading..."}
                            </p>
                            <p className="text-xs text-stone-500">Administrator</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition hover:bg-stone-100"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex max-w-7xl">
                <aside className="hidden lg:block w-56 shrink-0 border-r border-stone-200 bg-white">
                    <nav className="p-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active
                                        ? "bg-stone-900 text-white"
                                        : "text-stone-600 hover:bg-stone-100"
                                        }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">
                    <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm transition ${active
                                        ? "border-stone-900 bg-stone-900 text-white"
                                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {children}
                </main>
            </div>
        </div>
    );
}
