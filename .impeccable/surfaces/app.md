Scope: whole app (the employee exam flow on a phone + the Gerencia panel on a desktop). Mode: Operate.
Audience and jobs:
- An employee takes the monthly exam on their phone in a few minutes.
- Gerencia loads staff, edits the question bank, and reviews who is behind and what is failed.
Constraints: Spanish only. The exam window is the 26th–30th. One attempt. Yes/No or multiple choice. At most 6 questions per topic.

## Direction contract

THESIS: a clean, modern working tool in the manner of laravel.com. It refuses both the dated desktop-app look and the generic grey LMS dashboard.

OWN-WORLD:
- Pure white ground. Neutral greys: ink #171717, #525252 and #737373. 1px hairlines #e5e5e5.
- One red-orange accent #f0360a, used for primary actions, the current state, and the 5px corner ticks on framed blocks.
- Instrument Sans at weight 400 with tight negative tracking for display. IBM Plex Mono only for data: cédula, scores, counts.
- 8px radius buttons with a faint shadow.
- A faint fading grid behind page headers only.

STORY:
- The employee knows whether this month is open, answers one question per screen, and sees the score.
- Gerencia sees who is behind, then drills into a person or a weak topic.

FIRST VIEWPORT:
- Employee (375): a sticky white bar with the wordmark. "Hola, Nombre." at 38px. A framed exam block with an accent CTA. A 12-month hairline grid.
- Gerencia (1440): a white top nav with an accent underline on the active item. A big month title over the grid. A hairline-divided stat strip and area progress. A framed employee table with the side panels "Aciertos por tema" and "Preguntas más falladas".

FORM: pinned by the owner (Laravel-inspired); supersedes the rolled carnet direction (seed:dadacce684d1de63). Signature move: hairline frames with accent corner ticks, plus the 12-month results grid.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
