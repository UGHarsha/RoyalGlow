"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type Review = {
    id: number;
    customer_name: string;
    rating: number;
    comment: string;
    created_at: string;
};

export default function Reviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReviews() {
            const { data, error } = await supabase
                .from("reviews")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(3);

            if (!error && data) {
                setReviews(data);
            }
            setLoading(false);
        }
        fetchReviews();
    }, []);

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1 text-[#C69C6D]">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-4 h-4 ${star <= rating ? "fill-current" : "text-stone-200 fill-transparent stroke-current stroke-2"}`}
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                ))}
            </div>
        );
    };

    if (loading) return null;
    if (reviews.length === 0) return null;

    return (
        <section className="py-32 bg-[#0F0F0F] relative overflow-hidden border-t border-white/5">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E8B88A]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-[#E8B88A] tracking-[0.3em] uppercase text-[10px] mb-4 font-black"
                    >
                        Voices of Elegance
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-serif text-white tracking-tight"
                    >
                        What Our Clients <span className="italic gradient-text">Say</span>
                    </motion.h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {reviews.map((review, idx) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white/[0.02] backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-[#E8B88A]/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 group flex flex-col justify-between min-h-[300px]"
                        >
                            <div>
                                <div className="mb-6">
                                    {renderStars(review.rating)}
                                </div>
                                <p className="text-stone-300 italic leading-relaxed text-sm relative mb-8">
                                    &ldquo;{review.comment}&rdquo;
                                </p>
                            </div>
                            <div className="flex items-center gap-4 border-t border-white/5 pt-6 mt-auto">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#E8B88A] to-[#C77DFF] rounded-full flex items-center justify-center text-black font-serif font-black text-sm shrink-0">
                                    {review.customer_name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-serif text-white text-base font-bold">{review.customer_name}</h4>
                                    <p className="text-[9px] text-[#E8B88A] uppercase tracking-widest font-black">Verified Client</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
