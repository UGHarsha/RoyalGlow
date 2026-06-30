"use client";

import { useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      const user = data.user;

      const isAdmin =
        user?.user_metadata?.role === "admin" ||
        user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

      window.location.href = isAdmin ? "/admin" : "/";
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] flex items-start justify-center px-4 pt-28 pb-10">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-10">

        <div className="text-center mb-10">

          <h1 className="text-3xl font-serif text-white">
            Welcome{" "}
            <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">
              Back
            </span>
          </h1>

          <p className="text-stone-400 text-sm mt-3">
            Sign in to continue your Royal Glow experience
          </p>

        </div>


        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 rounded-xl bg-red-500/10 text-red-400 text-xs text-center"
          >
            {message}
          </motion.div>
        )}


        <form onSubmit={handleLogin} className="space-y-6">

          <div>

            <label className="block text-[11px] uppercase tracking-[0.25em] text-stone-400 mb-3 font-bold">
              Email
            </label>


            <div className="relative">

              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 text-white pl-12 outline-none focus:border-[#E8B88A]"
              />

            </div>

          </div>



          <div>

            <label className="block text-[11px] uppercase tracking-[0.25em] text-stone-400 mb-3 font-bold">
              Password
            </label>


            <div className="relative">

              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />


              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 text-white pl-12 pr-12 outline-none focus:border-[#E8B88A]"
              />


              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500"
              >

                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}

              </button>


            </div>

          </div>



          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black font-bold tracking-widest text-sm"
          >

            {loading ? "SIGNING..." : "SIGN IN"}

          </button>


        </form>



        <div className="flex items-center gap-4 my-7">

          <div className="h-px bg-white/10 flex-1" />

          <span className="text-xs text-stone-500">
            OR
          </span>

          <div className="h-px bg-white/10 flex-1" />

        </div>



        <button
          onClick={handleGoogleLogin}
          className="w-full h-14 rounded-2xl border border-white/10 text-stone-300 flex items-center justify-center gap-3"
        >

          <img
            src="https://www.google.com/favicon.ico"
            className="w-5 h-5"
            alt="Google"
          />

          Continue with Google

        </button>



        <p className="text-center text-sm text-stone-500 mt-7">

          Don't have an account?

          <Link
            href="/register"
            className="text-[#E8B88A] ml-2"
          >
            Create Account
          </Link>

        </p>


      </div>

    </div>
  );
}