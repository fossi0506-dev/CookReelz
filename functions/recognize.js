// CookReels V3 – Cloudflare Pages Function
// Route: POST /api/recognize
// Set OPENAI_API_KEY as a Cloudflare secret to enable AI extraction.
// Pages Functions are server-side routes; Cloudflare documents file-based routing
// under /functions and supports POST handlers.

function json(data, status=200){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
function stripHtml(s){return (s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();}
function meta(html,key){
  const a=new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`,"i").exec(html);
  const b=new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["'][^>]*>`,"i").exec(html);
  return (a?.[1]||b?.[1]||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"');
}
function heuristic(title,desc,url){
  const text=(title+" "+desc).replace(/\s+/g," ").trim();
  const ingredients=[];
  const lines=desc.split(/\r?\n|[•·]/).map(x=>x.trim()).filter(Boolean);
  const rx=/^\s*(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|EL|TL|Stk\.?|Stück|Prise|Dose|Packung)?\s+.+)$/i;
  for(const l of lines){ if(rx.test(l) && l.length<140) ingredients.push(l); }
  const steps=lines.filter(l=>/^(zuerst|dann|danach|anschließend|anschliessend|mischen|geben|braten|backen|kochen|verrühren|vermischen|servieren|in eine|auf |bei )/i.test(l)).slice(0,8);
  let cat="Sonstiges";
  if(/pasta|nudel|spaghetti|penne/i.test(text))cat="Pasta";
  else if(/pizza/i.test(text))cat="Pizza";
  else if(/salat/i.test(text))cat="Salat";
  else if(/frühstück|breakfast|pancake|porridge/i.test(text))cat="Frühstück";
  else if(/dessert|kuchen|tiramisu|cookie|brownie/i.test(text))cat="Dessert";
  else if(/hähnchen|hackfleisch|rind|fleisch|chicken/i.test(text))cat="Fleisch";
  return {title:(title||"Instagram-Rezept").replace(/\s*\|\s*Instagram.*$/i,"").trim(),summary:"Aus Instagram-Metadaten erkannt.",category:cat,time:"–",servings:"–",level:"–",ingredients,steps,note:ingredients.length||steps.length?"Bitte erkannte Angaben prüfen.":"Instagram hat keine verwertbaren Rezeptangaben geliefert."};
}
async function aiExtract(env, sourceText){
  if(!env.OPENAI_API_KEY)return null;
  const prompt=`Du bist CookReels. Extrahiere aus dem folgenden Instagram-Reel-Metatext ein Rezept. Erfinde keine Zutaten oder Schritte. Wenn Angaben fehlen, verwende leere Arrays oder "–". Antworte ausschließlich als JSON mit den Feldern title, summary, category, time, servings, level, ingredients (Array von Strings), steps (Array von Strings), note. Kategorien: Pasta, Fleisch, Pizza, Salat, Frühstück, Dessert, Sonstiges.\n\nTEXT:\n${sourceText.slice(0,14000)}`;
  const resp=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-5.6-luna",input:prompt,store:false})});
  if(!resp.ok)return null;
  const j=await resp.json();
  let out=j.output_text||"";
  if(!out && Array.isArray(j.output)) for(const item of j.output){for(const c of (item.content||[])){if(c.type==="output_text")out+=c.text||"";}}
  out=out.replace(/^```json\s*/i,"").replace(/```\s*$/,"").trim();
  try{return JSON.parse(out)}catch{return null}
}
export async function onRequestPost({request,env}){
  try{
    const body=await request.json();
    const url=String(body?.url||"").trim();
    if(!/^https?:\/\/(www\.)?instagram\.com\/(reel|p)\//i.test(url))return json({error:"Ungültiger Instagram-Link."},400);
    let html="";
    try{
      const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; CookReels/3.0)","accept":"text/html,application/xhtml+xml"}});
      if(r.ok)html=await r.text();
    }catch{}
    const title=meta(html,"og:title")||meta(html,"twitter:title");
    const desc=meta(html,"og:description")||meta(html,"description")||meta(html,"twitter:description");
    const text=stripHtml(`${title}\n${desc}`);
    if(!text)return json({error:"Instagram hat für diesen Link keine öffentlich abrufbaren Metadaten geliefert. Bitte versuche ein öffentliches Reel oder füge die Caption manuell hinzu."},422);
    const ai=await aiExtract(env,text);
    const recipe=ai||heuristic(title,desc,url);
    recipe.title=recipe.title||title||"Instagram-Rezept";
    recipe.source=url;
    return json({recipe,meta:{title,description:desc,ai:!!ai}});
  }catch(e){return json({error:"Serverfehler bei der Rezept-Erkennung."},500)}
}
