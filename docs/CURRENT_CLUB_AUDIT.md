# Auditoría de clubes actuales e históricos

Fecha de corte: **17/10/2026**. Evidencia: `src/data/player-clubs/2026-10-17.json`. Catálogo deportivo: 150 jugadores de catalog_v1, conservado íntegro.

## Cobertura acumulada

Fecha de corte vigente: **18/10/2026** (revisión H4). Capturas anteriores conservadas: `src/data/player-clubs/2026-10-17.json` (25 identidades) y `src/data/player-clubs/2026-10-18.json`. Catálogo deportivo: 150 jugadores de catalog_v1, ratings, precios e IDs intactos.

- Cobertura exacta al 2026-10-18: 125/150 revisados (83,33 %).
- 85 verificados (56,67 %): 64 ACTIVE con club actual identificado y 21 RETIRED sin club actual.
- 40 pendientes (UNKNOWN/PENDING, sin club actual deducido) y 25 sin revisar. No se deduce club actual de club_tag ni se interpreta una salida como FREE_AGENT.
- FREE_AGENT está soportado y probado con fixtures; ningún jugador real recibe ese estado sin evidencia vigente.
- Criterio de VERIFIED en H4: fuente oficial del club/liga/federación, o al menos una fuente fechada entre mayo y octubre de 2026 (o un contrato que cubra esa fecha) que afirme la situación, coincidente con otras. Contradicciones, fuentes sin fecha o de baja calidad quedan PENDING.
- Historial: solo el club actual como período verificado; la trayectoria completa no se presenta como verificada.

## Contrato y registro de clubes

Player.club_tag mantiene el club de la versión deportiva evaluada. Los metadatos separados contienen referenceClubId, currentClubId, careerStatus, clubHistory, asOfDate, sourceUrl, verificationStatus, revision y auditNote. referenceClubId debe seguir coincidiendo con club_tag; los ratings, precios, IDs y química no dependen de esta auditoría.

ACTIVE exige club canónico y fuente. RETIRED significa retiro profesional como jugador, no ausencia de trabajos técnicos ni participación amateur. FREE_AGENT requiere evidencia actual de ausencia de contrato. UNKNOWN indica situación insuficientemente acreditada. PENDING/CONFLICT nunca autorizan una pertenencia actual visible.

clubHistory reutiliza CareerSpell y agrega evidencia y corte por período. Las fechas desconocidas quedan ausentes; no se inventan días de transferencia. Una referencia deportiva no se convierte automáticamente en trayectoria verificada.

clubRegistry reutiliza los 67 IDs/nombres cromáticos y agrega diez identidades mencionadas en las fuentes revisadas: Inter Miami, Pumas UNAM, Rosario Central, Los Angeles FC, Belgrano, Genoa, Santos, Monterrey, Fluminense y Hajduk Split. Registrar una identidad no confirma una pertenencia actual. Alias explícitos resuelven Inter Miami CF/inter_miami_cf a inter_miami, LAFC a los_angeles_fc y Atlético de Madrid a atletico_madrid. No hay fuzzy matching ni creación de IDs por ortografías diferentes.

ClubBadge consulta este registro para el nombre y mantiene las paletas existentes. Club conocido sin paleta: ficha neutral con su nombre correcto, no una paleta histórica de otro club. No se incorporan emblemas oficiales, fotos ni paletas nuevas.

## Procedimiento de actualización

1. Identificar la persona por ID canónico y verificar fuente de club, liga o federación. Una baja o vencimiento no acredita que siga libre al corte.
2. Registrar fecha de corte, fuente y notas, manteniendo UNKNOWN/PENDING cuando la evidencia no alcanza. La fecha de publicación, el corte y los años de trayectoria son conceptos distintos.
3. Conservar los archivos anteriores; crear una nueva revisión fechada y añadirla explícitamente al conjunto importado en playerClubs.ts. No sobrescribir capturas históricas ni modificar referenceClubId.
4. Ejecutar validatePlayerClubSnapshots y las pruebas. El límite de importación exige IDs válidos, referencia intacta, estados consistentes, fechas reales, fuentes HTTPS y unicidad playerId/fecha/revisión. Referencias o evidencias inválidas se muestran como UNKNOWN.
5. capturePlayerClubs(player, fecha) selecciona la revisión más reciente no posterior al corte y devuelve una copia independiente. El corte predeterminado queda fijado en 2026-10-17; incorporar otro archivo no avanza silenciosamente esa fecha. Las exportaciones futuras deben retener la captura completa, incluido revision, en lugar de resolver nuevamente «lo último».
6. Las partidas actuales usan el catálogo deportivo y su club_tag original. La actualización no entra en subastas, química, draft persistido ni simulador y no necesita migración. No existía persistencia de clubes actuales de partidas anteriores que recuperar; no se inventa retrospectivamente ese dato.
7. Actualizar cobertura e informe, ejecutar typecheck, lint, tests no estadísticos, build y catalog:audit. No hay descargas ni consultas API en runtime, scraping automático, cron o servicios externos.

## Límites de la evidencia

