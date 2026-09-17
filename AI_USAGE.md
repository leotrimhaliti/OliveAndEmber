# AI assistance record

This file summarizes assistance provided during this task. It is **not** a transcript and does not replace the actual prompts and responses required by the employer.

## What AI helped with

- Interpreting the brief and proposing a small Laravel/React architecture, relational schema, API outline, and five-day plan.
- Inspecting an initially empty Git repository and the Windows environment.
- Scaffolding Laravel and the frontend toolchain, selecting compatible installed dependency versions, and adding an isolated PHP runtime because the installed XAMPP PHP was too old.
- Implementing authentication, protected administrator registration, catalog management, transactional checkout, ownership checks, and order snapshots.
- Building the React pages, responsive styling, cart persistence, API/CSRF wrapper, and admin forms.
- Writing focused API/cart tests and running the checks recorded in VERIFICATION.md.
- Exercising the running local application through browser interactions, including login, checkout, product save, status changes, and mobile layout inspection.
- Preparing installation instructions, a submission description, publishing checklist, and a MySQL-backed CI workflow.

## Verification and human responsibility

Checks performed by the assistant are recorded in VERIFICATION.md. This document does not claim the candidate independently reviewed, tested, or authored every generated line. Before submission, the candidate should review the implementation, perform a fresh MySQL setup, run all tests, and be comfortable explaining the code. Update this record with any additional checks actually performed; do not claim checks that were not run.

Important decisions to understand: integer-cent prices, transactional product-row locking, immutable order-item snapshots, backend ownership checks, cookie-based authentication with CSRF, and invitation-only admin creation.

## Required conversation evidence

Save or export the **full actual conversation**, including the original request, follow-up prompts, and assistant responses, using the export/copy facilities available in your client. Keep that file with your submission according to the employer's instructions. Do not fabricate or reconstruct a transcript from this summary. No synthetic conversation transcript has been generated in this repository.
