"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import { User as UserIcon, Mail, LogOut, Calendar, Clock, ArrowLeft, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface Booking {
  id: string;
  customer_name: string;
  service: string;
  appointment_date: string;
  created_at: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);
      fetchBookings(supabase, session.user.id);
    };

    checkAuthAndFetchInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchBookings = async (supabase: SupabaseClient, userId: string) => {
    try {
      const missingUserIdColumn = (message?: string) => {
        const msg = (message || "").toLowerCase();
        return msg.includes("user_id") && (msg.includes("schema cache") || msg.includes("does not exist"));
      };

      let { data, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userId)
        .order("appointment_date", { ascending: false });

      if (fetchError && missingUserIdColumn(fetchError.message)) {
        ({ data, error: fetchError } = await supabase
          .from("bookings")
          .select("*")
          .order("appointment_date", { ascending: false }));
      }

      if (fetchError) setError(fetchError.message);
      else setBookings(data || []);
    } catch (err) {
      setError("Failed to fetch bookings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const upcomingBookings = bookings.filter(b => new Date(b.appointment_date) >= new Date());
  const pastBookings = bookings.filter(b => new Date(b.appointment_date) < new Date());

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#3E2723]">

      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/salon-booking.png" alt="Salon Background" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1210]/80 via-[#1A1210]/60 to-[#FDFBF7]" />
        </div>

        <div className="relative z-10 pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-6"
          >
            <Sparkles className="w-3 h-3 text-[#C69C6D]" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-white/80 font-semibold">Your Schedule</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif text-white mb-4"
          >
            My <span className="gradient-text italic">Appointments</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-white/50 max-w-md mx-auto text-sm font-light leading-relaxed"
          >
            Manage your upcoming visits and review your past experiences at Royal Glow.
          </motion.p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-10 relative z-20 pb-16">

        {/* Profile Card */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl border border-stone-100 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.08)] p-8 mb-10 relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#C69C6D]/[0.04] rounded-full blur-[60px]" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#C69C6D]/[0.03] rounded-full blur-[40px]" />
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-[#C69C6D] to-[#A0735B] rounded-2xl flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(198,156,109,0.4)] rotate-3 hover:rotate-0 transition-transform duration-500">
                  <UserIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400 font-bold mb-1">Welcome Back</p>
                  <h2 className="text-2xl font-serif text-[#3E2723]">
                    {user.user_metadata?.full_name || "Customer"}
                  </h2>
                  <p className="text-stone-400 text-sm flex items-center gap-2 mt-1">
                    <Mail className="w-3.5 h-3.5 text-[#C69C6D]" />
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Stats pills */}
                <div className="hidden md:flex items-center gap-2">
                  <div className="px-4 py-2 rounded-full bg-[#FDFBF7] border border-stone-100 text-center">
                    <p className="text-lg font-serif text-[#C69C6D]">{upcomingBookings.length}</p>
                    <p className="text-[8px] uppercase tracking-[0.15em] text-stone-400 font-bold">Upcoming</p>
                  </div>
                  <div className="px-4 py-2 rounded-full bg-[#FDFBF7] border border-stone-100 text-center">
                    <p className="text-lg font-serif text-stone-400">{pastBookings.length}</p>
                    <p className="text-[8px] uppercase tracking-[0.15em] text-stone-400 font-bold">Past</p>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 px-5 py-3 rounded-full border border-stone-200 text-stone-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all duration-300 text-[10px] font-bold tracking-[0.15em] uppercase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 p-8 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="space-y-3 flex-1">
                    <div className="h-5 bg-stone-100 rounded-full w-48" />
                    <div className="h-3 bg-stone-50 rounded-full w-32" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-10 w-24 bg-stone-50 rounded-xl" />
                    <div className="h-10 w-16 bg-stone-50 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-100 text-red-500 px-8 py-5 text-center text-sm rounded-2xl mb-8 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            {error}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && bookings.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer-bg" />
            <div className="relative z-10">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[#C69C6D]/20 to-[#C69C6D]/5 rounded-3xl flex items-center justify-center rotate-6">
                  <Calendar className="w-10 h-10 text-[#C69C6D]" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#C69C6D] to-[#A0735B] rounded-xl flex items-center justify-center shadow-lg animate-bounce">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-serif text-[#3E2723] mb-3">No Appointments <span className="gradient-text">Yet</span></h3>
              <p className="text-stone-400 text-sm mb-10 max-w-xs mx-auto leading-relaxed">
                Book your first visit and experience the luxury of Royal Glow Salon.
              </p>
              <Link href="/?book=true"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#C69C6D] to-[#B38759] text-white px-8 py-4 rounded-full tracking-[0.15em] uppercase text-xs font-bold hover:shadow-[0_0_40px_rgba(198,156,109,0.35)] transition-all duration-500 hover:scale-105 active:scale-95 group"
              >
                Book Your First Visit
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Bookings List */}
        {!loading && bookings.length > 0 && (
          <div className="space-y-10">
            {/* Upcoming */}
            {upcomingBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.4)]" />
                  <h3 className="text-xs font-bold text-[#3E2723] uppercase tracking-[0.2em]">Upcoming Appointments</h3>
                  <span className="ml-auto px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-bold tracking-wider">{upcomingBookings.length}</span>
                </div>
                <div className="space-y-4">
                  {upcomingBookings.map((booking, idx) => (
                    <motion.div key={booking.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl border border-stone-100 p-6 md:p-8 hover:shadow-[0_20px_60px_-20px_rgba(198,156,109,0.15)] hover:border-[#C69C6D]/20 transition-all duration-500 group relative overflow-hidden"
                    >
                      {/* Accent bar */}
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#C69C6D] to-[#A0735B] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C69C6D]/10 to-[#C69C6D]/5 flex items-center justify-center shrink-0 group-hover:from-[#C69C6D] group-hover:to-[#A0735B] transition-all duration-500">
                            <Sparkles className="w-5 h-5 text-[#C69C6D] group-hover:text-white transition-colors duration-500" />
                          </div>
                          <div>
                            <h4 className="text-lg font-serif text-[#3E2723] mb-0.5">{booking.customer_name}</h4>
                            <p className="text-sm text-[#C69C6D] font-medium">{booking.service}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDFBF7] border border-stone-100 text-stone-500 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-[#C69C6D]" />
                            <span className="font-serif">
                              {new Date(booking.appointment_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FDFBF7] border border-stone-100 text-stone-500 text-sm">
                            <Clock className="w-3.5 h-3.5 text-[#C69C6D]" />
                            <span className="font-serif">
                              {new Date(booking.appointment_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {pastBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em]">Past Appointments</h3>
                  <span className="ml-auto px-3 py-1 rounded-full bg-stone-50 text-stone-400 text-[10px] font-bold tracking-wider">{pastBookings.length}</span>
                </div>
                <div className="space-y-3">
                  {pastBookings.map((booking, idx) => (
                    <motion.div key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl border border-stone-100/50 p-5 md:p-6 opacity-60 hover:opacity-100 transition-all duration-300 group"
                    >
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 text-stone-300" />
                          </div>
                          <div>
                            <h4 className="text-base font-serif text-stone-500">{booking.customer_name}</h4>
                            <p className="text-xs text-stone-400">{booking.service}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 text-xs text-stone-400">
                          <span className="font-serif">{new Date(booking.appointment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span className="text-stone-300">·</span>
                          <span className="font-serif">{new Date(booking.appointment_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back Link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-14 text-center"
        >
          <Link href="/"
            className="inline-flex items-center gap-2 text-stone-400 text-xs tracking-[0.15em] uppercase hover:text-[#C69C6D] transition-colors duration-300 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Return Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
