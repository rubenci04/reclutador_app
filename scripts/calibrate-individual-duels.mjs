import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { defenderDuelChance, DUEL_SLOPE, DUEL_LIMIT } = await vite.ssrLoadModule('/src/features/local-match/interactive/individualDuels.ts')
  const { createSeededRandom } = await vite.ssrLoadModule('/src/features/local-match/seededRandom.ts')
  const { createSession, advanceBlock, submitPlay } = await vite.ssrLoadModule('/src/features/local-match/interactive/session.ts')
  const { keepWindow, resolveQuietWindow } = await vite.ssrLoadModule('/src/features/local-match/interactive/liveModel.ts')
  const { GLOBAL_CURRENT: catalog } = await vite.ssrLoadModule('/src/features/player-catalog/globalCollection.ts')
  const { liveInput } = await vite.ssrLoadModule('/src/features/local-match/interactive/liveFixtures.test-support.ts')
  const must = (r) => { if (!r.ok) throw Error(r.error); return r.value }
  const duels = [[80,80],[80,85],[80,90],[85,80],[90,80],[90,90],[75,95]].map(([attacker,defender]) => {
    const theoretical = defenderDuelChance(attacker,defender), random=createSeededRandom(`ovr:${attacker}:${defender}`), samples=100000
    let defenderWins=0;for(let i=0;i<samples;i++)if(random()<theoretical)defenderWins++
    return {attacker,defender,samples,theoretical,observed:defenderWins/samples,defenderWins,standardError:Math.sqrt(theoretical*(1-theoretical)/samples)}
  })
  const profiles=JSON.parse(readFileSync('docs/qa/SIM-005R-04B-profiles.json','utf8')).results
  const real=(name)=>{const p=profiles.find(r=>r.name===name);return { catalog, localLineup:p.lineups.local,cpuLineup:p.lineups.cpu,catalogVersion:'catalog_v1',rulesVersion:'local-match-v2',actionModel:'action-v3',budget:150,formations:{local:'4-3-3',cpu:'4-3-3'},rosterBonus:true,tactics:{version:'tactics-v1',local:'WIDE_PLAY',cpu:'LOW_BLOCK'}}}
  const synthetic=(delta)=>{const input=liveInput();return {...input,catalog:input.catalog.map(p=>{const ovr=p.id.startsWith('live_local')?80+Math.max(0,delta):80+Math.max(0,-delta);return {...p,overall_rating:ovr,att_rating:ovr,def_rating:ovr,phy_rating:ovr,men_rating:ovr}}),tactics:{version:'tactics-v1',local:'NEUTRAL',cpu:'NEUTRAL'}}}
  const teams=[['synthetic_equal',synthetic(0)],['synthetic_local_plus10',synthetic(10)],['synthetic_local_minus10',synthetic(-10)],['real_balanced',real('balanced')],['real_physical',real('physical_forward')]]
  const matches=[]
  for(const [name,input]of teams)for(const version of ['historical','halftime-ovr-v1']){
    console.log(name,version)
    const totals={goals:0,localGoals:0,cpuGoals:0,recoveries:0,centers:0,contested:0,headers:0,aerialGoals:0,carryWon:0,carryLost:0,moments:0,opportunities:0,wins:0,draws:0,losses:0};const samples=300
    for(let seed=0;seed<samples;seed++){
      let s=must(createSession({...input,seed:`duel-calibration:${name}:${seed}`},{sessionId:'calibration',benchMode:{local:'manual-v1',cpu:'manual-v1'},moments:{version:'match-moments-v1'},aerial:{version:'directed-header-v1'},...(version==='historical'?{}:{matchRules:{version:'halftime-ovr-v1'}})}))
      for(let guard=0;s.phase!=='FINISHED'&&guard<100;guard++){
        if(s.phase==='PLAY'){const p=s.kernel.partial.play;const choice=p.node==='DEFEND'?'INTERCEPT':p.node==='FINISH'?'CROSS':p.node==='HEADER'?'FAR_POST':p.options.find(o=>o.available).choice;s=must(submitPlay(s,{version:'interactive-play-command-v1',id:`${p.id}:${p.node}`,sessionId:s.sessionId,expectedRevision:s.revision,playId:p.id,node:p.node,choice}))}
        else s=must(s.phase==='WINDOW'?(version==='historical'||s.window.applyBlock===3?keepWindow(s):resolveQuietWindow(s)):advanceBlock(s))
      }
      if(s.phase!=='FINISHED')throw Error('incomplete_match')
      const events=s.kernel.blocks.flatMap(b=>b.events),count=(predicate)=>events.filter(predicate).length
      const opportunities=count(e=>e.type==='attack');if(opportunities!==24)throw Error('wrong_opportunities')
      const localGoals=count(e=>e.type==='goal'&&e.side==='local'),cpuGoals=count(e=>e.type==='goal'&&e.side==='cpu')
      if(localGoals!==s.kernel.score.local||cpuGoals!==s.kernel.score.cpu)throw Error('wrong_score')
      totals.goals+=localGoals+cpuGoals;totals.localGoals+=localGoals;totals.cpuGoals+=cpuGoals;totals.recoveries+=count(e=>e.type==='recovery');totals.centers+=count(e=>e.step==='AERIAL_CROSS');totals.contested+=count(e=>e.step==='AERIAL_CONTEST');totals.headers+=count(e=>e.step==='AERIAL_WON');totals.aerialGoals+=count(e=>e.step==='DIRECTED_HEADER_GOAL');totals.carryWon+=count(e=>e.step==='CARRY_OK');totals.carryLost+=count(e=>e.step==='CARRY_LOST');totals.moments+=s.kernel.director.selected.length;totals.opportunities+=opportunities
      totals[localGoals>cpuGoals?'wins':localGoals<cpuGoals?'losses':'draws']++
    }
    matches.push({name,version,samples,totals,perMatch:Object.fromEntries(Object.entries(totals).map(([k,n])=>[k,n/samples])),aerialWinRate:totals.contested?totals.headers/totals.contested:null})
  }
  const report={baseCommit:'81ca740',version:'halftime-ovr-v1',formula:{slope:DUEL_SLOPE,minimum:DUEL_LIMIT,maximum:1-DUEL_LIMIT,neutralContext:true},duels,matchMethod:'300 seeds per team/version. Five profiles, 3000 full matches. Same seed prefix, initial squads/tactics and CROSS/FAR_POST/INTERCEPT policies. All windows KEEP, no substitutes or tactical changes, isolating sporting extension. Synthetic ratings are explicitly laboratory inputs; real profiles reuse R-04B legal disjoint GLOBAL_CURRENT elevens. Once outcomes diverge, subsequent sporting draws need not be counterfactual identical. No historical formulas/golden updated.',matches}
  writeFileSync('docs/qa/SIM-005R-05-calibration.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({duels,matches:matches.map(m=>({name:m.name,version:m.version,goals:m.perMatch.goals,recoveries:m.perMatch.recoveries,centers:m.totals.centers,headers:m.totals.headers,aerialGoals:m.totals.aerialGoals,moments:m.perMatch.moments}))},null,2))
} finally { await vite.close() }
