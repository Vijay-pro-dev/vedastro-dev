import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../tailwind.css"
import "./PromotionPage.css"
import {
  LuActivity,
  LuBriefcase,
  LuCheck,
  LuClock,
  LuCpu,
  LuEyeOff,
  LuHeart,
  LuLock,
  LuMessageCircle,
  LuShoppingBag,
  LuShieldCheck,
  LuTrendingUp,
  LuTriangleAlert,
  LuUserPlus,
  LuUsers,
  LuZap,
} from "react-icons/lu"

function PromotionPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".fade-up"))
    if (elements.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const goToLanding = () => {
    navigate("/?from=promo")
  }

  return (
    <div className="promo-page h-full min-h-screen bg-bg font-inter text-white overflow-auto">
      <nav className="fixed top-0 left-0 w-full z-50 bg-bg/80 backdrop-blur-xl border-b border-cardBorder/50">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#D4AF37"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-sora font-bold text-lg tracking-tight">Vedastro</span>
          </div>
          <button
            type="button"
            onClick={goToLanding}
            className="glow-btn bg-gold text-black font-semibold text-sm px-5 py-2.5 rounded-full"
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="pt-28 pb-20 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-gold text-xs font-medium tracking-wide uppercase">Decision Intelligence System</span>
            </div>
          </div>
          <h1 className="fade-up font-sora font-semibold text-4xl md:text-6xl lg:text-7xl leading-[1.08] tracking-tight mb-6">
            Before Your Next Big Decision,
            <br />
            <span className="text-gold">Know If You&apos;re About to Make a Mistake.</span>
          </h1>
          <p className="fade-up text-gray4 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Vedastro detects when your clarity, behavior, and timing are misaligned — so you can avoid costly decisions.
          </p>
          <div className="fade-up flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <button type="button" onClick={goToLanding} className="glow-btn bg-gold text-black font-bold text-base px-8 py-4 rounded-full">
              Get My Free Insight
            </button>
            <button
              type="button"
              onClick={goToLanding}
              className="glow-btn-outline bg-transparent border border-white/20 text-white font-medium text-base px-8 py-4 rounded-full"
            >
              How It Works
            </button>
          </div>
          <p className="fade-up text-gray4 text-sm">60 seconds · 1 full insight free · No signup needed</p>

          <div className="fade-up mt-16 flex justify-center">
            <div className="float-anim relative w-72 md:w-80">
              <div className="absolute -inset-4 bg-gold/5 rounded-[3rem] blur-2xl" />
              <div className="relative bg-card border border-cardBorder rounded-[2.5rem] p-3">
                <div className="bg-bg rounded-[2rem] p-5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray4">Today&apos;s State</span>
                    <span className="text-xs text-gold font-medium">Live</span>
                  </div>
                  <div className="bg-card border border-cardBorder rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                        <LuTriangleAlert className="w-5 h-5 text-red-400" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">High Risk Phase</p>
                        <p className="text-xs text-gray4">Confidence: 82%</p>
                      </div>
                    </div>
                    <div className="w-full bg-bg rounded-full h-2 mb-3">
                      <div
                        className="bg-gradient-to-r from-red-500 to-amber-400 h-2 rounded-full"
                        style={{ width: "82%" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-card border border-cardBorder rounded-xl p-3 text-center">
                      <p className="text-xs text-gray4 mb-1">Clarity</p>
                      <p className="text-gold font-bold text-sm">Low</p>
                    </div>
                    <div className="bg-card border border-cardBorder rounded-xl p-3 text-center">
                      <p className="text-xs text-gray4 mb-1">Behavior</p>
                      <p className="text-amber-400 font-bold text-sm">High</p>
                    </div>
                    <div className="bg-card border border-cardBorder rounded-xl p-3 text-center">
                      <p className="text-xs text-gray4 mb-1">Timing</p>
                      <p className="text-red-400 font-bold text-sm">Weak</p>
                    </div>
                  </div>
                  <div className="bg-gold/10 border border-gold/20 rounded-xl p-3">
                    <p className="text-xs text-gold">⏳ Wait 24–48h before major decisions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="fade-up font-sora font-bold text-3xl md:text-4xl text-center mb-4">Use Vedastro Before Decisions Like:</h2>
          <p className="fade-up text-gray4 text-center mb-14 text-lg">When stakes are high, guessing is expensive.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="fade-up stagger-1 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuTrendingUp className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Investing money</p>
            </div>
            <div className="fade-up stagger-2 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuBriefcase className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Switching jobs</p>
            </div>
            <div className="fade-up stagger-3 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuHeart className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Starting a relationship</p>
            </div>
            <div className="fade-up stagger-4 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuUsers className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Business partnership</p>
            </div>
            <div className="fade-up stagger-5 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuUserPlus className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Hiring someone</p>
            </div>
            <div className="fade-up stagger-6 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuShoppingBag className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Major purchases</p>
            </div>
            <div className="fade-up stagger-7 card-hover bg-card border border-cardBorder rounded-2xl p-5 text-center col-span-2 md:col-span-2">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center">
                <LuMessageCircle className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">Difficult conversations</p>
            </div>
          </div>
          <p className="fade-up text-center mt-10 text-gold font-medium">One wrong move can cost far more than ₹499.</p>
        </div>
      </section>

      <section id="how" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="fade-up font-sora font-bold text-3xl md:text-4xl text-center mb-4">Why Smart People Still Make Bad Decisions</h2>
          <p className="fade-up text-gray4 text-center mb-14 text-lg">Intelligence alone doesn&apos;t protect you from these three traps.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="fade-up stagger-1 card-hover bg-card border border-cardBorder rounded-2xl p-8 text-center shimmer">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                <LuEyeOff className="w-8 h-8 text-blue-400" aria-hidden="true" />
              </div>
              <h3 className="font-sora font-bold text-xl mb-2">Clarity</h3>
              <p className="text-gray4">You can&apos;t see clearly. Fog in your judgment distorts what feels like a good choice.</p>
            </div>
            <div className="fade-up stagger-2 card-hover bg-card border border-cardBorder rounded-2xl p-8 text-center shimmer">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                <LuZap className="w-8 h-8 text-amber-400" aria-hidden="true" />
              </div>
              <h3 className="font-sora font-bold text-xl mb-2">Behavior</h3>
              <p className="text-gray4">You react emotionally or impulsively. Speed without awareness compounds errors.</p>
            </div>
            <div className="fade-up stagger-3 card-hover bg-card border border-cardBorder rounded-2xl p-8 text-center shimmer">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
                <LuClock className="w-8 h-8 text-red-400" aria-hidden="true" />
              </div>
              <h3 className="font-sora font-bold text-xl mb-2">Timing</h3>
              <p className="text-gray4">It&apos;s the wrong moment. Even good decisions fail when timing is off.</p>
            </div>
          </div>
          <p className="fade-up text-center mt-10 font-medium text-lg">
            Vedastro checks <span className="text-gold">all three</span> in seconds.
          </p>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="fade-up font-sora font-bold text-3xl md:text-4xl text-center mb-4">Your Decision State Could Look Like This</h2>
          <p className="fade-up text-gray4 text-center mb-12 text-lg">A real-time snapshot of your decision readiness.</p>
          <div className="fade-up card-hover bg-card border border-cardBorder rounded-3xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 pulse-ring" />
              </div>
              <span className="text-red-400 font-semibold text-sm uppercase tracking-wider">High Risk Decision Phase</span>
              <span className="ml-auto bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray4">Confidence: 82%</span>
            </div>
            <div className="bg-bg border border-cardBorder rounded-2xl p-6 mb-6">
              <p className="text-sm text-gray4 mb-2 uppercase tracking-wider font-medium">Insight</p>
              <p className="text-lg font-medium leading-relaxed">
                You are acting faster than your clarity allows. High action combined with low clarity creates a pattern of regret.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-bg border border-cardBorder rounded-xl p-5">
                <p className="text-sm text-gray4 mb-1">Recommended Action</p>
                <p className="text-gold font-semibold">Wait 24–48 hours before major decisions.</p>
              </div>
              <div className="bg-bg border border-cardBorder rounded-xl p-5">
                <p className="text-sm text-gray4 mb-1">Why</p>
                <p className="text-white font-medium">High action + low clarity + weak timing detected.</p>
              </div>
            </div>
            <button type="button" onClick={goToLanding} className="glow-btn block text-center bg-gold text-black font-bold px-8 py-4 rounded-full text-base">
              Get My Result
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="fade-up font-sora font-bold text-3xl md:text-4xl mb-4">Not Advice. Not Generic Motivation.</h2>
          <p className="fade-up text-gray4 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
            Built using behavioral signals, pattern recognition, and timing intelligence models. Helps users pause bad decisions and act at
            better moments.
          </p>
          <div className="fade-up grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-cardBorder rounded-2xl p-5">
              <LuShieldCheck className="w-7 h-7 text-gold mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-gray4">Data Encrypted</p>
            </div>
            <div className="bg-card border border-cardBorder rounded-2xl p-5">
              <LuCpu className="w-7 h-7 text-gold mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-gray4">Pattern Engine</p>
            </div>
            <div className="bg-card border border-cardBorder rounded-2xl p-5">
              <LuActivity className="w-7 h-7 text-gold mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-gray4">Real-time Analysis</p>
            </div>
            <div className="bg-card border border-cardBorder rounded-2xl p-5">
              <LuLock className="w-7 h-7 text-gold mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs text-gray4">Private &amp; Secure</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="fade-up font-sora font-bold text-3xl md:text-4xl text-center mb-4">Start Free. Upgrade When It Proves Value.</h2>
          <p className="fade-up text-gray4 text-center mb-14 text-lg">No commitment. See the insight first.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="fade-up stagger-1 card-hover bg-card border border-cardBorder rounded-3xl p-8">
              <p className="text-gray4 text-sm font-medium uppercase tracking-wider mb-2">Free</p>
              <p className="font-sora font-bold text-4xl mb-1">₹0</p>
              <p className="text-gray4 text-sm mb-6">1 full insight included</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> 1 complete decision analysis
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> Clarity, behavior &amp; timing check
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> No signup required
                </li>
              </ul>
              <button
                className="promo-free-btn glow-btn-outline w-full border border-white/20 text-white font-semibold py-3.5 rounded-full text-base"
                type="button"
                onClick={goToLanding}
              >
                Start Free
              </button>
            </div>
            <div className="fade-up stagger-2 card-hover relative bg-card border-2 border-gold/40 rounded-3xl p-8">
              <div className="absolute -top-3 right-6 bg-gold text-black text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              <p className="text-gold text-sm font-medium uppercase tracking-wider mb-2">Pro</p>
              <p className="font-sora font-bold text-4xl mb-1">
                ₹499<span className="text-lg text-gray4 font-normal">/mo for early users</span>
              </p>
              <p className="text-gray4 text-sm mb-6">
                <span className="line-through">₹1999/month</span> · 75% off
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> Unlimited insights
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> Daily timing guidance
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> Decision risk alerts
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <LuCheck className="w-4 h-4 text-gold" aria-hidden="true" /> Better action windows
                </li>
              </ul>
              <button
                className="glow-btn w-full bg-gold text-black font-bold py-3.5 rounded-full text-base"
                type="button"
                onClick={goToLanding}
              >
                Unlock Pro
              </button>
            </div>
          </div>
          <p className="fade-up text-center mt-8 text-gray4 text-sm">If it prevents one expensive mistake, it pays for itself.</p>
        </div>
      </section>

      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="fade-up font-sora font-bold text-3xl md:text-4xl mb-6">Check Before Every Important Decision</h2>
          <div className="fade-up space-y-3 text-gray4 text-lg leading-relaxed">
            <p>Your state changes.</p>
            <p>Your timing changes.</p>
            <p>Your best move changes.</p>
          </div>
          <p className="fade-up text-gold font-medium text-lg mt-8">Use Vedastro whenever stakes are high.</p>
        </div>
      </section>

      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="fade-up bg-gradient-to-b from-card to-bg border border-cardBorder rounded-3xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent" />
            <div className="relative">
              <h2 className="font-sora font-bold text-3xl md:text-5xl mb-4">Make Fewer Costly Mistakes</h2>
              <p className="text-gray4 text-lg mb-10">Get clarity before your next move.</p>
              <button type="button" onClick={goToLanding} className="glow-btn inline-block bg-gold text-black font-bold text-lg px-10 py-4 rounded-full">
                Get My Free Insight Now
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PromotionPage