- Messi: fuente oficial indicada confirma renovación en Inter Miami hasta MLS 2028 y llegada en 2023. Barcelona se conserva como referencia 2019.
- Romero: fuente oficial indicada confirma transferencia desde Tottenham y contrato hasta junio de 2031. **15/08/2026 se registra como USER_SUPPLIED**: fecha aportada por el encargo, no visible independientemente como publicación en el texto extraído. Club/transferencia verificados; comprobación independiente del día exacto pendiente.
- Navas: conferencia oficial de Pumas del 08/10/2026 confirma afiliación; no se usa su referencia Real Madrid 2018 como actualidad.
- Ramos: salida oficial de Monterrey encontrada; destino o condición libre vigente no acreditados.
- Thiago Silva: contrato completo consultado termina en junio de 2026; titulares de retorno posteriores no se consolidaron como evidencia del nuevo vínculo. Pendiente.
- Busquets: texto extraído anuncia retiro al terminar «la temporada actual» sin datación explícita. Pendiente la fecha efectiva; una ficha antigua no acredita actualidad.
- Xhaka: ficha UEFA 2026/27 localizada, extracción insuficiente de afiliación. Tienda y noticias secundarias no bastan para esta confirmación.
- Lewandowski: despedida oficial de Barcelona el 17/05/2026; destino posterior no verificado. No se lo considera libre por inferencia.
- Bravo: vínculo histórico con Betis confirmado; retiro comunicado en prensa secundaria no consolidado con fuente oficial en esta pasada.

## Filtros temáticos futuros

| Concepto | Evidencia necesaria | No sustituir por |
|---|---|---|
| Actualmente en una liga | Club actual verificado al corte y membresía del club en esa liga/temporada | club_tag o una antigua trayectoria |
| Participó históricamente en una liga | Períodos verificados de club/liga y rango compatible | Nacionalidad o contrato actual |
| Nacionalidad | Código de asociación FIFA del Player | País del club |
| Etapa histórica | reference_year/era, referencia deportiva y evidencia del período | Club actual |

Fútbol Argentino exigirá trayectorias verificadas en clubes argentinos, incluyendo extranjeros y jugadores hoy en otras ligas. La trayectoria de Belgrano acreditada para Romero no habilita por sí sola la modalidad: no se modificó el filtro existente ni se rellenó automáticamente su registro de metadatos.

## Registro de los 25 revisados

Todas las filas tienen corte 2026-10-17. VERIFIED se refiere a la situación actual; la referencia proviene del contrato deportivo. PENDING conserva currentClubId null y UNKNOWN. Una fuente en fila pendiente representa material consultado, no una pertenencia actual confirmada.


