const sanitizeMongoQuery = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMongoQuery(item));
  }

  const safe = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (key.startsWith('$')) {
      return;
    }

    if (typeof value === 'object' && value !== null) {
      const nested = sanitizeMongoQuery(value);
      if (nested && typeof nested === 'object' && Object.keys(nested).length > 0) {
        safe[key] = nested;
      }
      return;
    }

    safe[key] = value;
  });

  return safe;
};

module.exports = sanitizeMongoQuery;
