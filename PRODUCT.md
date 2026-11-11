# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, standalone output), the same stack as the Hotel Zeus laundry app. Docker build on the owner's Coolify (panel.automationpherce.cloud). Data lives in JSON files on a persistent volume (`/data`). Tailwind CSS.

## Users

- **Employees of Hotel Zeus (Riobamba, Ecuador).** Areas: Recepción, Alimentos y bebidas (cocina, despacho de alimentos, meseros, bar), Pisos y limpieza, Lavandería. Nearly all of them take the exam on their own phone, often on a break, with an uneven connection. Varied reading and tech comfort; Spanish only.
- **Gerencia (Sr. Patricio and administration).** They load employees, maintain the question bank, and review who took the exam, scores, weak topics, self-evaluations, and team votes. They mostly use a computer and sometimes a phone.

## Product Purpose

Monthly staff evaluation. Each month, between the 26th and the 30th, every employee answers a short exam on the internal regulations (Reglamento Interno) and on their own job. Grading is automatic. Gerencia uses the results to supervise compliance, catch knowledge gaps, and support awards.

## Operating Context

- The exam window is from the 26th to the 30th of each month (America/Guayaquil time). There is one attempt per employee per month.
- Questions are always Yes/No or multiple choice. There are never open answers. There are at most 6 questions per topic.
- An exam has four parts:
  - Knowledge, which is scored: general topics for everyone plus the topic for the employee's job.
  - Self-evaluation, Yes/No and not scored. Gerencia can flag an answer as contradicted by records, with a note.
  - "Evalúa tu equipo": pick the kindest coworker.
  - Award criteria (wine sales, guest ratings), which Gerencia enters.
- Source document: "Evaluacion de personal 2026 noviembre.docx", the regulations of Empresa Hotelera Arguello - Altamirano - Costales C.A.

## Capabilities and Constraints

- Employee login: cédula and a 4-digit PIN created by Gerencia. Gerencia login: a manager password (env var).
- Gerencia can add, edit, and remove questions, and set the correct answers.
- Undecided:
  - Job-specific topics for areas other than "despacho de alimentos".
  - The content of "Autocensura de malos hábitos" and "Equipo M".
  - The passing threshold.

## Brand Commitments

Visual direction pinned by the owner (2026-11-11): clean, modern, minimal, inspired by laravel.com. The owner rejected the earlier "carnet" look as dated. Nothing may look like an old desktop/Visual Basic app.

Hotel Zeus is the existing hotel name. There is no logo or brand asset in this project yet. The internal laundry and cleaning apps exist as sibling tools.

## Evidence on Hand

- Question bank v1 (35 scored questions, 6 topics), approved by the owner: `hotel sistemas/evaluaciones-banco-preguntas.md`.
- There is no real employee list yet. Do not fabricate staff data beyond clearly marked demo records.

## Product Principles

1. The employee finishes in a few minutes on a cheap phone, one-handed, without confusion.
2. The rules (window, one attempt, max 6 per topic) are enforced by the server, not only shown.
3. Gerencia sees who is behind and what is misunderstood before anything else.
4. Nothing is lost: answers save as the employee goes.

## Accessibility & Inclusion

Large touch targets, high contrast, plain Spanish, and no reliance on color alone for right/wrong.
