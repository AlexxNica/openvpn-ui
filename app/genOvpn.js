'use strict';

/**
 * Generate the .ovpn config file from template using given certs
 * @param {string} tpl template for .ovpn config file
 * @param {object} certs object containing cert data
 */
const genOvpn = module.exports = (tpl, certs) => {
  // technically this is a mini-template engine - since we do not want HTML escaping and support
  // a strictly limited set of placeholders handlebars is not a good choice here
  const vars = ['privateKey', 'certificate', 'ca', 'dh'];
  let result = tpl;

  vars.forEach(varName => {
    const value = certs[varName].trim();
    const pattern = `{{${varName}}}`;
    result = result.replace(pattern, value);
  });
  
  return result;
}
