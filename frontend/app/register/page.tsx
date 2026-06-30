"use client";

import { useState } from "react";
import { supabase } from "../../utils/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { API_BASE, jsonAuthHeaders } from "../../utils/api";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<1 | 2>(1);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();



  const handleRegister = async (e: React.FormEvent) => {

    e.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);


    const { error } = await supabase.auth.signUp({

      email,
      password,

    });


    if (error) {

      setMessage(error.message);
      setIsError(true);

    } else {

      setMessage("Verification code sent!");
      setStep(2);

    }


    setLoading(false);

  };





  const handleVerifyOtp = async (e: React.FormEvent) => {


    e.preventDefault();

    setLoading(true);
    setMessage("");
    setIsError(false);



    const { data, error } = await supabase.auth.verifyOtp({

      email,
      token: otp,
      type: "signup",

    });



    if (error) {

      setMessage(error.message);
      setIsError(true);
      setLoading(false);
      return;

    }



    if (data.user?.id && data.session?.access_token) {


      await fetch(`${API_BASE}/api/register-user`, {

        method: "POST",

        headers: jsonAuthHeaders(
          data.session.access_token
        ),

        body: JSON.stringify({

          userId: data.user.id,

          name: name || email.split("@")[0],

          email

        })

      });


    }



    setMessage("Registration successful!");

    setTimeout(() => {

      router.push("/login");

    }, 1500);



    setLoading(false);


  };





  return (


    <div className="
min-h-screen
bg-[#090909]
flex
items-start
justify-center
px-4
pt-24
pb-10
">


      <div className="
w-full
max-w-md
bg-white/[0.03]
border
border-white/10
rounded-3xl
p-10
">


        <h1 className="
text-center
text-3xl
font-serif
text-white
mb-3
">

          Create{" "}

          <span className="
italic
bg-gradient-to-r
from-[#E8B88A]
to-[#C77DFF]
bg-clip-text
text-transparent
">

            Account

          </span>

        </h1>



        <p className="
text-center
text-stone-400
text-sm
mb-8
">

          Join Royal Glow experience

        </p>





        {message && (

          <motion.div

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            className={`
mb-5
p-3
rounded-xl
text-xs
text-center
${isError
                ?
                "bg-red-500/10 text-red-400"
                :
                "bg-green-500/10 text-green-400"
              }

`}

          >

            {message}

          </motion.div>


        )}




        {step === 1 ? (


          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >


            <div>

              <label className="text-xs text-stone-400">
                Name
              </label>


              <div className="relative mt-2">


                <User className="
absolute
left-4
top-1/2
-translate-y-1/2
text-stone-500
w-5
"/>



                <input

                  required

                  value={name}

                  onChange={(e) => setName(e.target.value)}

                  placeholder="Full name"

                  className="
w-full
h-14
bg-black/30
border
border-white/10
rounded-2xl
pl-12
text-white
outline-none
focus:border-[#E8B88A]
"

                />


              </div>

            </div>




            <div>

              <label className="text-xs text-stone-400">
                Email
              </label>


              <div className="relative mt-2">


                <Mail className="
absolute
left-4
top-1/2
-translate-y-1/2
text-stone-500
w-5
"/>



                <input

                  required

                  type="email"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  placeholder="Email"

                  className="
w-full
h-14
bg-black/30
border
border-white/10
rounded-2xl
pl-12
text-white
outline-none
focus:border-[#E8B88A]
"

                />


              </div>

            </div>





            <div>

              <label className="text-xs text-stone-400">
                Password
              </label>


              <div className="relative mt-2">


                <Lock className="
absolute
left-4
top-1/2
-translate-y-1/2
text-stone-500
w-5
"/>



                <input

                  required

                  type={showPassword ? "text" : "password"}

                  value={password}

                  onChange={(e) => setPassword(e.target.value)}

                  placeholder="Password"

                  className="
w-full
h-14
bg-black/30
border
border-white/10
rounded-2xl
pl-12
pr-12
text-white
outline-none
focus:border-[#E8B88A]
"

                />



                <button

                  type="button"

                  onClick={() => setShowPassword(!showPassword)}

                  className="
absolute
right-4
top-1/2
-translate-y-1/2
text-stone-500
"

                >

                  {
                    showPassword
                      ?
                      <EyeOff size={18} />
                      :
                      <Eye size={18} />
                  }

                </button>


              </div>

            </div>





            <button

              disabled={loading}

              className="
w-full
h-14
rounded-2xl
bg-[#E8B88A]
text-black
font-bold
tracking-widest
"

            >

              {
                loading
                  ?
                  "CREATING..."
                  :
                  "CREATE ACCOUNT"
              }

            </button>



          </form>



        ) : (


          <form
            onSubmit={handleVerifyOtp}
            className="space-y-5"
          >


            <p className="
text-center
text-stone-400
text-sm
">

              Code sent to

              <br />

              <span className="text-white">
                {email}
              </span>

            </p>




            <input

              required

              value={otp}

              onChange={(e) => setOtp(e.target.value)}

              maxLength={6}

              placeholder="000000"

              className="
w-full
h-14
text-center
tracking-[0.5em]
bg-black/30
border
border-white/10
rounded-2xl
text-white
"

            />



            <button

              className="
w-full
h-14
rounded-2xl
bg-[#E8B88A]
text-black
font-bold
"

            >

              VERIFY

            </button>



          </form>


        )}





        <p className="
text-center
text-sm
text-stone-500
mt-7
">

          Already have account?


          <Link
            href="/login"
            className="text-[#E8B88A] ml-2"
          >

            Sign In

          </Link>


        </p>



      </div>

    </div>


  );

}