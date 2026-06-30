import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const initialServices = [
    { name: "Adult Buzz Cut", category: "Men", price: "5000+", duration: 60 },
    { name: "Clean Up - Beard & Neck Trim", category: "Men", price: "2500+", duration: 15 },
    { name: "Gent hair cut", category: "Men", price: "4000+", duration: 30 },
    { name: "Color & Highlights", category: "Men", price: "10000+", duration: 60 },
    { name: "Consultation", category: "Men", price: "2000", duration: 15 },
    { name: "Women's Haircut", category: "Women", price: "6000+", duration: 60 },
    { name: "Color & Highlights", category: "Women", price: "15000+", duration: 120 },
    { name: "Keratin Treatment", category: "Women", price: "25000+", duration: 120 },
    { name: "Bridal Package", category: "Women", price: "50000+", duration: 180 },
    { name: "Consultation", category: "Women", price: "2000", duration: 30 },
];

const initialLookBook = [
    { src: "/customers/client-doing-hair-cut-barber-shop-salon_1303-20710.jpg", alt: "Barber shop styling" },
    { src: "/customers/female-hairdresser.jpg", alt: "Beauty salon look" },
    { src: "/customers/female-hairdresser-making-hairstyle-blonde-woman-beauty-salon_176420-4458.jpg", alt: "Blonde hairstyle" },
    { src: "/customers/female-hairdresser-making-hairstyle-redhead-woman-beauty-salon_176420-4476.jpg", alt: "Redhead hairstyle" },
    { src: "/customers/female-hairdresser-making-hairstyle-redhead-woman-beauty-salon_176420-4482.jpg", alt: "Elegant redhead styling" },
    { src: "/customers/female-hairdresser-using-hairbrush-hair-dryer_329181-1929.jpg", alt: "Professional blow dry" },
    { src: "/customers/pretty-cute-young.jpg", alt: "Happy client" },
    { src: "/customers/professional-girl-hairdresser-makes-client-haircut-girl-is-sitting-mask-beauty-salon_343596-4444.jpg", alt: "Professional haircut" },
    { src: "/customers/woman-washing-head-hairsalon_1157-27179.jpg", alt: "Hair wash treatment" },
    { src: "/customers/young-beautiful-bride-is-standing-summer-park-with-bouquet-flowers.jpg", alt: "Bridal styling" },
    { src: "/customers/young-man-barbershop-trimming.jpg", alt: "Men's grooming" },
    { src: "/1.jpg", alt: "Master Artistry" },
];

async function seed() {
    console.log("Seeding services...");
    const { error: sError } = await supabase.from('services').upsert(initialServices);
    if (sError) console.error("Error seeding services:", sError.message);
    else console.log("Services seeded!");

    console.log("Seeding lookbook...");
    const { error: lError } = await supabase.from('lookbook').upsert(initialLookBook);
    if (lError) console.error("Error seeding lookbook:", lError.message);
    else console.log("Lookbook seeded!");
}

seed();
