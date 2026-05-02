import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../tailwind.css"
import "../styles/pages/Questionnaire.css"
import "../styles/pages/Dashboard.css"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"
import { FiArrowLeft, FiArrowRight } from "react-icons/fi"
import PageLoader from "../components/shared/PageLoader"

const LOCAL_QUESTION_CACHE_KEY = "vedastro_admin_questions_cache"

const QUESTION_SEED = [
  { question_text: "Do you have a clear long-term career goal?", section: "Awareness", display_order: 1 },
  { question_text: "Do you know the skills required for your goal?", section: "Awareness", display_order: 2 },
  { question_text: "Have you consciously chosen your career path?", section: "Awareness", display_order: 3 },
  { question_text: "Do you clearly understand your strengths and weaknesses?", section: "Awareness", display_order: 4 },
  { question_text: "Do you know which role/job suits you best?", section: "Awareness", display_order: 5 },
  { question_text: "Are you aware of industry trends and demand?", section: "Awareness", display_order: 6 },
  { question_text: "Do you regularly evaluate your career direction?", section: "Awareness", display_order: 7 },
  { question_text: "Are you actively exploring job or career opportunities?", section: "Alignment / Time", display_order: 8 },
  { question_text: "Are you receiving interviews or responses recently?", section: "Alignment / Time", display_order: 9 },
  { question_text: "Is your network helping you with opportunities?", section: "Alignment / Time", display_order: 10 },
  { question_text: "Is your profile (CV/LinkedIn/portfolio) strong?", section: "Alignment / Time", display_order: 11 },
  { question_text: "Are you applying to the right roles?", section: "Alignment / Time", display_order: 12 },
  { question_text: "Do you feel this is the right time for growth in your career?", section: "Alignment / Time", display_order: 13 },
  { question_text: "Do you spend time daily on career improvement?", section: "Action", display_order: 14 },
  { question_text: "Are you actively learning new skills?", section: "Action", display_order: 15 },
  { question_text: "Have you created any project/output in the last 30 days?", section: "Action", display_order: 16 },
  { question_text: "Are you consistently applying or doing outreach?", section: "Action", display_order: 17 },
  { question_text: "Are you able to control distractions?", section: "Action", display_order: 18 },
  { question_text: "Do you follow a disciplined routine?", section: "Action", display_order: 19 },
  { question_text: "Do you track your progress regularly?", section: "Action", display_order: 20 },
].map((item, index) => ({
  ...item,
  question_id: `seed-${index + 1}`,
  answer_type: "radio",
  score: 3,
  is_required: true,
  is_active: true,
  user_type_code: "GENERAL",
}))

