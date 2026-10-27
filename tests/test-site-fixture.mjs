/** Build historical fixture envelopes without copying fields introduced later.
 * Document/template data is deliberately untouched, so feature-gate tests can
 * still detect under-versioned content instead of silently downgrading it.
 */
export function testSiteVersion(source, version) {
  const keys = ['activeDocumentId','bin','browserImportComplete','categories','documents','format','homeDocumentId','siteId','templates'];
  if (version >= 4) keys.push('siteNavigation');
  if (version >= 5) keys.push('globalTemplates');
  if (version >= 6) keys.push('publications');
  if (version >= 8) keys.push('websiteDesign');
  if (version >= 12) keys.push('defaultNavigationMenuId','navigationAssignments','navigationMenus');
  return { ...Object.fromEntries(keys.filter(key => source[key] !== undefined).map(key => [key,source[key]])), version };
}
