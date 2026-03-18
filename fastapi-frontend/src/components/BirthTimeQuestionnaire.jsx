import { useState } from "react"
import axios from "axios"

function BirthTimeQuestionnaire({ userId, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState({
    life_turning_points: "",
    major_changes_timing: "",
    significant_events: "",
    career_transitions: "",
    health_events: ""
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const questions = [
    {
      key: "life_turning_points",
      label: "What were the major turning points in your life?",
      placeholder: "e.g., Changed careers at age 25, moved to new city at 30..."
    },
    {
      key: "major_changes_timing",
      label: "When did major changes occur in your life?",
      placeholder: "e.g., Significant changes around Summer 2020, early 2022..."
    },
    {
      key: "significant_events",
      label: "Describe significant events and their approximate timing",
      placeholder: "e.g., Job promotion in spring, relationship changes..."
    },
    {
      key: "career_transitions",
      label: "Tell us about your career transitions and when they happened",
      placeholder: "e.g., Started first job at 22, switched to new field..."
    },
    {
      key: "health_events",
      label: "Any major health events and approximate timing?",
      placeholder: "e.g., Recovered from illness in 2019, started fitness routine..."
    }
  ]

  const handleInputChange = (e) => {
    const value = e.target.value
    setResponses({
      ...responses,
      [questions[currentStep].key]: value
    })
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await axios.post("http://127.0.0.1:8000/career/estimate-birth-time", {
        user_id: userId,
        ...responses
      })
      setResult(res.data)
      
      if (onComplete) {
        onComplete(res.data)
      }
    } catch (error) {
      console.error("Error estimating birth time:", error)
      alert("Failed to estimate birth time. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="questionnaire-result">
        <h3>✓ Birth Time Estimation Complete</h3>
        <div className="result-box">
          <p><strong>Estimated Birth Time:</strong> {result.estimated_time}</p>
          <p><strong>Confidence Score:</strong> {result.confidence_score}%</p>
          <p className="result-message">{result.message}</p>
        </div>
        <button className="btn-primary" onClick={() => window.history.back()}>Continue</button>
      </div>
    )
  }

  return (
    <div className="questionnaire-container">
      <div className="questionnaire-card">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}></div>
        </div>

        <h3>Birth Time Estimation Questionnaire</h3>
        <p className="step-indicator">Question {currentStep + 1} of {questions.length}</p>

        <div className="question-section">
          <label>{questions[currentStep].label}</label>
          <textarea
            value={responses[questions[currentStep].key]}
            onChange={handleInputChange}
            placeholder={questions[currentStep].placeholder}
            rows="5"
            disabled={loading}
          />
        </div>

        <div className="button-group">
          <button 
            className="btn-secondary" 
            onClick={handlePrevious}
            disabled={currentStep === 0 || loading}
          >
            ← Previous
          </button>
          <button 
            className="btn-primary" 
            onClick={handleNext}
            disabled={!responses[questions[currentStep].key].trim() || loading}
          >
            {loading ? "Submitting..." : currentStep === questions.length - 1 ? "Submit" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BirthTimeQuestionnaire
