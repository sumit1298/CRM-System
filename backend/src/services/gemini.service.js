const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

/**
 * Generate a summary for a lead
 */
const generateLeadSummary = async (lead) => {
  const prompt = `
    You are a sales assistant. Generate a concise, professional summary for the following lead:
    
    Name: ${lead.name}
    Company: ${lead.company || 'N/A'}
    Email: ${lead.email || 'N/A'}
    Phone: ${lead.phone || 'N/A'}
    Source: ${lead.source || 'N/A'}
    Status: ${lead.status}
    Priority: ${lead.priority}
    Value: $${lead.value || 0}
    Notes: ${lead.notes || 'No notes provided'}
    
    Provide:
    1. A 2-3 sentence summary of this lead
    2. Key talking points for the first call
    3. Recommended next action
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini lead summary error:', error.message);
    return 'Unable to generate summary at this time.';
  }
};

/**
 * Calculate a risk score for an opportunity (0-100)
 */
const calculateRiskScore = async (opportunity) => {
  const prompt = `
    You are a sales risk analyst. Assess the risk of losing the following deal on a scale of 0-100 (0 = no risk, 100 = very high risk).
    
    Deal: ${opportunity.title}
    Company: ${opportunity.company}
    Value: $${opportunity.value}
    Stage: ${opportunity.stage}
    Probability: ${opportunity.probability}%
    Expected Close Date: ${opportunity.expectedCloseDate || 'Not set'}
    Notes: ${opportunity.notes || 'No notes provided'}
    
    Consider:
    - Stage of the deal
    - Time in pipeline
    - Probability percentage
    - Any red flags in notes
    
    Respond with ONLY a JSON object in this format:
    {"riskScore": <number 0-100>, "reason": "<brief explanation>", "recommendation": "<action to mitigate risk>"}
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { riskScore: 50, reason: 'Unable to analyze', recommendation: 'Review deal manually' };
  } catch (error) {
    console.error('Gemini risk score error:', error.message);
    return { riskScore: 50, reason: 'Analysis unavailable', recommendation: 'Review deal manually' };
  }
};

/**
 * Generate a follow-up email for a lead
 */
const generateEmail = async (lead, context) => {
  const prompt = `
    You are a sales professional. Write a professional follow-up email to the following lead:
    
    Lead Name: ${lead.name}
    Company: ${lead.company || 'N/A'}
    Context: ${context || 'Following up on our previous conversation'}
    
    Write a concise, friendly, and professional email (max 150 words) that:
    1. References the context
    2. Adds value
    3. Has a clear call to action
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini email generation error:', error.message);
    return 'Unable to generate email at this time.';
  }
};

/**
 * Suggest next best action for a lead
 */
const suggestNextAction = async (lead, interactions) => {
  const interactionHistory = interactions
    .map((i) => `- ${i.type} on ${i.date}: ${i.subject} - ${i.description || 'No details'}`)
    .join('\n');

  const prompt = `
    You are a sales strategist. Based on the lead information and interaction history, suggest the next best action.
    
    Lead: ${lead.name} (${lead.company || 'N/A'})
    Status: ${lead.status}
    Priority: ${lead.priority}
    
    Interaction History:
    ${interactionHistory || 'No interactions recorded yet'}
    
    Provide:
    1. The single most effective next action
    2. Suggested timing (e.g., "within 24 hours", "this week")
    3. Brief reasoning
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini next action error:', error.message);
    return 'Unable to generate suggestion at this time.';
  }
};

/**
 * Analyze pipeline health
 */
const analyzePipelineHealth = async (opportunities) => {
  const oppSummary = opportunities
    .map((o) => `- ${o.title} (${o.company}): $${o.value}, stage: ${o.stage}, probability: ${o.probability}%`)
    .join('\n');

  const prompt = `
    You are a sales pipeline analyst. Analyze the health of this sales pipeline and provide insights.
    
    Opportunities:
    ${oppSummary || 'No opportunities in pipeline'}
    
    Provide:
    1. Overall pipeline health assessment (Healthy / Needs Attention / At Risk)
    2. Key strengths
    3. Key risks
    4. Top 3 recommendations to improve pipeline performance
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini pipeline health error:', error.message);
    return 'Unable to analyze pipeline at this time.';
  }
};

module.exports = {
  generateLeadSummary,
  calculateRiskScore,
  generateEmail,
  suggestNextAction,
  analyzePipelineHealth,
};