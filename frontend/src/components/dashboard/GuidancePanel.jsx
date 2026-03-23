function GuidancePanel({ guidance }) {
  return (
    <div className="guidance-panel">
      <h3>📋 Career Guidance</h3>
      
      <div className="guidance-content">
        <div className="guidance-section focus-section">
          <div className="guidance-icon">🎯</div>
          <div className="guidance-text">
            <h4>Focus On</h4>
            <p>{guidance.focus}</p>
          </div>
        </div>

        <div className="guidance-section avoid-section">
          <div className="guidance-icon">⚠️</div>
          <div className="guidance-text">
            <h4>Avoid</h4>
            <p>{guidance.avoid}</p>
          </div>
        </div>

        <div className="guidance-section reason-section">
          <div className="guidance-icon">💡</div>
          <div className="guidance-text">
            <h4>Why?</h4>
            <p>{guidance.reason}</p>
          </div>
        </div>
      </div>

      {guidance.recommendations && guidance.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h4>Recommendations</h4>
          <ul className="recommendations-list">
            {guidance.recommendations.map((rec, idx) => (
              <li key={idx}>
                <span className="rec-icon">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default GuidancePanel
