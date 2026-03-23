function InsightCards({ careerPhase, alignmentScore, opportunityWindow }) {
  const phaseIcons = {
    "Skill Building": "SB",
    "Growth Phase": "GP",
    "Expansion Phase": "EP",
    "Opportunity Phase": "OP",
  }

  const phaseDescriptions = {
    "Skill Building": "Build strong technical and soft skills. Focus on learning and development.",
    "Growth Phase": "Build consistency, sharpen direction, and strengthen execution.",
    "Expansion Phase": "Expand your horizons with bigger ownership and leadership moves.",
    "Opportunity Phase": "Major career moves and transitions are currently favored.",
  }

  return (
    <div className="insight-cards-container">
      <div className="insight-card phase-card">
        <div className="card-icon">{phaseIcons[careerPhase] || "AI"}</div>
        <h4>Current Career Phase</h4>
        <p className="phase-name">{careerPhase}</p>
        <p className="phase-description">{phaseDescriptions[careerPhase] || "Focus on your next career step."}</p>
      </div>

      <div className="insight-card score-card">
        <div className="card-icon">SC</div>
        <h4>Career Alignment</h4>
        <div className="score-display">
          <div className="score-number">{Math.round(alignmentScore)}</div>
          <p className="score-text">out of 100</p>
        </div>
        <p className="score-feedback">
          {alignmentScore >= 80 ? "Excellent alignment" : alignmentScore >= 60 ? "Good progress" : "Keep improving"}
        </p>
      </div>

      <div className="insight-card opportunity-card">
        <div className="card-icon">OW</div>
        <h4>Opportunity Window</h4>
        <p className="window-dates">
          {opportunityWindow.start_date} to {opportunityWindow.end_date}
        </p>
        <p className="window-type">{opportunityWindow.type}</p>
      </div>

      <div className="insight-card action-card">
        <div className="card-icon">AI</div>
        <h4>Action Items</h4>
        <ul className="action-list">
          <li>Update your portfolio</li>
          <li>Network actively</li>
          <li>Build one visible proof of work</li>
        </ul>
      </div>
    </div>
  )
}

export default InsightCards
