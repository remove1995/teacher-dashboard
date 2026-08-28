# Teacher Dashboard Architecture

This document records the foundation decisions for the Teacher Dashboard MVP. The product specification in `docs/TEACHER_DASHBOARD_SPEC_v0.1.md` remains the source of truth for product and UX behavior.

## Technology

- Next.js with the App Router
- TypeScript in strict mode
- Prisma ORM
- PostgreSQL from the first migration
- Vitest for isolated domain and business-logic tests

The application is organized into three main layers:

- `app/`: routes, layouts, and presentation components
- `lib/domain/`: pure, deterministic business rules and calculations
- `lib/db/`: Prisma client and persistence-facing helpers

UI code must not embed financial, recurrence, attendance, or credit calculations. Domain functions accept explicit inputs and return values without reading the database, which keeps them easy to test.

## Core Model

### Students and teaching contexts

`Student` is the individual person and is not assigned one permanent teaching type. A student may:

- receive standalone individual lessons;
- belong to multiple pairs or groups over time;
- belong to several teaching contexts simultaneously.

Pairs and groups are represented as `Cohort` records with a `PAIR` or `GROUP` kind. `CohortMembership` records contain effective dates and participant-level commercial overrides. Teaching formats are derived from active memberships and lessons, never from a permanent student type.

`Student.archivedAt` is the soft-delete boundary for beta operations. Archived students are excluded from active lists and selectors while their lessons, attendance, memberships, billing history, payments, credits, and learning records remain intact. Permanent deletion is a separate confirmed action that explicitly removes the student-owned dependency graph in a transaction; shared cohorts and unrelated student data are retained.

### Billing profiles

Billing belongs to an individual student within a context. `BillingProfile` therefore links a student to either:

- the individual context (`cohortId` is null); or
- a specific pair/group context.

The profile stores the billing model and rate/subscription amount. Members of the same cohort may have different prices, billing models, and payment timing.

An active standalone individual learning context is represented by an effective individual `BillingProfile` (`cohortId` is null); pair/group contexts are represented by effective `CohortMembership` records with their own context billing profiles. Student onboarding edits these existing records rather than storing a permanent format enum. Ending a context closes membership and billing effective dates, preserving historical lessons, attendance, payments, and earlier billing profiles.

### Recurring schedules and lessons

A `RecurringSchedule` belongs to either an individual student or a cohort. Exactly one target must be set. Its weekly rules are stored as `ScheduleSlot` records; holidays, breaks, and one-off changes are represented by `ScheduleException`.

Generated lessons retain their source schedule and generation fingerprint. A generated lesson can be marked as manually edited. When a recurring schedule changes for this and all future occurrences:

- past lessons are never modified;
- manually edited future lessons are preserved;
- only untouched future generated lessons are updated or regenerated.

The Lessons Kanban is a planning projection of these same lesson records, not a second lesson system. `kanbanVisible` records an explicit or meaningful planning card, `kanbanMaterializedAt` establishes planning-month workflow order, and `kanbanOrder` persists teacher-defined vertical ordering. Untouched generated occurrences remain hidden from Kanban but visible to Calendar and available for materialization. Materializing a generated occurrence updates that record instead of creating a duplicate. Materialized lessons and manual date overrides are preserved by recurring-schedule revisions.

`LessonPlanningMonth` persists an explicitly created Kanban month independently of lessons. This permits a teacher to keep an empty planning column without manufacturing a lesson record. It targets exactly one student or cohort and is unique per target/month. Confirmed month deletion removes that marker and visible Kanban lesson records belonging to the same target and calendar month; untouched hidden recurring occurrences are not treated as lesson plans.

Confirmed lesson deletion removes the `Lesson` record rather than only clearing its planning fields. Attendance owned by the lesson is removed, reschedule and credit references are safely detached, and existing relation policies handle stages, tags, attachments, and optional learning/test references. Clearing editable plan content remains a separate non-destructive action.

Active/current/future Kanban months precede ended months; ended months form the archive on the right. Within a month, cards without a manual order are sorted nearest-upcoming first, with past/completed work below. Moving a card across months updates only its planned date and Kanban position, retaining its content, completion, attendance, and financial relationships.

A reschedule preserves the original lesson with status `RESCHEDULED` and creates a new lesson whose `originalLessonId` points to it. The replacement is not an additional billable or earned lesson.

The global Calendar is a bounded Week/Month projection of these same `Lesson` records. It does not store calendar-only events. A compact single-occurrence edit updates the existing lesson and marks it manual; an explicit reschedule preserves the original and creates the linked replacement. Cancellation changes status without deleting the occurrence or creating financial credit. Week and Month queries load only their visible date ranges.

