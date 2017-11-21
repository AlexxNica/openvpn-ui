'use strict';

/**
 * Minimalist template engine, only designed to handle templated .ovpn configs.
 * @param {string} tpl template for config file
 * @param {object} certs values for the template
 */
const tpl = module.exports = (tpl, values) => {
  const vars = Object.keys(values);
  let result = tpl;

  vars.forEach(varName => {
    const value = values[varName].trim();
    const pattern = `{{${varName}}}`;
    result = result.replace(pattern, value);
  });
  
  return result;
}
