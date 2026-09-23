import fs from 'fs';
import path from 'path';

const root = 'content';
const AUTH_DOMAINS = ['thefa.com','englandfootball.com','premierleague.com','uefa.com','fifa.com','nspcc.org.uk','thecpsu.org.uk','ukcoaching.org','gov.uk','nhs.uk','ncbi.nlm.nih.gov','pubmed.ncbi.nlm.nih.gov','bath.ac.uk','.ac.uk','.edu','who.int','sportengland.org','youthsporttrust.org','bbc.co.uk','thepfa.com','leaguefootball.co.uk'];
const AFFILIATE = ['amazon.co.uk','amazon.com','amzn.to'];

function walk(dir){let out=[];for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);if(fs.statSync(p).isDirectory())out=out.concat(walk(p));else if(f.endsWith('.mdx'))out.push(p);}return out;}

const files = walk(root).sort();
const rows = [];

for(const file of files){
  const raw = fs.readFileSync(file,'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const fm = fmMatch?fmMatch[1]:'';
  const body = fmMatch?fmMatch[2]:raw;
  const cat = file.split('/')[1];
  const slug = path.basename(file,'.mdx');

  // words (strip mdx components/links loosely)
  const plain = body.replace(/<[^>]+>/g,' ').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1');
  const words = (plain.match(/\b[\w'-]+\b/g)||[]).length;

  // links
  const links = [...body.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
  const internal = links.filter(l=>l.startsWith('/')).length;
  const externalLinks = links.filter(l=>/^https?:\/\//.test(l));
  const affiliateLinks = externalLinks.filter(l=>AFFILIATE.some(a=>l.includes(a)));
  const citations = externalLinks.filter(l=>!AFFILIATE.some(a=>l.includes(a)));
  const citHosts = citations.map(l=>{try{return new URL(l).hostname.replace(/^www\./,'');}catch{return '';}});
  const authHits = citHosts.filter(h=>AUTH_DOMAINS.some(d=>h.endsWith(d)||h.includes(d)));
  const distinctAuth = new Set(authHits).size;
  const distinctCitHosts = new Set(citHosts.filter(Boolean)).size;

  // callouts
  const parentNotes = (body.match(/<ParentNote/g)||[]).length;
  const expertOp = (body.match(/<ExpertOpinion/g)||[]).length;
  const expertQA = (body.match(/<ExpertQA/g)||[]).length;
  const callouts = parentNotes+expertOp+expertQA;

  const headings = (body.match(/^##\s+/gm)||[]).length;
  const hasFAQ = /frequently asked questions|^###\s/im.test(body) && /faq|frequently asked/i.test(fm+body);
  const hasAffiliateDisclosure = /<AffiliateDisclosure|<GearPicks/.test(body);
  const isInterview = /interview|ExpertQA/i.test(slug) || expertQA>0 || /interview/i.test(fm);
  const dateMod = /dateModified:/.test(fm);

  const citPer1000 = words? (citations.length/words*1000):0;

  // ---- PILLAR SCORES (0-100) ----
  // Experience: callouts + interview nature
  let exp;
  if(callouts>=3) exp=100; else if(callouts===2) exp=85; else if(callouts===1) exp=55; else exp=15;
  if(isInterview) exp=Math.max(exp,90);

  // Expertise/Depth: words, headings, FAQ
  let depth=0;
  depth += Math.min(words/1600,1)*55;      // up to 55 for ~1600+ words
  depth += Math.min(headings/7,1)*30;       // up to 30 for 7+ sections
  depth += hasFAQ?15:0;
  depth = Math.round(depth);

  // Authoritativeness: citation density + distinct authoritative domains
  let auth=0;
  auth += Math.min(citPer1000/2,1)*55;      // 2 per 1000 target = 55
  auth += Math.min(distinctAuth/4,1)*45;    // 4+ distinct authoritative domains = 45
  auth = Math.round(auth);

  // Trust: has citations + internal linking + affiliate disclosure compliance + freshness
  let trust=0;
  trust += citations.length>0?35:0;
  trust += Math.min(internal/4,1)*30;       // 4+ internal links
  trust += dateMod?10:0;
  // affiliate compliance: if affiliate links present, need disclosure; else neutral full
  if(affiliateLinks.length>0){ trust += hasAffiliateDisclosure?25:0; }
  else { trust += 25; }
  trust = Math.round(trust);

  const overall = Math.round((exp+depth+auth+trust)/4);

  rows.push({cat,slug,words,headings,internal,cit:citations.length,distinctAuth,affiliateLinks:affiliateLinks.length,hasAffiliateDisclosure,callouts,isInterview,hasFAQ,citPer1000:+citPer1000.toFixed(2),exp,depth,auth,trust,overall});
}

// output
rows.sort((a,b)=>a.overall-b.overall);
const isLanding=r=>r.cat==='landing';
const articles=rows.filter(r=>!isLanding(r));
// Raw mechanical scores. eeat-scores.json is the curated record (adds the
// semantic voice/slop/bucket fields); regenerate that from these + the
// semantic reads rather than overwriting it. Run from the repo root: node eeat/score-eeat.mjs
fs.writeFileSync('eeat/eeat-scores-raw.json',JSON.stringify(rows,null,2));

const avg=k=>Math.round(articles.reduce((s,r)=>s+r[k],0)/articles.length);
console.log('ARTICLES:',articles.length,'(excluding',rows.length-articles.length,'landing/tool pages)');
console.log('CORPUS AVG  Overall:',avg('overall'),' Experience:',avg('exp'),' Depth/Expertise:',avg('depth'),' Authoritativeness:',avg('auth'),' Trust:',avg('trust'));
console.log('\n--- Callout gaps (0 callouts, non-interview):',articles.filter(r=>r.callouts===0&&!r.isInterview).length);
console.log('--- Thin citations (<1 per 1000 words):',articles.filter(r=>r.citPer1000<1).length);
console.log('--- Low depth (<1200 words):',articles.filter(r=>r.words<1200).length);
console.log('--- Affiliate links but NO disclosure:',articles.filter(r=>r.affiliateLinks>0&&!r.hasAffiliateDisclosure).map(r=>r.cat+'/'+r.slug));
console.log('\n=== ALL ARTICLES (worst first) ===');
console.log('OVR  Exp Dep Aut Tru | w    cit/1k cal int | article');
for(const r of articles){
  console.log(String(r.overall).padStart(3),String(r.exp).padStart(3),String(r.depth).padStart(3),String(r.auth).padStart(3),String(r.trust).padStart(3),'|',String(r.words).padStart(4),String(r.citPer1000).padStart(5),String(r.callouts).padStart(3),String(r.internal).padStart(3),'|',r.cat+'/'+r.slug);
}
