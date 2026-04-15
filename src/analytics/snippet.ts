/**
 * Generiert das Analytics-Snippet für Demo-Websites.
 * Muss vor </body> eingefügt werden.
 */

export function analyticsSnippet(demoSlug: string, trackerUrl: string): string {
  return `<!-- Analytics -->
<script>
(function(){
  var d="${demoSlug}",u="${trackerUrl}/t";
  var r=document.referrer||"";
  new Image().src=u+"?d="+d+"&r="+encodeURIComponent(r)+"&_="+Date.now();
})();
</script>`;
}

/**
 * Fügt das Snippet in eine HTML-Datei ein (vor </body>).
 */
export function injectAnalytics(html: string, demoSlug: string, trackerUrl: string): string {
  const snippet = analyticsSnippet(demoSlug, trackerUrl);
  if (html.includes('</body>')) {
    return html.replace('</body>', snippet + '\n</body>');
  }
  return html + '\n' + snippet;
}
