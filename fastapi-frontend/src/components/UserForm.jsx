import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import BirthTimeQuestionnaire from "./BirthTimeQuestionnaire"

function UserForm() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [userId] = useState(1) // In production, get from context/localStorage

  // Step 1: Birth Time Accuracy
  const [birthTimeKnowledge, setBirthTimeKnowledge] = useState("")
  
  // Step 2: User Information
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    birth_time: "",
    birth_place: "",
    birth_time_accuracy: "unknown"
  })

  // Step 3: Career Profile
  const [careerData, setCareerData] = useState({
    education: "",
    interests: "",
    goals: ""
  })

  const handleBirthTimeKnowledge = (knowledge) => {
    setBirthTimeKnowledge(knowledge)
    
    if (knowledge === "yes" || knowledge === "approximate") {
      setCurrentStep(1)
      if (knowledge === "approximate") {
        setFormData({ ...formData, birth_time_accuracy: "approximate" })
      } else {
        setFormData({ ...formData, birth_time_accuracy: "exact" })
      }
    } else if (knowledge === "no") {
      setShowQuestionnaire(true)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleCareerChange = (e) => {
    const { name, value } = e.target
    setCareerData({ ...careerData, [name]: value })
  }

  const handleSaveBirthData = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/user/birth-data", {
        user_id: userId,
        name: formData.name,
        dob: formData.dob,
        birth_time: formData.birth_time,
        birth_place: formData.birth_place,
        birth_time_accuracy: formData.birth_time_accuracy
      })
      setCurrentStep(2)
    } catch (error) {
      console.error("Birth data error:", error)
      alert("Error saving birth data: " + (error.response?.data?.detail || error.message))
    }
  }

  const handleSaveCareerProfile = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/career/profile", {
        user_id: userId,
        ...careerData
      })
      alert("All information saved successfully!")
      navigate("/dashboard")
    } catch (error) {
      alert("Error saving career profile: " + error.message)
    }
  }

  if (showQuestionnaire) {
    return <BirthTimeQuestionnaire userId={userId} onComplete={() => navigate("/dashboard")} />
  }

  return (
    <div className="user-form-container">
      {currentStep === 0 && (
        <div className="form-card">
          <h2>Do you know your birth time?</h2>
          <p className="form-subtitle">This helps us provide more accurate career guidance</p>
          
          <div className="birth-time-options">
            <button 
              className="option-btn"
              onClick={() => handleBirthTimeKnowledge("yes")}
            >
              <span className="option-icon">✓</span>
              <span className="option-text">Yes, I know my exact birth time</span>
            </button>

            <button 
              className="option-btn"
              onClick={() => handleBirthTimeKnowledge("approximate")}
            >
              <span className="option-icon">≈</span>
              <span className="option-text">Approximate (within an hour)</span>
            </button>

            <button 
              className="option-btn"
              onClick={() => handleBirthTimeKnowledge("no")}
            >
              <span className="option-icon">?</span>
              <span className="option-text">No, I don't know</span>
            </button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="form-card">
          <h2>Personal Information</h2>
          
          <div className="input-group">
            <label>Full Name</label>
            <input 
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleFormChange}
            />
          </div>

          <div className="input-group">
            <label>Date of Birth</label>
            <input 
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleFormChange}
            />
          </div>

          {(birthTimeKnowledge === "yes" || birthTimeKnowledge === "approximate") && (
            <div className="input-group">
              <label>Birth Time</label>
              <input 
                type="time"
                name="birth_time"
                placeholder="HH:MM"
                value={formData.birth_time}
                onChange={handleFormChange}
              />
              <small>Accuracy: {formData.birth_time_accuracy}</small>
            </div>
          )}

          <div className="input-group">
            <label>Birth Place</label>
            <input 
              type="text"
              name="birth_place"
              placeholder="City, Country"
              value={formData.birth_place}
              onChange={handleFormChange}
            />
          </div>

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(0)}>← Back</button>
            <button className="btn-primary" onClick={handleSaveBirthData}>Next →</button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="form-card">
          <h2>Career Profile</h2>
          
          <div className="input-group">
            <label>Education</label>
            <input 
              type="text"
              name="education"
              placeholder="e.g., Bachelor's in Computer Science"
              value={careerData.education}
              onChange={handleCareerChange}
            />
          </div>

          <div className="input-group">
            <label>Interests</label>
            <textarea 
              name="interests"
              placeholder="What areas interest you most?"
              value={careerData.interests}
              onChange={handleCareerChange}
              rows="3"
            />
          </div>

          <div className="input-group">
            <label>Career Goals</label>
            <textarea 
              name="goals"
              placeholder="What are your career goals?"
              value={careerData.goals}
              onChange={handleCareerChange}
              rows="3"
            />
          </div>

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>← Back</button>
            <button className="btn-primary" onClick={handleSaveCareerProfile}>Complete</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserForm
