# Informe técnico CODEX-001

Fecha: 2026-10-16. Entrega local, sin push ni deploy.

## Tareas trabajadas y resultado

DL-F01-ARC-001, DL-F01-UI-001, DL-F01-I18N-001, DL-F01-I18N-002, DL-F01-I18N-003, DL-F01-QA-001 y DL-F01-DOC-001.

Base React + Vite + TypeScript strict; Tailwind con plugin Vite; Zustand disponible para trabajo posterior; ESLint flat config; Vitest con jsdom y Testing Library. Pantalla deportiva responsive con cancha CSS propia, once lugares ilustrativos, presupuesto 100 millones, formación 4-3-3, contador 0/11 y Jugar deshabilitado.

Internacionalización centralizada en es-AR, en y pt-BR: selector accesible, persistencia validada, recuperación, fallback español, html.lang y error de almacenamiento traducido. Diccionario compartido completo para posiciones y términos solicitados. ADR-0002 y regla obligatoria en AGENTS.md.

## Versiones verificadas

| Herramienta | Versión |
|---|---|
| Node.js / npm / Git | 24.21.0 / 11.19.0 / 2.53.0.windows.2 |
| React / React DOM | 19.3.1 |
| Vite / plugin React | 8.3.4 / 6.1.2 |
| TypeScript | 6.0.3 |
| Tailwind / plugin Vite | 4.3.3 |
| Zustand | 5.0.15 |
| i18next / react-i18next | 26.4.7 / 17.0.20 |
| ESLint / typescript-eslint | 10.13.0 / 8.71.2 |
| Vitest / jsdom | 5.0.5 / 30.1.3 |
| Testing Library React / user-event | 16.3.3 / 14.6.8 |

package-lock.json fija la resolución reproducible. npm install informó 0 vulnerabilidades en 252 paquetes auditados.

## Verificaciones ejecutadas

| Comprobación | Resultado real |
|---|---|
| npm run typecheck | PASS: sin errores |
| npm run lint | PASS: sin errores ni advertencias |
| npm test | PASS: 1 archivo, 15 pruebas |
| npm run build | PASS: 49 módulos; bundle JS 278.89 kB, gzip 87.97 kB |
| Inicio Vite | PASS: servidor listo en 127.0.0.1:5173 |
| Navegador: instalación nueva | PASS: pantalla completa en español |
| Navegador: cambio a inglés y recarga | PASS: interfaz y selector conservan inglés |
| Navegador: cambio a portugués y recarga | PASS: interfaz y selector conservan portugués |
| Navegador: volver a español | PASS |
| Responsive | PASS: escritorio y teléfono de 390×844 revisados; 11 puestos; sin desborde horizontal (contenido 375 px) |
| Consola del navegador | PASS: lista de errores/advertencias vacía |
| git diff --check | PASS |
| Revisión de alcance | PASS: sin funcionalidades de fases posteriores |
| Auditoría formal de accesibilidad / dispositivos físicos | NO EJECUTADA: fuera de la cobertura disponible; selector etiquetado y textos accesibles verificados por DOM |

Las 15 pruebas cubren inicio en español, inicialización y claves de tres idiomas, persistencia/recuperación de cada idioma, preferencia inválida, almacenamiento bloqueado, fallback real de una clave ausente en inglés, cuatro posiciones en cada idioma, cambio inmediato y aviso traducido. Se verificaron cambios y recarga también en navegador real; los tests no sustituyen la revisión visual.

## Árbol y archivos

Todos los archivos siguientes son nuevos: el directorio solo contenía .git. No hubo documentos útiles sobrescritos. dist y node_modules son resultados locales ignorados.

```text
.
├── .gitignore
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── index.html
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── src/
│   ├── app/main.tsx
│   ├── components/LanguageSelector.tsx
│   ├── data/initialSetup.ts
│   ├── features/home/
│   │   ├── HomePage.tsx
│   │   └── Pitch.tsx
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── i18n.test.tsx
│   │   └── locales/
│   │       ├── es-AR/common.json
│   │       ├── en/common.json
│   │       └── pt-BR/common.json
│   ├── styles/index.css
│   ├── test/setup.ts
│   └── types/football.ts
└── docs/
    ├── ROADMAP.md
    ├── TASK_BOARD.md
    ├── TEST_PLAN.md
    ├── decisions/ADR-0002.md
    ├── logs/CODEX-001.md
    ├── prompts/README.md
    └── qa/
        ├── CODEX-001.md
        └── CODEX-001-desktop.png
```

No se crean store/lib vacíos. La arquitectura reserva esas responsabilidades mediante convenciones en README; las fases posteriores están documentadas y pendientes.

## Problemas y soluciones

- Repositorio vacío: se creó planificación inicial y se registró la ausencia de ADR-0001, manteniendo ADR-0002 solicitado.
- DNS de npm restringido: instalación completada con acceso autorizado.
- Vite dentro del sandbox no era accesible desde el navegador: se reinició con acceso autorizado, limitado a 127.0.0.1.
- Presupuesto sin moneda especificada: se muestran millones sin asumir divisa.

## Git y ejecución

Git ya estaba inicializado en master, sin commits. La entrega queda con archivos nuevos sin commit; no existe hash. No se cambió la rama, no se configuró remoto ni se publicó.

```powershell
cd 'C:\Users\rea_0\Documents\ChatGPT\Fútbol Draft'
npm ci
npm run dev
```

Abrir la URL Local impresa por Vite, normalmente http://127.0.0.1:5173. Para comprobar producción: npm run build y npm run preview. El servidor usado para QA se detiene al cerrar esta entrega.

Próxima tarea recomendada: CODEX-002 / DL-F02-DATA-001, definición de modelo y criterios del catálogo conforme ROADMAP.md. No iniciada.

Referencias oficiales consultadas: https://vite.dev/guide/, https://tailwindcss.com/docs/installation/using-vite, https://www.i18next.com/overview/configuration-options y https://react.i18next.com/latest.
