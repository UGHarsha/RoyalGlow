"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { supabase } from "../../../utils/supabase";
import { API_BASE, jsonAuthHeaders } from "../../../utils/api";

function SyncContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"syncing" | "done" | "error">("syncing");

  useEffect(() => {
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const next = searchParams.get("next") || "/";

    if (!userId || !email) {
      router.replace(next);
      return;
    }

    async function syncProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setStatus("done");
          return;
        }

        const res = await fetch(`${API_BASE}/api/register-user`, {
          method: "POST",
          headers: jsonAuthHeaders(session.access_token),
          body: JSON.stringify({
            userId,
            name: name || (email as string).split("@")[0],
            email,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.warn("Profile sync non-critical error:", err.error);
        }

        setStatus("done");
      } catch (err) {
        console.warn("Profile sync failed (non-critical):", err);
        setStatus("done"); // Still redirect — auth succeeded
      } finally {
        // Small delay so animation shows, then redirect
        setTimeout(() => router.replace(next as string), 600);
      }
    }

    syncProfile();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#E8B88A]/10 border border-[#E8B88A]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Sparkles className="w-7 h-7 text-[#E8B88A]" />
        </div>
        <h2 className="text-white font-serif text-xl mb-2">
          {status === "syncing" ? "Setting up your account..." : "Welcome! ✨"}
        </h2>
        <p className="text-stone-500 text-sm">Just a moment while we prepare your profile</p>

        {/* Spinner */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthSyncPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8B88A]/30 border-t-[#E8B88A] rounded-full animate-spin" />
      </div>
    }>
      <SyncContent />
    </Suspense>
  );
}
