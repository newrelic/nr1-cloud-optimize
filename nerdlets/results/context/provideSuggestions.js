const { options } = require('../../suggestions-configuration/options');

export default function(entity, config) {
  entity.suggestions = [];
  const rules = options.find(o => o.type === entity.type)?.suggestionsConfig;
  const configuredSuggestions = config?.[entity.type] || {};

  if (rules) {
    const ruleKeys = Object.keys(rules);

    ruleKeys.forEach(ruleKey => {
      const ruleData = rules[ruleKey];

      if (ruleData.type === 'number') {
        const configValue = configuredSuggestions[ruleKey]
          ? parseFloat(configuredSuggestions[ruleKey])
          : null;

        // if config value is 0 do not run the rule
        if (configValue !== 0 && configValue !== '0') {
          // run rule
          const {
            getValue,
            direction,
            response,
            label,
            message,
            defaultValue
          } = ruleData;
          const value = getValue(entity);
          const checkValue = configValue || defaultValue;

          if (value) {
            if (
              (direction === 'below' && value < checkValue) ||
              (direction === 'above' && value > checkValue)
            ) {
              entity.suggestions.push({
                response,
                message: message || `${label} detected`,
                value,
                checkValue
              });
            }
          }
        }
      }
    });
  }

  if (entity.suggestions.length === 0) delete entity.suggestions;
}
