# Evaluaciones · Hotel Zeus

Monthly staff exam for Hotel Zeus, Riobamba. Employees answer on their phones from the 26th to the 30th of each month. Grading is automatic. Gerencia reviews the results in its own panel.

## Routes

- `/`: employee login (cédula + 4-digit PIN). Shows the carnet, the exam, and the result.
- `/gerencia`: Gerencia panel (password in `MANAGER_PASSWORD`).
  - Summary
  - Employees and their profiles
  - Question bank (at most 6 per topic)
  - Results with awards, exportable to CSV
  - Settings

## Rules applied by the server

- The exam window is the 26th–30th (Ecuador time). In Settings it can be forced open or closed.
- One attempt per employee per month. Gerencia can delete an attempt so the employee can take it again.
- When an exam starts, its questions are frozen. Editing the bank afterwards does not change that exam's grade.
- The correct answer is never sent to the phone. The server grades on submit.
- Each answer is saved as soon as it is tapped.

## Local development

```bash
npm install
npm run demo   # loads DEMO data into data-local (13 employees, PIN 1234, window open)
npm run dev    # http://localhost:3100
```

`.env.local` defines `MANAGER_PASSWORD`, `SESSION_SECRET` and `DATA_DIR=./data-local`.

## Deploy (Coolify)

- Dockerfile build pack. The Dockerfile is the same as the laundry app's (Next standalone, port 3000, `/api/health`).
- Persistent volume mounted at `/data`.
- Env:
  - `MANAGER_PASSWORD`
  - `SESSION_SECRET` (a long random string)

Production starts with no employees. The question bank v1 is loaded automatically.
