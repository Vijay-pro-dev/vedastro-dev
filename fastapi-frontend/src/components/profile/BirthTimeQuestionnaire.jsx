import { useState } from "react"
import { api } from "../../lib/api"

function BirthTimeQuestionnaire({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState({
    life_turning_points: "",
    major_changes_timing: "",
    significant_events: "",
    career_transitions: "",
    health_events: "",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const questions = [
    {
      key: "life_turning_points",
      label: "What were the major turning points in your life?",
    },
    {
      key: "major_changes_timing",
      label: "When did major changes occur in your life?",
    },
    {
      key: "significant_events",
      label: "Describe significant events and their approximate timing",
    },
    {
      key: "career_transitions",
      label: "Tell us about your career transitions and when they happened",
    },
    {
      key: "health_events",
      label: "Any major health events and approximate timing?",
    },
  ]

  const handleInputChange = (event) => {
    const value = event.target.value
    setResponses((current) => ({
      ...current,
      [questions[currentStep].key]: value,
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await api.post("/career/estimate-birth-time", responses)
      setResult(response.data)
      if (onComplete) {
        onComplete(response.data)
      }
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to estimate birth time")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="questionnaire-container">
        <div className="questionnaire-card">
          <h3>Birth Time Estimation Complete</h3>
          <div className="result-box">
            <p><strong>Estimated Birth Time:</strong> {result.estimated_time}</p>
            <p><strong>Confidence:</strong> {result.confidence_score}%</p>
            <p>{result.message}</p>
          </div>
          <button className="btn-primary" onClick={() => onComplete?.(result)}>
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="questionnaire-container">
      <div className="questionnaire-card">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }} />
        </div>

        <h3>Birth Time Estimation Questionnaire</h3>
        <p className="step-indicator">Question {currentStep + 1} of {questions.length}</p>

        <div className="question-section">
          <label>{questions[currentStep].label}</label>
          <textarea
            value={responses[questions[currentStep].key]}
            onChange={handleInputChange}
            rows="5"
            disabled={loading}
          />
        </div>

        <div className="button-group">
          <button
            className="btn-secondary"
            onClick={() => setCurrentStep((value) => value - 1)}
            disabled={currentStep === 0 || loading}
          >
            Previous
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (currentStep === questions.length - 1) {
                handleSubmit()
              } else {
                setCurrentStep((value) => value + 1)
              }
            }}
            disabled={!responses[questions[currentStep].key].trim() || loading}
          >
            {loading ? "Submitting..." : currentStep === questions.length - 1 ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BirthTimeQuestionnaire
