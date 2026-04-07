import React from "react";

const insights = {
  rSquared: 0.435,
  findings: [
    {
      title: "Post Timing Matters",
      description:
        "Posting later in the day significantly increases engagement rates.",
      stat: "+0.0039 per hour",
      significance: "p < 0.001",
    },
    {
      title: "Call-to-Action Boosts Engagement",
      description:
        "Posts that include a call-to-action (e.g., donate, learn more) perform significantly better.",
      stat: "+0.0197 engagement",
      significance: "p < 0.001",
    },
    {
      title: "Hashtags Have Minimal Impact",
      description:
        "The number of hashtags used does not significantly affect engagement.",
      stat: "-0.0016",
      significance: "Not significant",
    },
  ],
  recommendations: [
    "Include a clear call-to-action in most posts",
    "Post during high-engagement hours (evenings)",
    "Focus on content quality rather than hashtag quantity",
    "Use storytelling (resident stories) to increase emotional engagement",
  ],
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "20px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
};

const SocialMediaInsights: React.FC = () => {
  return (
    <div style={{ padding: "30px", background: "#f5f7fa", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: "10px" }}>📊 Social Media Insights</h1>
      <p style={{ color: "#555", marginBottom: "30px" }}>
        Insights generated from regression analysis of engagement drivers.
      </p>

      {/* Model Summary */}
      <div style={cardStyle}>
        <h2>Model Overview</h2>
        <p><strong>Model:</strong> OLS Regression</p>
        <p><strong>Target Variable:</strong> Engagement Rate</p>
        <p><strong>R²:</strong> {insights.rSquared}</p>
        <p style={{ color: "#555" }}>
          This model explains about 43.5% of variation in engagement.
        </p>
      </div>

      {/* Key Findings */}
      <div style={cardStyle}>
        <h2>Key Findings</h2>
        {insights.findings.map((item, index) => (
          <div key={index} style={{ marginBottom: "15px" }}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <p style={{ fontSize: "0.9rem", color: "#333" }}>
              <strong>Effect:</strong> {item.stat} |{" "}
              <strong>Significance:</strong> {item.significance}
            </p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div style={cardStyle}>
        <h2>Recommendations</h2>
        <ul>
          {insights.recommendations.map((rec, index) => (
            <li key={index} style={{ marginBottom: "8px" }}>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SocialMediaInsights;