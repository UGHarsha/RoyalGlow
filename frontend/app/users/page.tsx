"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Calendar, Scissors, Sparkles, UserCheck } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { API_BASE, jsonAuthHeaders } from "../../utils/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  bookingCount: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/api/users`, {
          headers: jsonAuthHeaders(session?.access_token),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load users");
        }
        const data = await res.json();
        setUsers(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getTier = (count: number) => {
    if (count >= 5) return { label: "Elite", color: "text-[#E8B88A]", bg: "bg-[#E8B88A]/10 border-[#E8B88A]/20" };
    if (count >= 2) return { label: "Regular", color: "text-[#C77DFF]", bg: "bg-[#C77DFF]/10 border-[#C77DFF]/20" };
    return { label: "New", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  };

  const gradients = [
    "from-[#E8B88A]/20 to-[#C77DFF]/10",
    "from-[#C77DFF]/20 to-[#E8B88A]/10",
    "from-emerald-500/10 to-[#E8B88A]/10",
    "from-sky-500/10 to-[#C77DFF]/10",
  ];

  return (
    <main className="min-h-screen bg-[#0A0A0A] font-sans pt-28 pb-20 px-6 text-stone-300 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-[#E8B88A]/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-[#C77DFF]/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B88A]/10 border border-[#E8B88A]/10 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8B88A]" />
            <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#E8B88A]">Our Community</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-serif text-white font-light mb-3"
          >
            Registered <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Members</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-stone-500 text-xs md:text-sm max-w-md mx-auto"
          >
            Our growing family of style enthusiasts. {users.length > 0 && `${users.length} members and counting.`}
          </motion.p>
        </div>

        {/* Stats bar */}
        {!loading && users.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-4 mb-10"
          >
            {[
              { label: "Total Members", value: users.length, icon: Users },
              { label: "Elite Members", value: users.filter(u => u.bookingCount >= 5).length, icon: UserCheck },
              { label: "Total Bookings", value: users.reduce((acc, u) => acc + u.bookingCount, 0), icon: Scissors },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-center">
                  <Icon className="w-4 h-4 text-[#E8B88A] mx-auto mb-2" />
                  <p className="text-xl font-serif text-white font-medium">{stat.value}</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="relative mb-8 max-w-md mx-auto"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="booking-input pl-11 !rounded-full"
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded-full w-3/4" />
                    <div className="h-2 bg-white/5 rounded-full w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full w-full mb-2" />
                <div className="h-2 bg-white/5 rounded-full w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-[#E8B88A]/5 border border-[#E8B88A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-[#E8B88A]" />
            </div>
            <p className="text-stone-400 text-sm">
              {users.length === 0 ? "No registered members yet." : "No members match your search."}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((user, idx) => {
                const tier = getTier(user.bookingCount);
                const gradient = gradients[idx % gradients.length];
                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white/[0.01] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.025] hover:border-white/10 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`} />

                    <div className="relative z-10">
                      {/* Avatar + Tier */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} border border-white/10 flex items-center justify-center text-base font-bold text-white`}>
                          {getInitials(user.name)}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-bold ${tier.color} ${tier.bg}`}>
                          {tier.label}
                        </span>
                      </div>

                      {/* Name & Email */}
                      <h3 className="text-white font-medium text-sm mb-0.5 truncate">{user.name}</h3>
                      <p className="text-stone-500 text-xs truncate font-mono">{user.email}</p>

                      {/* Divider */}
                      <div className="my-4 h-px bg-white/5" />

                      {/* Stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-stone-400">
                          <Scissors className="w-3 h-3 text-[#E8B88A]" />
                          <span className="text-xs">{user.bookingCount} booking{user.bookingCount !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-500">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px]">
                            {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
