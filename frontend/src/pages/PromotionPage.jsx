import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaArrowRight, FaCheck } from "react-icons/fa"

function PromotionPage() {
  const navigate = useNavigate()
  const [activePill, setActivePill] = useState("clarity")

  const pills = useMemo(
    () => [
      { key: "clarity", label: "Clarity", desc: "How clearly you think" },
      { key: "action", label: "Action", desc: "How you behave" },
      { key: "timing", label: "Timing", desc: "Whether it’s the right moment" },
    ],
    [],
  )

  const activeDesc = pills.find((pill) => pill.key === activePill)?.desc || ""

  const goToLanding = () => {
    navigate("/?from=promo")
  }

  return (
    <div className="promo-shell">
      <div className="promo-grain" aria-hidden="true" />

      <header className="promo-header">
        <div className="promo-brand">
          <div className="promo-mark">V</div>
          <div>
            <div className="promo-brand-name">Vedastro</div>
            <div className="promo-brand-sub">Decision Insight</div>
          </div>
        </div>

        <button type="button" className="promo-cta secondary" onClick={goToLanding}>
          Go to App <FaArrowRight />
        </button>
      </header>

      <main className="promo-main">
        <section className="promo-card promo-hero">
          <div className="promo-hero-copy">
            <p className="promo-eyebrow">Your next move, but clearer.</p>
            <h1>
              You’re Making <span className="promo-accent">Wrong Decisions</span>
              <br />
              <span className="promo-muted">(and what to do next)</span>
            </h1>
            <p className="promo-lead">Understand your thinking, action pattern, and timing—before your next decision.</p>

            <button type="button" className="promo-cta primary" onClick={goToLanding}>
              Get Your Decision Insight <FaArrowRight />
            </button>

            <p className="promo-trust">Used by founders, professionals & high-stakes decision makers.</p>
            <blockquote className="promo-quote">“This feels accurate and helpful.”</blockquote>
          </div>

          <div className="promo-hero-visual" aria-hidden="true">
            <div className="promo-phone">
              <div className="promo-phone-notch" />
              <div className="promo-phone-screen">
                <div className="promo-phone-title">Your Decision Insight</div>
                <div className="promo-bars">
                  <div className="promo-bar">
                    <span>Clarity</span>
                    <div className="promo-bar-track">
                      <div className="promo-bar-fill gold" style={{ width: "22%" }} />
                    </div>
                    <em>2%</em>
                  </div>
                  <div className="promo-bar">
                    <span>Action</span>
                    <div className="promo-bar-track">
                      <div className="promo-bar-fill gold" style={{ width: "78%" }} />
                    </div>
                    <em>8%</em>
                  </div>
                  <div className="promo-bar">
                    <span>Timing</span>
                    <div className="promo-bar-track">
                      <div className="promo-bar-fill blue" style={{ width: "64%" }} />
                    </div>
                    <em>8%</em>
                  </div>
                </div>

                <div className="promo-phone-panel">
                  <div className="promo-phone-panel-title">HIGH RISK DECISION PHASE</div>
                  <div className="promo-phone-panel-sub">Confidence: 89%</div>
                  <div className="promo-phone-panel-lines">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>

                <div className="promo-phone-mini">
                  <div className="promo-mini-row">
                    <span className="lock" />
                    <span>Insight locked</span>
                  </div>
                  <div className="promo-mini-row">
                    <span className="lock" />
                    <span>Action locked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="promo-card promo-mid">
          <h2>This might be exactly what you’re facing</h2>
          <div className="promo-pills" role="tablist" aria-label="Decision pillars">
            {pills.map((pill) => (
              <button
                key={pill.key}
                type="button"
                role="tab"
                aria-selected={activePill === pill.key}
                className={`promo-pill ${pill.key} ${activePill === pill.key ? "active" : ""}`}
                onClick={() => setActivePill(pill.key)}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <div className="promo-pill-desc">{activeDesc}</div>
          <div className="promo-mid-checks">
            <div className="promo-check">
              <FaCheck /> Low clarity detected
            </div>
            <div className="promo-check">
              <FaCheck /> Action misalignment
            </div>
            <div className="promo-check">
              <FaCheck /> Timing weak (high risk)
            </div>
          </div>
        </section>

        <section className="promo-card promo-split">
          <div className="promo-split-copy">
            <h2>
              Vedastro shows what’s <span className="promo-accent">actually happening</span>
              <br />
              inside your decisions
            </h2>
            <p className="promo-lead small">
              You don’t make wrong decisions because you’re incapable. You make them because you can’t see the pattern when it
              matters most.
            </p>
            <ul className="promo-bullets">
              <li>
                <FaCheck /> Your clarity is low
              </li>
              <li>
                <FaCheck /> Your action is misaligned
              </li>
              <li>
                <FaCheck /> Daily decision guidance
              </li>
            </ul>
            <button type="button" className="promo-cta primary" onClick={goToLanding}>
              Start Free <FaArrowRight />
            </button>
          </div>

          <div className="promo-split-visual" aria-hidden="true">
            <div className="promo-phone mini">
              <div className="promo-phone-notch" />
              <div className="promo-phone-screen">
                <div className="promo-phone-title">Decision Insight</div>
                <div className="promo-bars">
                  <div className="promo-bar">
                    <span>Clarity</span>
                    <div className="promo-bar-track">
                      <div className="promo-bar-fill gold" style={{ width: "24%" }} />
                    </div>
                    <em>7%</em>
                  </div>
                  <div className="promo-bar">
                    <span>Action</span>
                    <div className="promo-bar-track">
                      <div className="promo-bar-fill gold" style={{ width: "82%" }} />
                    </div>
                    <em>8%</em>
                  </div>
                  <div className="promo-bar">
                    <span>Timing</span>
                    <div className="promo-bar-track">
                      <div className="promo-bar-fill blue" style={{ width: "58%" }} />
                    </div>
                    <em>8%</em>
                  </div>
                </div>
                <div className="promo-phone-panel">
                  <div className="promo-phone-panel-title">HIGH RISK DECISION PHASE</div>
                  <div className="promo-phone-panel-sub">Confidence: 88%</div>
                  <div className="promo-phone-panel-lines">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
                <div className="promo-phone-mini">
                  <div className="promo-mini-row">
                    <span className="lock" />
                    <span>Write your notes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="promo-card promo-price">
          <h2>
            Start free. <span className="promo-accent">Upgrade</span> when you see the value.
          </h2>
          <div className="promo-pricing-grid">
            <div className="promo-price-card">
              <div className="promo-price-top">
                <strong>Free</strong>
                <span>1 Decision Insight</span>
              </div>
              <div className="promo-price-line" />
              <div className="promo-price-foot">
                <FaCheck /> Try it with one decision
              </div>
            </div>
            <div className="promo-price-card highlight">
              <div className="promo-price-top">
                <strong>Pro</strong>
                <span>₹499 / month</span>
              </div>
              <div className="promo-price-line" />
              <div className="promo-price-foot">
                <FaCheck /> Daily guidance + better accuracy
              </div>
            </div>
          </div>
          <div className="promo-bottom-cta">
            <button type="button" className="promo-cta primary" onClick={goToLanding}>
              Get Started <FaArrowRight />
            </button>
          </div>
        </section>
      </main>

      <footer className="promo-footer">
        <div className="promo-footer-inner">
          <div className="promo-footer-brand">VEDASTRO</div>
          <div className="promo-footer-links">
            <button type="button" className="promo-footer-link" onClick={goToLanding}>
              Privacy Policy
            </button>
            <button type="button" className="promo-footer-link" onClick={goToLanding}>
              Terms
            </button>
            <button type="button" className="promo-footer-link" onClick={goToLanding}>
              Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PromotionPage

