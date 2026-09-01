const sanitizeAIInput = (value) => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
};

const validateAIResponse = (value, options = {}) => {
  if (typeof value !== 'string') {
    return 'I could not generate a valid answer from the CRM context.';
  }

  const { maxLength = 3000, mustContainText = true } = options;
  const cleaned = value.trim();

  if (!cleaned && mustContainText) {
    return 'I could not generate a valid answer from the CRM context.';
  }

  if (cleaned.length > maxLength) {
    return `${cleaned.slice(0, maxLength - 3).trim()}...`;
  }

  return cleaned;
};

module.exports = {
  sanitizeAIInput,
  validateAIResponse,
};
