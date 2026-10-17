# Auditoría de clubes actuales e históricos

Fecha de corte: **17/10/2026**. Evidencia: `src/data/player-clubs/2026-10-17.json`. Catálogo deportivo: 150 jugadores de catalog_v1, conservado íntegro.

## Cobertura acumulada

- 25/150 revisados (16,67%): Messi y Romero más 23 identidades con referencias antiguas, movimientos o posibles retiros.
- 19/150 con situación confirmada (12,67%): 13 ACTIVE con club actual identificado y seis RETIRED sin club actual.
- Seis revisados UNKNOWN/PENDING; otros 125 todavía sin revisar. No se deduce club actual de club_tag ni se interpreta una salida como FREE_AGENT.
- FREE_AGENT está soportado y probado con fixtures; ningún jugador real recibe ese estado sin evidencia vigente.
- Historial parcial verificado: tres jugadores y seis períodos. No se presenta como carrera completa.

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