### Attendance

Attendance is recorded per lesson and student, including pair/group lessons. A database uniqueness constraint permits at most one attendance row per lesson/student. Aggregate values such as `4/5` are derived.

Completing an individual lesson may set that student's attendance to present. Pair/group attendance remains participant-specific.

Attendance rows distinguish teacher corrections from automatically derived values with `manuallyEdited`. Completing any lesson defaults attendance for its expected active participants to present only where no manual correction exists. Undoing completion returns only auto-derived present rows to planned/unset; manually corrected participant history remains intact.

The global attendance journal is a monthly projection of `Lesson`, `Attendance`, and effective `CohortMembership` records. It creates columns only for dates that contain lessons and never manufactures attendance-only lesson data. Cohort cells and totals aggregate participant-visits. Planned lessons and historical `RESCHEDULED` originals remain visible but are excluded from totals; a linked replacement is counted once when it becomes an occurred lesson. Cancelled lessons remain visible and contribute zero attended visits. Manual corrections upsert the existing lesson/student attendance row.

### Payments and periods

Payments belong to individual students and may optionally identify a cohort context. Every payment stores a period label plus exact period start/end dates. Payment records are append-only from the product perspective; corrections are represented by new records rather than overwriting financial history.

Payment corrections use `correctsPaymentId`: the original receipt remains immutable and the latest correction replaces it only in financial projections. Multiple partial receipts remain independent current records. Period expected amount is counted once, while received cash is the sum of current receipt versions.

Suggested and actual amounts are stored separately. Manual overrides remain visible and recoverable. Partial payments create additional payment records rather than mutating previous receipts.

Cash received and earned income are separate concepts:

- cash received is based on actual paid amounts and payment dates;
- earned income is based on completed, billable lesson service.

Replacement lessons created by rescheduling must never add a second earned charge for the original service.

Expected payment is derived from the billing profile effective for the period, countable lesson services, and explicit applicable credits. Cash received is grouped by payment date. Earned income resolves the billing profile effective on each completed lesson date, preserving historical rates. For group subscriptions the current MVP recognizes the participant subscription proportionally across countable lessons in that payment period; this allocation policy remains an explicit product decision that can be revised without changing stored receipts.

### Credits

Credits are explicit, teacher-confirmed records. Cancellation alone never creates a credit. A credit may be created only when the teacher confirms that a paid individual/pair lesson will not be made up and its value should carry forward.

A student absence from a group subscription creates no credit when the group lesson took place.

### Learning records and attachments

Every `LearningRecord` is owned by one student. It may optionally reference a source lesson and/or cohort context. Group material can later be copied into several individually owned records. `LearningRecord.note` keeps an optional teacher note separate from multiline learning content. The learning-profile UI projects `LearningRecord` and `TestResult` into one chronological stream while retaining their distinct persistence models.

`Attachment` records store names, media types, URLs, sizes, and contextual links. Learning Profile uploads use a replaceable storage adapter; the local implementation writes to `public/uploads/learning` and stores the resulting metadata in PostgreSQL. This is suitable for one local application instance, but deployment must replace it with persistent shared/object storage.

Parent feedback is generated deterministically as an editable, unsaved draft from a read-only projection of learning records within a selected date period and category set. Report generation does not mutate or duplicate learning records; future AI rewriting, persisted report history, templates, and PDF output can build on this boundary.

## Key Invariants

1. Historical lessons are never rewritten by future schedule edits.
2. Manually edited future lesson instances survive schedule regeneration.
3. A reschedule keeps the original record and links one replacement to it.
4. A rescheduled replacement is not an additional billable or earned lesson.
5. Payment history is append-only at the application boundary.
6. Billing and payments always resolve to an individual student, even in pairs/groups.
7. Group attendance and payment state are participant-specific.
8. Group absence creates no automatic credit when the lesson occurred.
9. Credits require an explicit teacher action.
10. Lesson completion does not depend on completing every stage.
11. Missing-homework state is derived from lesson completion and homework content.
12. Manual amount and lesson overrides must never disappear silently.
13. Learning records remain student-owned.
14. All money uses integer minor units to avoid floating-point errors.
15. Calendar dates and local lesson times are modeled explicitly; application timezone conversion occurs at system boundaries.

## Foundation Scope

This phase provides the responsive shell, MVP routes, relational schema, initial migration, seed data, and core calculation tests. It intentionally does not provide production authentication, file uploads, full CRUD workflows, schedule editing UI, report generation, or final visual polish.
