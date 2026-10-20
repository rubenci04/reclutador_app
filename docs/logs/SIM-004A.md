# SIM-004A — 20/10/2026

Auditoría del motor batch action-v3, subs-v1, reproducción, series y sincronización actual. Diseño incremental propuesto en ADR-0018; cuatro ventanas, snapshot serializable, dos flujos RNG, decisiones futuras y autoridad compartida pendiente.

Experimento aislado confirma continuidad exacta RNG frente al generador vigente y fija 24 golden de resultados históricos. No extrae ni sustituye el motor productivo. QA, resultados y límites en [SIM-004A](../qa/SIM-004A.md). Base `44a05da`, rama `codex/sim-004a`; cambios ajenos preservados. Sin push, despliegue o servicios remotos. SIM-004B no iniciado.
