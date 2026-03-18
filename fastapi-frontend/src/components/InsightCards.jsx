function InsightCards({ careerPhase, alignmentScore, opportunityWindow }) {
  const getPhaseIcon = (phase) => {
    const icons = {
      "Skill Building": "📚",
      "Expansion": "🚀",
      "Opportunity Window": "✨",
      "Consolidation": "🏆"
    }
    return icons[phase] || "🎯"
  }

  const getPhaseDescription = (phase) => {
    const descriptions = {
      "Skill Building": "Build strong technical and soft skills. Focus on learning and development.",
      "Expansion": "Expand your horizons. Take on leadership roles and broader responsibilities.",
      "Opportunity Window": "Seize opportunities. Major career moves and transitions are favored.",
      "Consolidation": "Consolidate gains. Focus on stability and nurturing what you've built."
    }
    return descriptions[phase] || "Focus on your career development."
  }

  return (
    <div className="insight-cards-container">
      <div className="insight-card phase-card">
        <div className="card-icon">{getPhaseIcon(careerPhase)}</div>
        <h4>Current Career Phase</h4>
        <p className="phase-name">{careerPhase}</p>
        <p className="phase-description">{getPhaseDescription(careerPhase)}</p>
      </div>

      <div className="insight-card score-card">
        <div className="card-icon">📊</div>
        <h4>Career Alignment</h4>
        <div className="score-display">
          <div className="score-number">{Math.round(alignmentScore)}</div>
          <p className="score-text">out of 100</p>
        </div>
        <p className="score-feedback">
          {alignmentScore >= 80 ? "Excellent alignment!" : 
           alignmentScore >= 60 ? "Good progress!" : 
           "Keep improving!"}
        </p>
      </div>

      <div className="insight-card opportunity-card">
        <div className="card-icon">🔮</div>
        <h4>Opportunity Window</h4>
        <p className="window-dates">
          {opportunityWindow.start_date} to {opportunityWindow.end_date}
        </p>
        <p className="window-type">{opportunityWindow.type}</p>
      </div>

      <div className="insight-card action-card">
        <div className="card-icon">⚡</div>
        <h4>Action Items</h4>
        <ul className="action-list">
          <li>✓ Update your portfolio</li>
          <li>✓ Network actively</li>
          <li>✓ Learn new skills</li>
        </ul>
      </div>
    </div>
  )
}

export default InsightCards
