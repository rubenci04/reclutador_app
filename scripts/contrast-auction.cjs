// Contraste WCAG de los pares texto/fondo del panel de puja, el medidor de riesgo y los avisos. Uso: node scripts/contrast-auction.cjs [acento1] [acento2]. Mantener los colores en sync con src/styles/index.css.
const hex=h=>{h=h.replace("#","");if(h.length===3)h=[...h].map(c=>c+c).join("");const n=[0,2,4,6].map(i=>i<h.length?parseInt(h.slice(i,i+2),16):255);return {r:n[0],g:n[1],b:n[2],a:h.length>6?n[3]/255:1}};
const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const panel=hex("#0e2517"),fig=over(hex("#ffffff0d"),panel),banner=hex("#17301f"),blocked=hex("#2a1c10"),chip=hex("#14281e"),head=hex("#0b1a13");
const P1=process.argv[2]||"#00f5d4",P2=process.argv[3]||"#ff5d73";
const pairs=[
["Panel p / award text","#d2e1cb",panel],["Panel label","#c4d4c0",panel],["Input value","#ffffff",hex("#09150d")],
["Figures dt (opacity .8)",over({...hex("#eff2e9"),a:.8},fig),fig],["Figures dd","#eff2e9",fig],["Figures small (opacity .75)",over({...hex("#eff2e9"),a:.75},fig),fig],
["Team status","#dbe8d7",panel],["Team needs","#f4dc63",panel],["Turn strip P1",P1,panel],["Turn strip P2",P2,panel],
["Banner text","#f0f8e8",banner],["Banner list","#d2e1cb",banner],["Blocked banner text","#f0f8e8",blocked],
["Bid chip","#e6f0e7",chip],["Bid chip max","#d5fb76",chip],
["Risk label text","#f4f7ef",panel],["Budget breakdown","#d2e1cb",panel],["Budget offerable","#d5fb76",panel],
["Primary button","#142013",hex("#d5fb76")],["Secondary button","#e8efe4",panel],["Details summary","#e2faab",panel],["Details text","#eff2e9",panel],
["Turn clock text","#f4f7ef",head],["Turn clock late","#ffb4a8",head],
["Risk fill safe (non-text)","#22c55e",over(hex("#ffffff1f"),panel)],["Risk fill warn (non-text)","#eab308",over(hex("#ffffff1f"),panel)],["Risk fill danger (non-text)","#f87171",over(hex("#ffffff1f"),panel)],
];
const rows=pairs.map(([n,f,b])=>{const fc=typeof f==="string"?hex(f):f;const r=ratio(fc,b);const need=n.includes("non-text")?3:4.5;return {n,r:Math.round(r*100)/100,need,ok:r>=need}});
for(const r of rows)console.log(r.n.padEnd(32),String(r.r).padEnd(6),r.ok?"ok":"FAIL (<"+r.need+")");

