import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMOS_DIR = resolve(__dirname, '../../demos');
const OUTREACH_DIR = resolve(__dirname, '../../outreach');

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function deploy(demoFolder: string, projectName: string): string | null {
  const demoPath = resolve(DEMOS_DIR, demoFolder);
  if (!existsSync(demoPath)) {
    console.log(`❌ Demo-Ordner nicht gefunden: demos/${demoFolder}`);
    return null;
  }

  console.log(`🚀 Deploye ${demoFolder} als "${projectName}"...`);

  try {
    const output = execSync(`vercel --yes --name ${projectName}`, {
      cwd: demoPath,
      encoding: 'utf-8',
      timeout: 60000,
    });

    // URL extrahieren
    const aliasMatch = output.match(/Aliased:\s+(https:\/\/[^\s\[]+)/);
    const url = aliasMatch ? aliasMatch[1] : null;

    if (url) {
      console.log(`✅ Live: ${url}`);
    } else {
      console.log(`✅ Deployed (URL nicht erkannt)`);
    }
    return url;
  } catch (err: any) {
    console.log(`❌ Deploy fehlgeschlagen: ${err.message.slice(0, 100)}`);
    return null;
  }
}

function updateOutreachDrafts(demoFolder: string, newUrl: string) {
  if (!existsSync(OUTREACH_DIR)) return;

  const files = readdirSync(OUTREACH_DIR).filter(f => f.endsWith('.json') && !f.includes('-preview'));

  for (const f of files) {
    const path = resolve(OUTREACH_DIR, f);
    const draft = JSON.parse(readFileSync(path, 'utf-8'));

    // Wenn der Draft einen demoUrl hat der auf den alten Ort zeigt
    if (draft.lead?.demoUrl && (
      draft.lead.demoUrl.includes(`demos/${demoFolder}`) ||
      draft.lead.demoUrl.includes(`github.io`) && draft.lead.name && slugify(draft.lead.name) === slugify(demoFolder.replace('demos/', ''))
    )) {
      const oldUrl = draft.lead.demoUrl;
      draft.lead.demoUrl = newUrl;

      // HTML updaten
      if (draft.html) {
        draft.html = draft.html.replace(oldUrl, newUrl);
        // Auch GitHub Pages URLs ersetzen
        draft.html = draft.html.replace(/https:\/\/levilg000\.github\.io\/website-selling-tool\/demos\/[^"']+/g, newUrl);
      }

      writeFileSync(path, JSON.stringify(draft, null, 2), 'utf-8');

      // Preview auch updaten
      const previewPath = path.replace('.json', '-preview.html');
      if (existsSync(previewPath) && draft.html) {
        writeFileSync(previewPath, draft.html, 'utf-8');
      }

      console.log(`   📧 Outreach-Draft aktualisiert: ${f} → ${newUrl}`);
    }
  }
}

async function main() {
  const [target] = process.argv.slice(2);

  if (!target) {
    console.log(`
🚀 Deploy Tool

Usage: npm run deploy -- <demo-ordner> [projekt-name]
       npm run deploy -- all

Beispiele:
  npm run deploy -- elektro-hartmann
  npm run deploy -- butterblume butterblume-barendorf
  npm run deploy -- all                    (alle Demos deployen)

Deployed auf Vercel und aktualisiert automatisch Outreach-Drafts mit der neuen URL.
`);
    // Zeige verfügbare Demos
    if (existsSync(DEMOS_DIR)) {
      const demos = readdirSync(DEMOS_DIR).filter(d => existsSync(resolve(DEMOS_DIR, d, 'index.html')));
      console.log(`Verfügbare Demos: ${demos.join(', ')}`);
    }
    return;
  }

  if (target === 'all') {
    const demos = readdirSync(DEMOS_DIR).filter(d => existsSync(resolve(DEMOS_DIR, d, 'index.html')));
    console.log(`\n🚀 Deploye alle ${demos.length} Demos...\n`);

    for (const demo of demos) {
      const url = deploy(demo, demo);
      if (url) updateOutreachDrafts(demo, url);
      console.log('');
    }
    return;
  }

  const projectName = process.argv[3] || target;
  const url = deploy(target, projectName);
  if (url) updateOutreachDrafts(target, url);
}

main().catch(console.error);