| ID | Futbolista | Club de referencia | Club actual | Estado | Evidencia |
|---|---|---|---|---|---|
| plr_038 | Lionel Messi | barcelona | inter_miami | ACTIVE / VERIFIED | [Fuente revisada](https://es.intermiamicf.com/noticias/inter-miami-cf-renueva-el-contrato-de-leo-messi) |
| plr_016 | Cristian Romero | tottenham_hotspur | atletico_madrid | ACTIVE / VERIFIED | [Fuente revisada](https://www.atleticodemadrid.com/noticias/cristian-cuti-romero-ficha-por-el-atletico-de-madrid) |
| plr_004 | Keylor Navas | real_madrid | pumas_unam | ACTIVE / VERIFIED | [Fuente revisada](https://pumas.mx/noticias/3703) |
| plr_007 | Sergio Ramos | real_madrid | — | UNKNOWN / PENDING | [Fuente revisada](https://www.rayados.com/es/news/lista/page/377) |
| plr_009 | Marcelo | real_madrid | — | RETIRED / VERIFIED | [Fuente revisada](https://www.realmadrid.com/en-US/news/club/announcements/cominicado-oficial-06-02-2025) |
| plr_011 | Diego Godín | atletico_madrid | — | RETIRED / VERIFIED | [Fuente revisada](https://www.atleticodemadrid.com/noticias/diego-godin-anuncio-su-retirada-del-futbol) |
| plr_012 | Thiago Silva | paris_saint_germain | — | UNKNOWN / PENDING | [Fuente revisada](https://www.fluminense.com.br/noticia/thiago-silva-e-registrado-no-bid-e-esta-liberado-para-reestrear-pelo-fluminense) |
| plr_023 | Luka Modrić | real_madrid | ac_milan | ACTIVE / VERIFIED | [Fuente revisada](https://www.acmilan.com/en/news/articles/media/2026-07-23/official-statement-luka-modric) |
| plr_024 | Kevin De Bruyne | manchester_city | napoli | ACTIVE / VERIFIED | [Fuente revisada](https://sscnapoli.it/en/auguri-a-de-bruyne-2/) |
| plr_025 | Sergio Busquets | barcelona | — | UNKNOWN / PENDING | [Fuente revisada](https://www.intermiamicf.com/news/sergio-busquets-to-retire-at-the-end-of-the-season) |
| plr_026 | Ivan Rakitić | barcelona | — | RETIRED / VERIFIED | [Fuente revisada](https://hajduk.hr/vijest/ivan-rakitic-objavio-kraj-briljantne-nogometne-karijere/17636) |
| plr_028 | Ángel Di María | paris_saint_germain | rosario_central | ACTIVE / VERIFIED | [Fuente revisada](https://rosariocentral.com/noticia/consiguio-los-tres-puntos-en-victoria/) |
| plr_029 | Rodrigo De Paul | atletico_madrid | inter_miami | ACTIVE / VERIFIED | [Fuente revisada](https://www.intermiamicf.com/news/inter-miami-cf-announces-2025-roster-decisions) |
| plr_030 | Granit Xhaka | arsenal | — | UNKNOWN / PENDING | [Fuente revisada](https://www.uefa.com/uefaeuropaleague/clubs/players/250004721--granit-xhaka/) |
| plr_032 | Giovani Lo Celso | paris_saint_germain | real_betis | ACTIVE / VERIFIED | [Fuente revisada](https://www.realbetisbalompie.es/primer-equipo/jugador/g-lo-celso-244809) |
| plr_039 | Cristiano Ronaldo | real_madrid | al_nassr | ACTIVE / VERIFIED | [Fuente revisada](https://www.spl.com.sa/en/news/ronaldo-i-believe-in-the-project-the-football-the-people-the-league) |
| plr_040 | Neymar | barcelona | santos | ACTIVE / VERIFIED | [Fuente revisada](https://www.santosfc.com.br/santos-fc-e-neymar-jr-renovam-contrato-ate-o-fim-de-2026/) |
| plr_041 | Robert Lewandowski | bayern_munich | — | UNKNOWN / PENDING | [Fuente revisada](https://www.fcbarcelona.com/en/football/first-team/news/4504923/spotify-camp-nou-salutes-robert-lewandowski/featured) |
| plr_042 | Luis Suárez | barcelona | inter_miami | ACTIVE / VERIFIED | [Fuente revisada](https://www.intermiamicf.com/news/inter-miami-cf-signs-luis-suarez-to-a-new-contract) |
| plr_043 | Son Heung-min | tottenham_hotspur | los_angeles_fc | ACTIVE / VERIFIED | [Fuente revisada](https://www.lafc.com/players/son-heung-min/) |
| plr_044 | Roberto Firmino | liverpool | al_sadd | ACTIVE / VERIFIED | [Fuente revisada](https://www.the-afc.com/en/more/transfers.html/news/firmino-leaves-al-ahli-joins-al-sadd) |
| plr_054 | Claudio Bravo | barcelona | — | UNKNOWN / PENDING | [Fuente revisada](https://www.realbetisbalompie.es/club/la-historia/) |
| plr_057 | Philipp Lahm | bayern_munich | — | RETIRED / VERIFIED | [Fuente revisada](https://fcbayern.com/en/club/hall-of-fame/philipp-lahm) |
| plr_059 | Gerard Piqué | barcelona | — | RETIRED / VERIFIED | [Fuente revisada](https://www.fcbarcelona.com/en/news/2909976/gerard-pique/amp) |
| plr_075 | Toni Kroos | real_madrid | — | RETIRED / VERIFIED | [Fuente revisada](https://www.realmadrid.com/en-US/news/club/announcements/comunicado-oficial-toni-kroos-21-05-2024) |

<!-- H4-REGISTER-START -->
## Registro de la revisión 2026-10-18 (H4)

Cada fila conserva la referencia deportiva (`club_tag`) sin cambios. «Fuente» es el material que respalda el estado; en PENDING es lo consultado.

| ID | Jugador | Referencia | Estado | Club actual | Fuente | Nota |
|---|---|---|---|---|---|---|
| plr_001 | Manuel Neuer | bayern_munich | ACTIVE | bayern_munich | [fuente](https://widgets.datasportsgroup.com/sports-news/news/en/173652/neuer-extends-bayern-stay-through-2027/) | Report of 18 May 2026: one-year extension to 2027 (also reported by Sky Germany via getfootballnewsgermany). Secondary sources agree; no club statement retrieved. |
| plr_002 | Thibaut Courtois | real_madrid | PENDING | — | — | Real Madrid reported as his club with a deal running through 2026/27 and a verbal extension to 2028, but the only recent source is undated (foot-africa); no official or dated 2026 confirmation retrieved. |
| plr_003 | Emiliano Martínez | aston_villa | ACTIVE | chelsea | [fuente](https://qna.org.qa/en/News-Area/News/2026-8/30/chelsea-signs-argentine-goalkeeper-emiliano-martinez-to-three-year-deal) | Chelsea signed him from Aston Villa on a three-year deal (30 Aug 2026 report; AP and several outlets agree). Aston Villa remains the sporting reference (2022). |
| plr_005 | Franco Armani | river_plate | ACTIVE | atletico_nacional | [fuente](https://www.elpais.com.co/deportes/franco-armani-regresa-a-atletico-nacional-el-idolo-cumplio-su-promesa-diez-anos-despues-1649.html) | River contract rescinded by mutual agreement; Atlético Nacional confirmed his return on 14-16 Jul 2026 (one year, option to June 2027). River Plate stays as sporting reference (2018). |
| plr_006 | Jonas Lössl | huddersfield_town | RETIRED | — | [fuente](https://www.flashscore.nl/news/soccer-premier-league-experienced-danish-international-goalkeeper-brings-down-curtain-on-impressive-career/r9FAo7Ab/) | Retirement in 2026 reported by Flashscore and Wikipedia; he moves to a role in FC Midtjylland administration. Some statistics sites still list him as active (stale). |
| plr_008 | Virgil van Dijk | liverpool | ACTIVE | liverpool | [fuente](https://www.flashscore.dk/news/soccer-premier-league-virgil-van-dijk-signs-new-contract-to-remain-at-liverpool-until-2027/WnN5FaxA) | Contract to 2027 (April 2025); a late-September 2026 report still has him at Liverpool, captain, with no confirmed transfer. |
| plr_010 | Nicolás Otamendi | benfica | ACTIVE | river_plate | [fuente](https://batimes.com.ar/news/amp/sports/nicolas-otamendi-becomes-latest-world-champion-to-sign-for-argentinas-river-plate.phtml) | Free transfer from Benfica announced 29 May 2026; contract from 1 Jul 2026 to Dec 2027, joining after the World Cup (club statement quoted by several outlets). |
| plr_013 | Dani Alves | juventus | PENDING | — | — | No formal retirement found. Reports from Dec 2025-Jan 2026 describe a planned comeback with Portuguese third-tier São João de Ver, not confirmed as signed. Career status unclear. |
| plr_014 | José María Giménez | atletico_madrid | PENDING | — | — | Conflicting: ESPN/Gradient still show Atlético de Madrid (ankle sprain May 2026), one page indicates a loan to Deportivo de La Coruña in Sep 2026. Single source; needs official LaLiga/club confirmation. |
| plr_015 | Marcos Acuña | sevilla | ACTIVE | river_plate | [fuente](https://lapaginamillonaria.com/seleccion-argentina/marcos-acuna-no-jugara-el-mundial-2026-la-reaccion-de-river-y-que-dijo-stefano-di-carlo) | At River Plate since Aug 2024 (from Sevilla); May 2026 coverage of his omission from the World Cup list and the River president's reaction, plus 2026 league statistics. Secondary sources. |
| plr_017 | Kieran Trippier | tottenham_hotspur | ACTIVE | wolverhampton_wanderers | [fuente](https://www.newcastleunited.com/en/news/trippier-joins-wolves-after-magpies-exit) | Newcastle United's own site reports he joined Wolves after his contract expired (departure announced April 2026). Two-year deal. |
| plr_018 | Yuto Nagatomo | galatasaray | ACTIVE | fc_tokyo | [fuente](https://www.fctokyo.co.jp/en/news/details/335281/) | FC Tokyo's official site lists him as a club member selected for Japan's 2026 World Cup squad; 2025/26 J1 statistics with FC Tokyo. |
| plr_019 | Luis Advíncula | lobos_buap | ACTIVE | alianza_lima | [fuente](https://rpp.pe/futbol/descentralizado/luis-advincula-a-alianza-lima-ofcial-club-blanquiazul-anuncio-el-fichaje-del-rayo-para-la-liga1-2026-noticia-1671027) | Alianza Lima announced his signing in January 2026 (two seasons plus a one-year option; ESPN agrees). Left Boca Juniors. |
| plr_020 | Gabriel Mercado | sevilla | PENDING | — | [fuente](https://espndeportes.espn.com/futbol/jugador/_/id/76818/gabriel-mercado) | Sources list Internacional with 2026 statistics, but no dated 2026 confirmation of contract or transfer status was retrieved. |
| plr_021 | Cristian Ansaldi | torino | PENDING | — | — | Last club found is Parma (2022-24); Wikipedia calls him a former player but no retirement statement or newer club was found. |
| plr_022 | Johan Djourou | antalyaspor | RETIRED | — | [fuente](https://dailycannon.com/2021/06/johan-djourou-retires/) | Retired in 2021 (last club Nordsjælland) at 34; later coaching and sports-coordinator roles. Wikipedia agrees. |
| plr_027 | Casemiro | real_madrid | PENDING | — | — | Only low-quality, templated pages (conflicting Manchester United / Inter Miami claims); no official or major-outlet confirmation retrieved. |
| plr_031 | Éver Banega | sevilla | PENDING | — | — | Left Newell's (not renewed) in Jan 2026; reports mention Defensa y Justicia but no confirmed signing or retirement was found. |
| plr_033 | Renato Augusto | beijing_guoan | RETIRED | — | [fuente](https://portaldeprefeitura.com.br/esportes/renato-augusto-anuncia-a-aposentadoria-do-futebol/603838/) | Announced retirement from professional football (Sep 2025) after leaving Fluminense by mutual agreement; Brazilian outlets agree. |
| plr_034 | Keisuke Honda | pachuca | ACTIVE | fc_jurong | [fuente](https://www.malaymail.com/news/singapore/2026/04/10/former-japan-international-keisuke-honda-to-make-singapore-premier-league-switch-with-fc-jurong-move/215774) | April 2026 report: signs with FC Jurong (Singapore Premier League, ex Albirex Niigata Singapore), arrival scheduled for August 2026; Wikipedia lists Jurong as current. Arrival date is a plan in the source. |
| plr_035 | Carlos Sánchez | espanyol | PENDING | — | — | Latest confirmed club is Barracas Central (2024-25); December 2024 retirement/front-office reports without official confirmation. |
| plr_036 | Birkir Bjarnason | aston_villa | PENDING | — | — | One statistics site lists end of career on 30 Jun 2025 (Brescia); no dated announcement retrieved. |
| plr_037 | Celso Borges | deportivo_la_coruna | PENDING | — | — | Wikipedia, FotMob and ESPN place him at Alajuelense in 2025-26 (match of 11 Mar 2026), but no source confirms his status after the mid-year window. |
| plr_045 | Raúl Jiménez | wolverhampton_wanderers | ACTIVE | wolverhampton_wanderers | [fuente](https://jamaica-gleaner.com/article/sports/20260610/ahead-world-cup-mexico-striker-raul-jimenez-fixes-club-future-signing) | AP, 10 Jun 2026: left Fulham and signed a second spell with Wolves (two-year deal, Championship). |
| plr_046 | Jefferson Farfán | lokomotiv_moscow | RETIRED | — | [fuente](https://eltiempo.pe/detail/jefferson-farfan-anuncia-su-retiro-oficial-del-futbol-profesional-ml) | Retirement announced in December 2022 (knee injury); remains linked to Alianza Lima as an ambassador. Multiple outlets agree. |
| plr_047 | Marcus Berg | al_ain | PENDING | — | — | Wikipedia calls him a former professional footballer (left IFK Göteborg Sep 2023, coaching-staff role from 2024) but no explicit retirement announcement was retrieved. |
| plr_048 | Paolo Guerrero | flamengo | ACTIVE | alianza_lima | [fuente](https://andina.pe/ingles/noticia-paolo-guerrero-turns-42-and-alianza-lima-renews-his-contract-through-2026-1057796.aspx) | Alianza Lima renewed his contract through 2026 (Jan 2026, announced by the club); he has said 2026 is his last season. The contract covers the cut-off date. |
| plr_049 | Ricardo Quaresma | besiktas | RETIRED | — | [fuente](https://www.fcbarcelona.com/en/football/barca-legends/players/4231983/quaresma) | FC Barcelona's legends profile and Wikipedia: retired in 2022 after Vitória de Guimarães. Undated comeback remarks (Besiktas) were not followed by a signing. |
| plr_050 | Ahmed Musa | cska_moscow | PENDING | — | — | Without a club since ending his Sivasspor contract in Feb 2024; Sep 2024 hint of an NPFL return. No dated 2026 source. |
| plr_051 | Alisson | liverpool | ACTIVE | liverpool | [fuente](https://en.wikipedia.org/wiki/Alisson_Becker) | One-year contract extension triggered in March 2026 (through 2026-27); Liverpool is his current club in all sources. Possible 2027 exit is only speculation. |
| plr_052 | Jan Oblak | atletico_madrid | ACTIVE | atletico_madrid | [fuente](https://www.beinsports.com/en-asia/football/primera-division/articles/oblak-wants-to-achieve-more-with-atletico-despite-uncertain-future-2026-06-03) | June 2026 report: contract to 30 Jun 2028; a later profile has him starting the 2026-27 season as first choice. |
| plr_053 | Ederson | manchester_city | ACTIVE | fenerbahce | [fuente](https://foot-africa.com/en/news/official-ederson-signs-with-fenerbahce-862113/) | Manchester City announced his departure; he signed with Fenerbahçe (Sep 2025) and played Süper Lig matches in Sep 2026 (profile data). City contract news is outdated. |
| plr_055 | Guillermo Ochoa | standard_liege | RETIRED | — | [fuente](https://www.moroccoworldnews.com/2026/07/330738/guillermo-ochoa-retires-at-41-after-22-year-career-with-mexico/) | Retired in July 2026 at 41 (several outlets); last club AEL Limassol. A future management role at América is only a report. |
| plr_056 | Khadim N'Diaye | horoya | PENDING | — | — | Last club mentioned is Horoya (undated); a 2026 World Cup profile leaves the current club empty. |
| plr_058 | Leonardo Bonucci | juventus | RETIRED | — | [fuente](https://www.juventus.com/en/news/articles/leonardo-bonucci-hangs-up-his-boots) | Juventus's own article and ESPN report his retirement; last club Fenerbahçe (2024). |
| plr_060 | David Alaba | bayern_munich | PENDING | — | — | Real Madrid and Alaba agreed to end his stay when his contract expired in June 2026 (reports of May 2026). No official report of a new club or of a free-agent status at the cut-off. |
| plr_061 | Raphaël Varane | real_madrid | RETIRED | — | [fuente](https://www.laprensa.hn/deportes/varane-retiro-como-real-madrid-retiro-edad-anuncio-comunicado-francia-OB21756855) | Retired in September 2024 after a knee injury at Como; several outlets agree (page dates of 2026 are display dates). |
| plr_062 | Pepe | real_madrid | RETIRED | — | [fuente](https://gulfnews.com/sport/football/portugal-defender-pepe-announces-retirement-at-41-1.1723145241210) | Announced his retirement on 8 Aug 2024 at 41 after Euro 2024; no comeback found. |
| plr_063 | Kalidou Koulibaly | napoli | ACTIVE | al_hilal | [fuente](https://africasoccer.com/?p=491894) | Extended his Al-Hilal contract in Feb 2026 to June 2027; reported injured for much of the season. The contract covers the cut-off. |
| plr_064 | Medhi Benatia | juventus | PENDING | — | — | Only his international retirement (2019) and later sporting-director work were found; the date of his retirement as a club player was not retrieved. |
| plr_065 | Andreas Christensen | chelsea | PENDING | — | — | Barcelona is his club of record but sources conflict on a 2026 renewal (a Besoccer entry dated 1 Jul 2026) and one result is low-quality; no club announcement retrieved. |
| plr_066 | Héctor Moreno | real_sociedad | RETIRED | — | [fuente](https://www.razon.com.mx/deportes/2025/10/17/ya-es-oficial-hector-moreno-anuncia-su-retiro-del-futbol-profesional-y-ya-tiene-fecha-para-colgar-los-botines/) | Announced his retirement on 17 Oct 2025 (last club Monterrey); several Mexican outlets agree. |
| plr_067 | Miguel Layún | sevilla | PENDING | — | — | Retired at the end of 2023 but a March 2025 TUDN video reports a return to play for América; the current status was not clarified. |
| plr_068 | Santiago Arias | psv_eindhoven | ACTIVE | independiente | [fuente](https://www.noticiascaracol.com/golcaracol/colombianos-en-el-exterior/santiago-arias-aseguro-nuevo-equipo-internacional-pensando-en-seleccion-colombia-y-mundial-2026-rg10) | Left Bahia as a free agent and signed with Independiente (Argentina) to Dec 2027; 2026 league appearances up to July. (Atlético Nacional reports did not materialise.) |
| plr_069 | Fagner | corinthians | ACTIVE | cruzeiro | [fuente](https://jovempan.com.br/esportes/futebol/corinthians/fagner-rescinde-com-corinthians-e-acerta-transferencia-definitiva-para-o-cruzeiro/) | Rescinded with Corinthians and moved permanently to Cruzeiro on a one-season contract (on loan the previous season). The article is undated; consistent with 2026 coverage. |
| plr_070 | Kendall Waston | vancouver_whitecaps | ACTIVE | deportivo_saprissa | [fuente](https://www.espn.com/soccer/player/_/id/132937) | ESPN and FotMob show him at Deportivo Saprissa for the 2026-27 Apertura; a data site lists a contract to June 2027. |
| plr_071 | Fidel Escobar | new_york_red_bulls | ACTIVE | deportivo_saprissa | [fuente](https://en.wikipedia.org/wiki/Fidel_Escobar) | Wikipedia and FotMob: Deportivo Saprissa; a statistics site lists a contract to 31 Dec 2026, which covers the cut-off. |
| plr_072 | Dylan Bronn | gent | ACTIVE | servette | [fuente](https://www.bluewin.ch/en/dylan-bronn-back-at-servette-li.2767328) | Keystone-SDA (Jul 2025): contract to 2027 at Servette; 2025-26 appearances and no transfer reported. |
| plr_073 | Andrés Iniesta | barcelona | RETIRED | — | [fuente](https://www.clarosports.com/futbol/adios-leyenda-andres-iniesta-confirma-su-retiro-del-futbol-con-un-emotivo-video/) | Confirmed his retirement on 8 Oct 2024 after Emirates Club; reported to be taking coaching courses. |
| plr_074 | N'Golo Kanté | chelsea | ACTIVE | fenerbahce | [fuente](https://www.africanews.com/amp/2026/02/05/ngolo-kante-completes-move-to-turkeys-fenerbahce/) | Joined Fenerbahçe from Al-Ittihad in Feb 2026 (contract to 2028 per reports). |
| plr_076 | David Silva | manchester_city | PENDING | — | [fuente](https://www.scmp.com/sport/football/article/3370063/manchester-city-legend-david-silva-comes-out-retirement-hong-kong-stint) | Retired in July 2023 (several outlets), but one 2026 South China Morning Post report says he came out of retirement for Supreme Sha Tin (Hong Kong). Single source for the comeback; status unresolved. |
| plr_077 | Arturo Vidal | bayern_munich | PENDING | — | — | Colo-Colo said to run through Dec 2026 (late-2025 reports) but with reported friction and an undated item calling him clubless. No dated 2026 confirmation. |
| plr_078 | Miralem Pjanić | juventus | PENDING | — | — | Last reliable move found: Barcelona contract terminated and Sharjah (2023-24). The current club could not be established from reliable sources. |
| plr_079 | Christian Eriksen | tottenham_hotspur | ACTIVE | vfl_wolfsburg | [fuente](https://www.newsofbahrain.com/sports/118810.html) | AFP, 12 Sep 2025: free transfer to Wolfsburg until 2027 (contract covers the cut-off); a June 2026 article still lists Wolfsburg. Blog posts claiming otherwise were discarded. |
| plr_080 | Shinji Kagawa | borussia_dortmund | PENDING | — | — | Last club found is Cerezo Osaka (profile corrected to Feb 2024). A retirement rumour was labelled false; no 2026 source. |
| plr_081 | Héctor Herrera | porto | ACTIVE | houston_dynamo | [fuente](https://www.mlssoccer.com/news/hector-herrera-rejoins-houston-dynamo) | MLS transfer tracker / Houston Dynamo: returned for 2026 with an option to June 2027; no later change reported. |
| plr_082 | Christian Noboa | rostov | PENDING | — | — | Emelec return in 2024, later Sochi reports (2025); no dated 2026 source. |
| plr_083 | Younès Belhanda | galatasaray | PENDING | — | — | Al Shamal contract ran to June 2026; no later source. |
| plr_084 | Saeid Ezatolahi | amkar_perm | PENDING | — | — | Shabab Al Ahli in 2025/26 statistics (FotMob, The Analyst) but no dated confirmation for the 2026-27 season. |
| plr_085 | Gabriel Gómez | atletico_bucaramanga | PENDING | — | — | Wikipedia calls him a former player (last club San Miguelito 2020-21); no announcement retrieved. |
| plr_086 | Yoshimar Yotún | orlando_city | ACTIVE | sporting_cristal | [fuente](https://canaln.pe/deportes/yoshimar-yotun-continuara-sporting-cristal-2026-n468558) | Sporting Cristal renewed him to the end of 2026; FotMob shows 2026 Apertura minutes with Cristal. The contract covers the cut-off. |
| plr_087 | Édgar Bárcenas | cafetaleros_de_tapachula | ACTIVE | iraklis | [fuente](https://www.laestrella.com.pa/deportes/barcenas-brilla-en-grecia-el-panameno-marca-gol-en-su-debut-oficial-GK25495560) | Signed by Iraklis (Greece) for 2026-27 (one season, to June 2027) and scored on his September 2026 debut (La Estrella de Panamá). |
| plr_088 | Kylian Mbappé | paris_saint_germain | ACTIVE | real_madrid | [fuente](https://en.wikipedia.org/wiki/Kylian_Mbapp%C3%A9) | At Real Madrid since 1 Jul 2024 (free agent from PSG); all reliable sources agree. |
| plr_089 | Karim Benzema | real_madrid | PENDING | — | [fuente](https://africasoccer.com/?p=602252) | Left Al-Hilal by mutual agreement on 31 Aug 2026 (AP); unattached then, with unconfirmed Leverkusen links. Not recorded as FREE_AGENT because no evidence at the cut-off. |
| plr_090 | Mohamed Salah | liverpool | PENDING | — | — | Liverpool announced his exit at the end of 2025-26; his next club was unannounced in the reliable sources found. Low-quality pages claiming otherwise were discarded. |
| plr_091 | Erling Haaland | manchester_city | ACTIVE | manchester_city | [fuente](https://prod.beinsports.com/en-mena/football/premier-league/articles-video/erling-haaland-signs-new-10-year-manchester-city-contract-2025-01-17) | 10-year contract announced in Jan 2025 (to 2033/34); still at City for 2026-27 with no transfer reported. |
| plr_092 | Harry Kane | tottenham_hotspur | ACTIVE | bayern_munich | [fuente](https://www.nmas.com.mx/deportes/harry-kane-se-queda-bayern-munich-como-seria-nuevo-contrato-delantero-club-aleman/) | Remains at Bayern (contract to mid-2027 per reports); Premier League links are speculation. |
| plr_093 | Sergio Agüero | manchester_city | RETIRED | — | [fuente](https://www.tudn.com/futbol/la-liga-2/sergio-aguero-en-su-retiro-del-futbol-no-voy-a-decir-que-soy-un-crack) | Announced his retirement at Camp Nou on 15 Dec 2021 (heart arrhythmia). 2026-dated pages are reprints. |
| plr_094 | Alexis Sánchez | arsenal | ACTIVE | cf_montreal | [fuente](https://en.cfmontreal.com/news/cf-montreal-signs-alexis-sanchez-as-a-designated-player) | CF Montréal's own site: signed as a Designated Player on 11 Aug 2026 (through the 2027 MLS Sprint Season) after leaving Sevilla. |
| plr_095 | Mauro Icardi | inter_milan | PENDING | — | — | Left Galatasaray at contract end and was without a club in Aug 2026 (reports); no signing confirmed. Not recorded as FREE_AGENT. |
| plr_096 | Duván Zapata | atalanta | ACTIVE | torino | [fuente](https://www.eluniversal.com.co/deportes/2026/07/08/la-decision-que-tomo-duvan-zapata-en-el-torino-de-italia/) | Torino renewed him to June 2028 (8 Jul 2026, captain). One earlier note says 2027; the later date was used. |
| plr_097 | Christian Pulisic | chelsea | ACTIVE | ac_milan | [fuente](https://bleacherreport.com/articles/25445111-new-christian-pulisic-rumors-reveal-mls-interest-ac-milans-stance-potential-transfer) | Contract with AC Milan through 2026-27 with a club option (Bleacher Report; NBC reports of the original deal). Transfer talk is rumour only. |
| plr_098 | Joel Campbell | real_betis | ACTIVE | inter_san_carlos | [fuente](https://www.clarosports.com/centroamerica/futbol-cenam/joel-campbell-tiene-nuevo-destino-en-costa-rica-el-desafio-que-sorprendio-a-todos/) | Left Alajuelense in May 2026 and was presented by Inter San Carlos on 29 Jun 2026 (ClaroSports, Diario Extra). |
| plr_099 | Alireza Jahanbakhsh | az_alkmaar | PENDING | — | — | A Tehran Times item of 10 Aug 2026 reports a move to Excelsior; earlier 2026 items had him clubless. Single source, no club confirmation. |
| plr_100 | Mathew Leckie | hertha_berlin | ACTIVE | melbourne_city | [fuente](https://melbournecityfc.com.au/?p=337581) | Melbourne City announced a one-year extension with a further-season trigger for 2026-27 (club site and AAP). |
| plr_101 | Gianluigi Buffon | juventus | RETIRED | — | [fuente](https://worldsoccertalk.com/amp/news/buffon-declares-retirement-from-soccer-20230802-WST-447084.html) | Announced his retirement on 2 Aug 2023 (Parma); later role as head of delegation of Italy ended in 2026. Several outlets agree. |
| plr_102 | Gianluigi Donnarumma | ac_milan | PENDING | — | — | Only September 2025 reports (agreement with Manchester City, medical on deadline day); no official club announcement or 2026 source retrieved. |
| plr_103 | Wojciech Szczęsny | juventus | ACTIVE | barcelona | [fuente](https://www.fcbarcelona.com/en/football/first-team/news/4305495/-2027/featured) | FC Barcelona's own page: contract extended to 30 Jun 2027 (covers the cut-off). Undated exit rumours were not confirmed. |
| plr_104 | Yassine Bounou | sevilla | ACTIVE | al_hilal | [fuente](https://en.wikipedia.org/wiki/Yassine_Bounou) | Wikipedia lists Al-Hilal as his current club; a headline of Oct 2025 reports an extension to 2028 and a pre-season report shows him at the club's camp. |
| plr_105 | André Onana | inter_milan | ACTIVE | trabzonspor | [fuente](https://www.yardbarker.com/soccer/articles/andre_onana_officially_signs_for_trabzonspor/s1_17737_44023495) | Trabzonspor for 2026/27: a Manchester United statement describes a loan, other outlets report a completed transfer. The club is the same in both accounts; the type of deal is not settled. |
| plr_106 | Kim Seung-gyu | al_shabab | ACTIVE | fc_tokyo | [fuente](https://www.fctokyo.co.jp/en/?p=335517) | FC Tokyo's official site: renewed his contract and selected for the 2026 World Cup squad (column of 21 May 2026). |
| plr_107 | Giorgio Chiellini | juventus | RETIRED | — | [fuente](https://www.juventus.com/en/club/corporate-governance/leadership-team/giorgio-chiellini) | Retired in Dec 2023 (LAFC). Juventus's own profile lists his executive roles (Chief Club Affairs Officer from Jul 2026). |
| plr_108 | Dani Carvajal | real_madrid | PENDING | — | [fuente](https://arynews.tv/carvajal-joins-getafe-until-end-of-season) | Real Madrid announced in May 2026 that he would not continue. An AFP wire of 13 Oct 2026 reports a free signing by Getafe to 30 Jun 2027; a single wire source and no club statement retrieved. |
| plr_109 | Rúben Dias | manchester_city | ACTIVE | manchester_city | [fuente](https://www.noticiasaominuto.com/desporto/2841805/oficial-ruben-dias-renova-com-o-manchester-city-ate-2029) | Manchester City announced a renewal to 2029 (Aug 2025); still listed at City in 2025/26 and no transfer reported. |
| plr_110 | Marquinhos | paris_saint_germain | ACTIVE | paris_saint_germain | [fuente](https://capology.com/player/marquinhos-34468/) | Contract to June 2028 (Capology); captained Brazil at the 2026 World Cup and several outlets report he stays at PSG. |
| plr_111 | Achraf Hakimi | paris_saint_germain | ACTIVE | paris_saint_germain | [fuente](https://en.wikipedia.org/wiki/Achraf_Hakimi) | Wikipedia lists PSG; L'Équipe-reported extension to 2029; part of PSG's Champions League titles of 2025 and 2026. |
| plr_112 | João Cancelo | manchester_city | ACTIVE | barcelona | [fuente](https://www.vavel.com/en/data/joao-cancelo/bio/) | Wikipedia and Vavel: permanent Barcelona player since 20 Aug 2026 (three-year deal) after a loan from Al-Hilal. No club announcement retrieved; older items still show the loan. |
| plr_113 | Mats Hummels | bayern_munich | RETIRED | — | [fuente](https://www.bundesliga.com/en/bundesliga/news/mats-hummels-announces-retirement-dortmund-bayern-roma-31590) | Announced his retirement and played his last match on the final day of 2024/25 (Roma); a farewell at Dortmund followed. |
| plr_114 | Matthijs de Ligt | bayern_munich | ACTIVE | manchester_united | [fuente](https://www.manutd.com/en/news/detail/matthijs-de-ligt-believes-there-is-more-to-come-in-second-manchester-united-season-8-august-2025) | Manchester United's site (Aug 2025) and later reports: contract to 30 Jun 2029; back surgery in 2026 with return planned for the start of 2026-27. |
| plr_115 | Kim Min-jae | napoli | ACTIVE | bayern_munich | [fuente](https://bulinews.com/turn-bayern-kim-min-jae-reportedly-set-stay) | Sky Germany via Bulinews: Bayern plan with him next season, contract to 2028; a September 2026 database also lists Bayern. |
| plr_116 | Lisandro Martínez | manchester_united | ACTIVE | manchester_united | [fuente](https://en.wikipedia.org/wiki/Lisandro_Mart%C3%ADnez) | Wikipedia and Manchester United profile page (Sep 2026): squad member since 2022. |
| plr_117 | Nicolás Tagliafico | olympique_lyon | ACTIVE | olympique_lyon | [fuente](https://es.soccerway.com/noticias/tagliafico-renovo-con-lyon-hasta-2027-continuidad-en-europa-con-la-seleccion-en-la-mira/EkVnFwyA) | Renewed with Lyon to June 2027 (El Gráfico and Soccerway); 2025/26 Ligue 1 appearances. |
| plr_118 | Sergiño Dest | ac_milan | PENDING | — | — | World Cup roster lists PSV Eindhoven (June 2026) and 2025/26 loan appearances; whether the loan became a permanent deal or ended was not found. |
| plr_119 | Takehiro Tomiyasu | arsenal | ACTIVE | crystal_palace | [fuente](https://www.cpfc.co.uk/news/announcement/palace-sign-takehiro-tomiyasu/) | Crystal Palace's own announcement (early August 2026): signed after a trial period; ex Arsenal and Ajax. |
| plr_120 | Piero Hincapié | bayer_leverkusen | ACTIVE | arsenal | [fuente](https://www.rotowire.com/soccer/headlines/piero-hincapie-news-signs-permanently-for-arsenal-520924) | Arsenal made the loan permanent in June 2026 (effective 1 Jul; Arsenal's site and Wikipedia agree); previous club Bayer Leverkusen. |
| plr_121 | Yasser Al-Shahrani | al_hilal | ACTIVE | al_qadsiah | [fuente](https://en.wikipedia.org/wiki/Yasser_Al-Shahrani) | Rejoined Al-Qadsiah on 28 Jul 2025 (free transfer); transfer databases list a contract to 30 Jun 2027. |
| plr_122 | Harry Souttar | stoke_city | PENDING | — | — | Leicester City signed him long-term (to 2027/28) but he barely played and a June 2026 report urged a transfer; no confirmation of staying or leaving. |
| plr_123 | Rodri | manchester_city | PENDING | — | — | A single 17 Aug 2026 article (Vistazo) reports a Barcelona signing to 2030, while another says the deal was not yet closed on 13 Aug; no club announcement retrieved. |
| plr_124 | Bernardo Silva | manchester_city | ACTIVE | real_madrid | [fuente](https://prod.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/real-madrid-confirm-bernardo-silva-signing-ahead-of-portugal-s-world-cup-clash-with-dr-congo-2026-06-17) | Real Madrid confirmed his signing on 17 Jun 2026 (two years to June 2028, per the club statement quoted by AP) after his Manchester City contract expired. |
| plr_125 | Joshua Kimmich | bayern_munich | ACTIVE | bayern_munich | [fuente](https://amp.bundesliga.com/en/bundesliga/news/joshua-kimmich-signs-new-bayern-munich-contract-2025-17012) | Bundesliga.com: new contract to 2029; Wikipedia and a 2026 statistics page still list Bayern. |
<!-- H4-REGISTER-END -->
