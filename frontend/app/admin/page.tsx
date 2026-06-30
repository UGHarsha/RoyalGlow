"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { User } from "@supabase/supabase-js";
import {
  Calendar,
  Users,
  Scissors,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  TrendingUp,
  UserCheck,
} from "lucide-react";

interface Booking {
  id: string;
  customer_name: string;
  service: string;
  appointment_date: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const storedStatuses = localStorage.getItem("adminBookingStatuses");
    if (storedStatuses) {
      try {
        setStatuses(JSON.parse(storedStatuses));
      } catch (error) {
        console.error("Failed to parse statuses", error);
      }
    }

    fetchTodayBookings();
  }, []);

  const fetchTodayBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      const allBookings = data || [];
      setTotalBookings(allBookings.length);

      const today = new Date();
      setTodayBookings(
        allBookings.filter((booking: Booking) => {
          const appointmentDate = new Date(booking.appointment_date);
          return appointmentDate.toDateString() === today.toDateString();
        })
      );
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const updatedStatuses = { ...statuses, [id]: newStatus };
    setStatuses(updatedStatuses);
    localStorage.setItem("adminBookingStatuses", JSON.stringify(updatedStatuses));
  };

  const activeQueue = todayBookings.filter((booking) => {
    const status = statuses[booking.id] || "Pending";
    return status !== "Completed" && status !== "Cancelled";
  });

  const completedToday = todayBookings.filter((booking) => statuses[booking.id] === "Completed").length;

  const stats = [
    { label: "Today's Queue", value: activeQueue.length, icon: Clock, color: "text-stone-600" },
    { label: "Completed Today", value: completedToday, icon: CheckCircle, color: "text-emerald-600" },
    { label: "Total Bookings", value: totalBookings, icon: TrendingUp, color: "text-stone-600" },
    { label: "Today's Appointments", value: todayBookings.length, icon: Calendar, color: "text-stone-600" },
  ];

  const quickLinks = [
    { title: "Bookings", desc: "Manage appointments", href: "/admin/bookings", icon: Calendar },
    { title: "Customers", desc: "View client profiles", href: "/admin/customers", icon: Users },
    { title: "Registered Users", desc: "View & delete accounts", href: "/users", icon: UserCheck },
    { title: "Services", desc: "Update menu & pricing", href: "/admin/services", icon: Scissors },
    { title: "Lookbook", desc: "Manage gallery", href: "/admin/lookbook", icon: ImageIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Dashboard</p>
        <h1 className="text-2xl font-semibold text-stone-900">
          Welcome back{user ? `, ${user.email?.split("@")[0]}` : ""}
        </h1>
        <p className="text-sm text-stone-500">A quick look at today&apos;s bookings and salon activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-sm font-medium text-stone-600">{stat.label}</p>
              </div>
              <p className="mt-4 text-3xl font-semibold text-stone-900">{loadingBookings ? "–" : stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-stone-800">Today&apos;s bookings</h2>
            <span className="text-xs text-stone-500">{activeQueue.length} pending</span>
          </div>

          {loadingBookings ? (
            <div className="py-16 text-center text-sm text-stone-500">Loading bookings...</div>
          ) : activeQueue.length === 0 ? (
            <div className="py-16 text-center text-sm text-stone-500">No pending bookings for today.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {activeQueue.map((booking) => (
                <div key={booking.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-800">{booking.customer_name || "Unknown"}</p>
                    <p className="truncate text-sm text-stone-500">{booking.service || "No service"}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {new Date(booking.appointment_date).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(booking.id, "Completed")}
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => handleStatusChange(booking.id, "Cancelled")}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-800">Shortcuts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.title} href={link.href} className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-3 transition hover:bg-stone-50">
                  <Icon className="w-4 h-4 text-stone-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800">{link.title}</p>
                    <p className="truncate text-xs text-stone-500">{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}