function Questionnaire() {
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const { user } = useUser()
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(LOCAL_QUESTION_CACHE_KEY) || "[]")
        setLoading(true)
        const userTypeId = user?.user_type_id
        const resp = await api.get("/career/questions", { params: userTypeId ? { user_type_id: userTypeId } : {} })
        const fetched = (resp.data?.questions || resp.data || []).filter((q) => q.is_active !== false)
        const list = fetched.length
          ? fetched.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          : cached.length
            ? cached
            : QUESTION_SEED
        setQuestions(list)
        localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(list))
        localStorage.setItem("guest_questionnaire_questions", JSON.stringify(list))
        const savedAnswers = JSON.parse(localStorage.getItem("guest_questionnaire_answers") || "{}")
        if (savedAnswers && Object.keys(savedAnswers).length) {
          setAnswers(savedAnswers)
          const nextIndex = list.findIndex((q) => !savedAnswers[q.question_id || q.id])
          setCurrentIdx(nextIndex === -1 ? list.length - 1 : nextIndex)
        }
      } catch (err) {
        console.warn("Falling back to cached/seed questions", err)
        const cached = JSON.parse(localStorage.getItem(LOCAL_QUESTION_CACHE_KEY) || "[]")
        const list = (cached.length ? cached : QUESTION_SEED).filter((q) => q.is_active !== false).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        setQuestions(list)
        localStorage.setItem("guest_questionnaire_questions", JSON.stringify(list))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const handleAnswer = (id, value) => {
    const next = { ...answers, [id]: value }
    setAnswers(next)
    localStorage.setItem("guest_questionnaire_answers", JSON.stringify(next))
    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx((idx) => idx + 1), 150)
    }
  }

  const handleSubmit = async (answersOverride) => {
    const finalAnswers = answersOverride || answers
    if (submitting) return
    if (questions.some((q) => q.is_required && !finalAnswers[q.id || q.question_id])) {
      showError("Please answer all required questions.")
      return
    }
    setSubmitting(true)
    localStorage.setItem("guest_questionnaire_answers", JSON.stringify(finalAnswers))
    localStorage.setItem("guest_questionnaire_questions", JSON.stringify(questions))
    showSuccess("Responses saved. Generating your results...")
    // try to persist to backend if authenticated
    try {
      const payload = {
        answers: questions
          .map((q) => {
            const rawId = q.question_id ?? q.id
            const numericId = Number(rawId)
            const hasNumericId = Number.isInteger(numericId)
            return {
              question_id: hasNumericId ? numericId : null,
              answer: finalAnswers[q.question_id || q.id],
            }
          })
          .filter((item) => item.answer && item.question_id !== null),
      }
      if (payload.answers.length > 0) {
        await api.post("/career/responses", payload)
      }
    } catch (error) {
      console.warn("Could not persist responses; continuing with local data", error)
    } finally {
      setSubmitting(false)
    }
    // mark completion locally so dashboard can redirect to the detailed view
    localStorage.setItem("questionnaire_completed", "true")
    navigate("/newdashboard", { replace: true, state: { answers: finalAnswers, questions } })
  }

  const handleNext = () => {
    const id = questions[currentIdx].id || questions[currentIdx].question_id
    if (!answers[id]) {
      showError("Please select an answer.")
      return
    }
    if (currentIdx === questions.length - 1) {
      handleSubmit()
      return
    }
    setCurrentIdx((idx) => idx + 1)
  }

  const handleBack = () => {
    setCurrentIdx((idx) => Math.max(0, idx - 1))
  }

  if (loading) {
    return (
      <div className="landing">
        <div className="questionnaire-shell questionnaire-shell--landing">
          <PageLoader message="Loading questionnaire..." />
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIdx]
  const currentId = currentQuestion?.id || currentQuestion?.question_id
  const progressText = `${currentIdx + 1} / ${questions.length}`
  const selected = answers[currentId]
  const isLast = currentIdx === questions.length - 1
  const elementName = (currentQuestion?.subsection || currentQuestion?.element || "").trim()
  const elementId = currentQuestion?.element_id || currentQuestion?.elementId
  const elementKey = (() => {
    if (elementName) return elementName.toLowerCase()
    const idMap = { 1: "fire", 2: "earth", 3: "air", 4: "water", 5: "space" }
    return idMap[elementId] || ""
  })()
  const _elementTheme = (() => {
    const map = {
      fire: { label: "Fire", bg: "linear-gradient(135deg, #ff6a00, #ff9248)", fg: "#fff" },
      earth: { label: "Earth", bg: "linear-gradient(135deg, #4caf50, #7bc043)", fg: "#0b1b0b" },
      air: { label: "Air", bg: "linear-gradient(135deg, #22d3ee, #6dd5ed)", fg: "#052b33" },
      water: { label: "Water", bg: "linear-gradient(135deg, #3f87ff, #22b1ff)", fg: "#041a33" },
      space: { label: "Space", bg: "linear-gradient(135deg, #9b7bff, #c7a9ff)", fg: "#1a1333" },
    }
    return map[elementKey] || null
  })()

  return (
    <div className="landing">
      <div className="questionnaire-shell questionnaire-shell--landing">
        <div className={`question-window ${elementKey ? `element-${elementKey}` : ""}`}>
          <div className="window-bar">
            <button className="window-back" type="button" onClick={() => navigate(-1)} aria-label="Go back">
              <FiArrowLeft />
            </button>
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <span className="progress-text">{progressText}</span>
          </div>
          <div className="question-body">
            <p className="question-text">{currentQuestion.question_text}</p>
            <p className="question-caption">Answer thoughtfully - honest inputs make your guidance sharper.</p>
            <div className="qa-answers centered">
              {[1, 2, 3, 4, 5].map((val) => (
                <label key={val} className={`likert big ${selected === val ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name={`q-${currentId}`}
                    value={val}
                    checked={selected === val}
                    onChange={() => handleAnswer(currentId, val)}
                  />
                  {val}
                </label>
              ))}
            </div>
            <div className="qa-actions spread">
              <button className="icon-btn secondary" disabled={currentIdx === 0} onClick={handleBack} aria-label="Previous">
                <FiArrowLeft />
              </button>
              {!isLast && (
                <button className="icon-btn primary" onClick={handleNext} aria-label="Next" disabled={!selected}>
                  <FiArrowRight />
                </button>
              )}
              {isLast && (
                <button
                  className="qa-submit-btn"
                  type="button"
                  onClick={() => handleSubmit({ ...answers })}
                  disabled={!selected || submitting}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Questionnaire
