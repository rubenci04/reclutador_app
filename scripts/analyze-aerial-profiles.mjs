import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'
const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' })
try {
 const { GLOBAL_CURRENT: catalog } = await vite.ssrLoadModule('/src/features/player-catalog/globalCollection.ts')
 const { formationSlots } = await vite.ssrLoadModule('/src/features/tactics/formations.ts')
 const tree = await vite.ssrLoadModule('/src/features/local-match/interactive/attackTree.ts')
 const aerial = await vite.ssrLoadModule('/src/features/local-match/interactive/directedHeader.ts')
 const { createSession, advanceBlock, submitPlay } = await vite.ssrLoadModule('/src/features/local-match/interactive/session.ts')
 const { currentPower, keepWindow } = await vite.ssrLoadModule('/src/features/local-match/interactive/liveModel.ts')
 const { initialCheckpoint, nextCheckpoint } = await vite.ssrLoadModule('/src/features/local-match/interactive/random.ts')
 const forwards = catalog.filter(p=>p.position==='DEL'), defenders=catalog.filter(p=>p.position==='DEF'), keepers=catalog.filter(p=>p.position==='ARQ')
 const by = (pool, score) => [...pool].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0]
 const balanced = (pool, rating=83) => by(pool,p=>-Math.abs(p.overall_rating-rating))
 const roles = { physical:by(forwards,p=>p.phy_rating*.7+p.att_rating*.3), technical:by(forwards,p=>p.men_rating*.5+p.att_rating*.5), wing:by(forwards,tree.crosserQuality), defense:by(defenders,tree.defenderQuality), keeper:by(keepers,tree.keeperQuality) }
 const average = balanced(forwards), averageWing=by(forwards.filter(p=>p.id!==average.id),p=>-Math.abs(p.overall_rating-82)), averageDef=balanced(defenders), averageKeeper=balanced(keepers)
 const scenarios=[
  ['balanced',averageWing,average,averageDef,averageKeeper],
  ['physical_forward',averageWing,roles.physical,averageDef,averageKeeper],
  ['technical_forward',averageWing,roles.technical,averageDef,averageKeeper],
  ['high_quality_wing',roles.wing,roles.physical,averageDef,averageKeeper],
  ['superior_aerial_defender',averageWing,roles.physical,roles.defense,averageKeeper],
  ['superior_keeper',averageWing,roles.physical,averageDef,roles.keeper],
 ]
 const results=[]
 for(const [name,crosser,target,defender,keeper]of scenarios){
  const used=new Set([crosser.id,target.id,defender.id,keeper.id]);const lineups={local:{LW:crosser.id,ST:target.id},cpu:{GK:keeper.id}}
  // Real disjoint on-pitch records. Place the chosen defender in the central slot that wins the stable tie-break.
  const centralOther=by(defenders.filter(p=>!used.has(p.id)&&p.id>defender.id),p=>-Math.abs(p.overall_rating-83)) ?? by(defenders.filter(p=>!used.has(p.id)),p=>-Math.abs(p.overall_rating-83))
  lineups.cpu.LCB=defender.id;lineups.cpu.RCB=centralOther.id;used.add(centralOther.id)
  for(const side of ['local','cpu'])for(const slot of formationSlots('4-3-3'))if(!lineups[side][slot.id]){
   const pool=catalog.filter(p=>p.position===slot.position&&!used.has(p.id)&&(side!=='local'||slot.id!=='RW'||p.att_rating<target.att_rating))
   const p=balanced(pool);if(!p)throw Error('missing_legal_slot');lineups[side][slot.id]=p.id;used.add(p.id)
  }
  const input={catalog,localLineup:lineups.local,cpuLineup:lineups.cpu,catalogVersion:'catalog_v1',rulesVersion:'local-match-v2',actionModel:'action-v3',seed:`profile-${name}`,budget:150,formations:{local:'4-3-3',cpu:'4-3-3'},rosterBonus:true,tactics:{version:'tactics-v1',local:'WIDE_PLAY',cpu:'LOW_BLOCK'}}
  const created=createSession(input,{sessionId:'profile',moments:{version:'match-moments-v1'},aerial:{version:'directed-header-v1'}});if(!created.ok)throw Error(created.error)
  const effective={local:currentPower(created.value,'local').effective,cpu:currentPower(created.value,'cpu').effective}
  const ctx={minute:45,catalog,local:{lineup:lineups.local,formation:'4-3-3'},cpu:{lineup:lineups.cpu,formation:'4-3-3'},effective,strategy:{local:'WIDE_PLAY',cpu:'LOW_BLOCK'},effectiveOnly:true}
  const targetPlaced=tree.crossTarget(ctx.local,catalog,crosser.id);const actualTarget=targetPlaced.player
  const crossDef=tree.rivalDefenderFor(targetPlaced.slot.x,ctx.cpu,catalog);const shotDef=tree.rivalDefenderFor(17,ctx.cpu,catalog)
  const play={id:'profile',node:'FINISH',protagonistId:lineups.local.LCM,receiverId:crosser.id,sector:'LEFT',options:[{choice:'CROSS',available:true,playerId:actualTarget.id,rivalId:crossDef.id},{choice:'SHOOT',available:true,playerId:crosser.id,rivalId:shotDef.id}]}
  const edge=tree.playContext(ctx), delivery=aerial.deliveryChance(crosser,crossDef,edge), duel=aerial.aerialDuelChance(actualTarget,crossDef,edge)
  const policies={}
  for(const policy of ['SHOOT',...aerial.HEADER_DIRECTIONS]){
   let goals=0,headers=0,cleared=0;const seeds=20000
   for(let seed=0;seed<seeds;seed++){
    let rng=initialCheckpoint(`${name}:${seed}`);const random=()=>{const next=nextCheckpoint(rng);rng=next.checkpoint;return next.value}
    let resolved
    if(policy==='SHOOT')resolved=tree.resolvePlay(ctx,play,'SHOOT',random)
    else {const cross=aerial.sendDirectedCross(ctx,play,random);if(!cross.next){cleared++;continue} headers++;resolved=aerial.resolveDirectedHeader(ctx,cross.next,policy,cross.keeperPlan,random)}
    if(resolved.events.some(e=>e.type==='goal'))goals++
   }
   const analytic=policy==='SHOOT'?(1-tree.blockChance(crosser,shotDef,edge))*tree.shotOnTargetChance(crosser)*tree.scoringChance(tree.shooterQuality(crosser),keeper,edge):delivery*duel*aerial.HEADER_DIRECTIONS.reduce((sum,k)=>{const p=aerial.directedChances(actualTarget,crossDef,keeper,policy,k,edge);return sum+(1-p.block)*p.onTarget*p.goal/3},0)
   policies[policy]={seeds,goals,headers,cleared,rate:goals/seeds,expectedRate:analytic}
  }
  const record=p=>({id:p.id,name:p.name,ATT:p.att_rating,DEF:p.def_rating,PHY:p.phy_rating,MEN:p.men_rating,OVR:p.overall_rating})
  results.push({name,spent:{local:created.value.kernel.local.spent,cpu:created.value.kernel.cpu.spent},actors:{crosser:record(crosser),target:record(actualTarget),aerialDefender:record(crossDef),shotDefender:record(shotDef),keeper:record(keeper)},lineups,effective,edge,policies})
 }
 const cases=[];const needed=new Set(['AERIAL_CLEAR','DIRECTED_HEADER_GOAL','DIRECTED_HEADER_SAVE','DIRECTED_HEADER_WIDE','DIRECTED_HEADER_OVER'])
 const setup=results.find(r=>r.name==='physical_forward')
 const must=x=>{if(!x.ok)throw Error(x.error);return x.value}
 for(let seed=0;seed<300&&needed.size;seed++)for(const direction of aerial.HEADER_DIRECTIONS){
  let state=must(createSession({catalog,localLineup:setup.lineups.local,cpuLineup:setup.lineups.cpu,catalogVersion:'catalog_v1',rulesVersion:'local-match-v2',actionModel:'action-v3',seed:`aerial-playtest-${seed}`,budget:150,formations:{local:'4-3-3',cpu:'4-3-3'},rosterBonus:true,tactics:{version:'tactics-v1',local:'WIDE_PLAY',cpu:'LOW_BLOCK'}},{sessionId:'aerial-playtest',moments:{version:'match-moments-v1'},aerial:{version:'directed-header-v1'}}))
  while(state.phase!=='FINISHED'){
   if(state.phase==='PLAY'){
    const p=state.kernel.partial.play
    state=must(submitPlay(state,{version:'interactive-play-command-v1',id:`${p.id}:${p.node}`,sessionId:state.sessionId,playId:p.id,node:p.node,expectedRevision:state.revision,choice:p.node==='DIRECTION'?p.options.find(o=>o.available).choice:p.node==='DEFEND'?'INTERCEPT':p.node==='HEADER'?direction:p.options.find(o=>o.choice==='CROSS'&&o.available)?.choice??'SHOOT'}))
   }else state=must(state.phase==='WINDOW'?keepWindow(state):advanceBlock(state))
  }
  for(const e of state.kernel.blocks.flatMap(b=>b.events))if(needed.has(e.step)){needed.delete(e.step);cases.push({ending:e.step,seed:`aerial-playtest-${seed}`,playId:`play-${e.minute}`,direction})}
 }
 if(needed.size)throw Error('missing_playtest_cases')
 writeFileSync('docs/qa/SIM-005R-04B-playtest-cases.json',JSON.stringify({scenario:'physical_forward',cases},null,2)+'\n')
 const report={baseCommit:'1969cd8',version:'directed-header-v1 unchanged',note:'Diagnostic script, not a test. GLOBAL_CURRENT real catalog records, editorial ratings as stored. 20,000 seeds per policy, conditional on FINISH reached. Disjoint 4-3-3 elevens; 150M current-player budget, legal disjoint lineups validated by createSession. Same draws sampled per policy for comparison, no sporting changes. WIDE_PLAY vs LOW_BLOCK and existing roster bonuses via currentPower. No coach hired. Expected rates computed from unchanged production probability functions.',results}
 writeFileSync('docs/qa/SIM-005R-04B-profiles.json',JSON.stringify(report,null,2)+'\n')
 console.log(results.map(r=>({name:r.name,actors:Object.fromEntries(Object.entries(r.actors).map(([k,p])=>[k,p.name])),rates:Object.fromEntries(Object.entries(r.policies).map(([k,p])=>[k,+(p.expectedRate*100).toFixed(2)]))})))
} finally {await vite.close()}
