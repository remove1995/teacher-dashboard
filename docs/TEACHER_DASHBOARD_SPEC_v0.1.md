# Teacher Dashboard — Product & UX Specification v0.1

## 1. Product goal

**Teacher Dashboard** is a personal teacher-management tool for lesson planning, attendance, payments, income tracking, recurring scheduling, and student learning records.

The main principle is:

> **Enter data once — reuse it everywhere.**

The system should reduce duplicate work across lesson planning, attendance logs, payment tracking, monthly income calculations, homework records, and parent-facing learning summaries.

Primary target usage:
- private teachers and tutors;
- individual students, pairs, and groups;
- regular school-year schedules with occasional rescheduling;
- flexible summer schedules;
- desktop for setup/analysis;
- mobile for daily work during and immediately after lessons.

The product must be **mobile-friendly** from the start. Everyday actions should require as few taps as possible.

---

## 2. Core product principles

1. **No duplicated manual data entry**
   - A lesson created from the schedule should automatically exist in Lessons, Calendar, Attendance, and relevant financial calculations.

2. **Teacher-first UX**
   - The system is designed around real tutoring workflows, not generic task management.

3. **Inline editing**
   - No separate “Edit mode” for routine lesson editing.
   - Titles, goals, lesson stages, homework, tags, notes, etc. should be editable directly in place.

4. **Automation with manual override**
   - Recurring lessons, suggested payment amounts, card color/status, and reminders may be automated.
   - The teacher must always retain the ability to manually correct values.

5. **Flexible, user-defined structure**
   - Tags are fully user-defined.
   - Student images are optional and user-uploaded.
   - Individual pricing can override group/pair defaults.

6. **Archive matters**
   - Previous lesson plans, homework, test results, learning records, and payments must remain searchable and reusable.

---

## 3. Main navigation

Primary left-side navigation on desktop:

1. Dashboard
2. Lessons
3. Students
4. Attendance
5. Payments
6. Calendar
7. Reports / Learning reports (optional in MVP; can remain inside Student profile initially)
8. Settings

Potential future sections:
- Materials
- Integrations
- Messaging
- AI tools

Do **not** add future sections to MVP unless explicitly requested.

---

# 4. Core data model

## 4.1 Student

Fields:
- `id`
- `name`
- `type`
  - individual
  - pair member
  - group member
- `custom_image` — optional user-uploaded image
- `color`
- `status`
  - Занимается
  - Пауза
  - Обучение завершено
- `tags[]` — fully user-defined
- `rate`
- `billing_model`
- `custom_price_override` — optional
- `default_schedule`
- `notes_private`
- timestamps

Important:
- A student image is optional.
- The image can be anything the user chooses: textbook cover, photo, illustration, avatar, etc.
- Do not require or imply that a real student photo should be used.

---

## 4.2 Pair

Fields:
- `id`
- `name`
- `members[]`
- `recurring_schedule`
- `default_rate`
- `tags[]`
- `color` or participant-specific colors
- active dates

Important:
- Lesson planning is shared at pair level.
- **Payments belong to individual pair members**, not to the pair as a single payer.
- Each member may have a different price or payment timing.

---

## 4.3 Group

Fields:
- `id`
- `name`
- `members[]`
- `recurring_schedule`
- `default_subscription_price`
- `tags[]`
- `color`
- active dates

Important:
- One group lesson exists as one lesson.
- Attendance is recorded per participant.
- Payments are recorded per participant.
- Individual participants can have a custom price.

Example:
- Standard group price: 4,500 ₽
- One participant: 3,000 ₽ custom price
- Real income must use actual participant prices.

---

## 4.4 Recurring Schedule

Fields:
- `id`
- entity type: student / pair / group
- entity id
- day(s) of week
- start time
- end time / duration
- effective start date
- effective end date
- recurrence status
- exceptions[]

Typical school-year use:
- Created once in September
- Usually valid through May
- Can be changed mid-year from a future date onward

Summer:
- Can use flexible/manual scheduling instead of long recurring patterns.

---

## 4.5 Lesson

Fields:
- `id`
- student / pair / group reference
- scheduled date
- start time
- duration
- title
- goal
- tags[]
- stages[]
- homework
- homework_status (derived, not manually set)
- notes
- status
  - planned
  - completed
  - rescheduled
  - cancelled
- completed_at
- source recurring schedule
- original lesson id if rescheduled
- optional color override

Lesson stages:
- `id`
- text
- completed boolean
- order

Important:
- Number of completed stages does **not** determine whether the lesson is completed.
- A lesson may be completed with 3/6 stages finished.
- Stages must support drag-and-drop reordering.
- New stages should be added inline.

---

## 4.6 Homework

Homework is part of a lesson.

Fields:
- text
- optional attachments
- optional links
- created/updated timestamp

Derived state:
- empty
- added

Important:
- Completing a lesson and adding homework are independent actions.
- A lesson can be completed with no homework yet.
- If a completed lesson has no homework, the system may show an automatic “Homework not added” indicator/reminder.
- The user should not manually toggle this indicator.

Sharing:
- Provide a **Share** action that uses the device-native share sheet where supported.
- The teacher writes homework once in the Dashboard, then shares it via Telegram / VK / WhatsApp / another available app.
- The app should not require permanent storage of messenger contacts for MVP.
- Do not automatically claim that the message was successfully sent to a specific recipient unless the platform can truly verify it.

---

## 4.7 Attendance

Fields:
- lesson id
- student id
- status
  - present
  - absent
  - rescheduled
  - cancelled
  - planned
- optional note

Rules:
- Individual lesson completed → attendance can become present automatically.
- Pair/group lesson → attendance is participant-specific.
- Pair/group table cells show `a/b`, for example:
  - pair: `2/2`, `1/2`
  - group: `5/5`, `4/5`
- Clicking the `a/b` cell opens participant attendance details.

---

## 4.8 Payment

Fields:
- `id`
- student id
- context
  - individual
  - pair name
  - group name
- period
- payment date
- suggested amount
- actual amount
- billing model
- payment status
  - expected
  - paid
  - partially paid
  - overdue
- optional comment
- receipt link
- optional receipt file
- timestamps

Important:
- Payments belong to **specific students**, including members of pairs and groups.
- Payment history is append-only: do not overwrite previous payments.

---

## 4.9 Credit / Carry-over

Fields:
- student id
- source lesson / source period
- amount
- lesson-equivalent quantity
- destination period
- status

Rules:
- For individual students and pairs:
  - paid lesson cancelled and not made up → credit carries forward
- For group subscriptions:
  - student absence does **not** create credit if the group lesson happened

---

## 4.10 Learning Record

Purpose:
- Store what has been studied
- Keep teacher learning notes
- Keep test results
- Support parent-facing learning summaries

Subsections:

### Vocabulary
Each entry:
- date
- topic/title
- optional text/list
- optional screenshot / file / link

### Grammar & Functions
Each entry:
- date
- topic/title
- optional explanation/examples
- optional screenshot / file / link

### Notes
Teacher learning notes such as:
- repeated errors
- improvements
- current focus
- areas to revisit

These are teacher notes by default, not automatically parent-facing.

### Test Results
Prefer unit-based summary:
- Unit 1 Test
- Unit 2 Test
- Unit 3 Test
etc.

Each result can include:
- score
- max score / percentage
- date
- comment
- attached student work / screenshot / file

---

# 5. Automatic behavior rules

## 5.1 Recurring lesson generation

When a recurring schedule is created:
- generate future lesson instances for its valid period
- do not require the teacher to create monthly lesson cards manually

Changing a recurring schedule:
- allow:
  - change only this lesson
  - change this and all future lessons

Past lessons must not be retroactively altered.

---

## 5.2 Completing a lesson

Action: **Завершить урок**

Effects:
- lesson status → completed
- completed timestamp stored
- lesson card changes visual state
- attendance updates
- earned-income logic updates
- homework remains independent

Important:
- The lesson can be completed even if some stages are unchecked.
- User must be able to undo accidental completion if appropriate.

---

## 5.3 Lesson card color

Each student/pair/group may have a preferred color chosen by the user.

Recommended logic:
- future/uncompleted lesson:
  - white / neutral card with student color accent
- completed lesson:
  - soft tinted card using the selected entity color

Manual override:
- allow user to change a specific lesson color if desired

Do not require manual recoloring after every lesson.

---

## 5.4 Homework reminders

If:
- lesson is completed
- homework field is empty

Then:
- show a derived indicator such as “Д/з не добавлено”
- optionally surface this in Dashboard “Needs attention”

Do not require a separate manual homework-status toggle.

Possible future setting:
- remind immediately
- remind later in the day
- do not remind

---

## 5.5 Payment calculation

Suggested payment amount should be generated automatically and remain manually editable.

### Monthly prepaid
Formula:
`number of scheduled lessons × rate − available credit`

Example:
`8 × 2,500 ₽ − 2,500 ₽ = 17,500 ₽`

### Weekly prepaid
Formula:
`number of lessons in selected week × rate`

### Pay per lesson
Formula:
`completed unpaid lessons × rate`

### Group subscription
Use:
- participant's custom price if set
- otherwise standard group subscription price

Under the amount field, display the calculation source.

If user manually edits the amount:
- show “Изменено вручную”
- provide “Вернуть расчётную сумму”

---

## 5.6 Partial payments

Allow actual payment < expected amount.

Example:
- expected: 20,000 ₽
- paid: 10,000 ₽
- status: partially paid
- remaining: 10,000 ₽

Next payment is a new payment record.

---

## 5.7 Real income

Keep two concepts separate:

### Cash received
Actual payments received during the period.

### Earned income
Value of completed lessons / earned service.

Do not conflate them.

---

# 6. Screen specifications

## 6.1 Dashboard

Purpose:
- quick daily overview
- not a full analytics page
- not a task-manager clone

Top summary:
- lessons today
- lessons this week
- income for month

Main work area:
- lesson planner / quick kanban access

Optional compact “Needs attention” list:
- confirm past lesson
- add homework
- payment requires attention

Keep minimal.

---

## 6.2 Lessons

Primary workflow.

### Context
User selects a student / pair / group.

### Views
- Kanban
- Calendar

### Kanban
Columns = months.

Preferred order:
- current month first
- previous months after it

Example:
- August 2026
- July 2026
- June 2026
- May 2026

Each month column contains all lessons for that entity in the month.

Collapsed lesson card shows:
- date/time
- title/topic
- tags
- stage progress
- status through visual styling

### Lesson detail — desktop
Open in side panel while kanban remains visible.

### Lesson detail — mobile
Open as near-full-height sheet / mobile detail surface.

### Inline editing
No separate Edit mode.

Directly editable:
- title
- goal
- tags
- stages
- homework
- notes

Stages:
- checkbox
- add inline
- reorder with drag-and-drop

### Tags
All tags are user-created.
Multiple tags per lesson.
No mandatory system categories.

Search/filter:
- by free text
- by tags
- by previous lessons

Reuse:
- allow finding old lesson plans and copying/reusing them.

---

## 6.3 Students

Students list:
- active students / pairs / groups
- status
- custom color
- optional custom image

Student profile tabs:
- Overview
- History
- Finance
- Learning Profile
- Notes

Avoid too many duplicated tabs.

---

## 6.4 Student Overview

Purpose:
- concise summary
- mostly derived from other data

Header:
- optional custom image
- name
- year/level if used
- format
- status: Занимается / Пауза / Обучение завершено
- color
- tags
- recurring schedule
- rate
- payment model

Main blocks:
- next lesson + “Открыть план”
- current payment summary
- recent lessons
- short notes

Do not overload with charts.

---

## 6.5 Student History

Combine:
- lesson history
- attendance status
- homework

Each row:
- date
- topic
- attendance / lesson status
- homework preview

---

## 6.6 Student Finance

Only this student's:
- current period calculation
- expected amount
- paid amount
- credit
- payment history
- receipt links
- future suggested amount

---

## 6.7 Learning Profile

Sections:

### 1. Completed Material
#### Vocabulary
Entries:
- date
- topic
- text/list OR screenshot/file
- attachments inline

#### Grammar & Functions
Entries:
- date
- topic
- text/examples
- attachments inline

### 2. Notes
Teacher-facing learning observations:
- repeated errors
- improvements
- current focus

### 3. Results
Unit-based list:
- Unit 1 Test
- Unit 2 Test
- Unit 3 Test

Each may include:
- score
- note
- attachment of student work

### 4. Parent Report
User selects:
- period
- which sections to include:
  - Vocabulary
  - Grammar
  - Notes
  - Results

Action:
- Generate report
- Share

Parent-facing notes/report text should support Russian.

Attachments should belong to their relevant learning record/test entry.
Do **not** create a separate generic “Materials & files” dump inside Learning Profile.

---

## 6.8 Payments — Global

Filters:
- month/period
- payment status
- billing model
- search

Top compact summary:
- expected
- received
- credits
- overdue
- optional earned vs expected income

### Individuals
One row per student.

### Pairs
Collapsible parent row.

Example:
Adam / Daniel
- 1/2 paid
- expected total

Expanded:
- Adam — paid
- Daniel — expected

### Groups
Collapsible parent row.

Example:
GoGetter Group
- 4/5 paid

Expanded:
- each participant
- their actual individual price
- status
- payment date

Custom pricing:
- default group price
- participant can override
- actual income uses participant-specific amount

---

## 6.9 Add Payment

Fields:
- student
- context
- period
- payment date
- amount
- billing model
- optional comment
- payment proof

Amount:
- auto-calculated by default
- manually editable

Payment proof:
- link (primary scenario)
- optional file

Receipt link should be stored with the specific payment.

---

## 6.10 Attendance — Global

Purpose:
- automatic attendance journal
- preserve the clarity of a spreadsheet without manual duplication

Filters:
- month
- All
- Individuals
- Pairs
- Groups

No large separate monthly-summary cards.

Table:
- rows = student / pair / group
- columns = lesson dates
- final column = total

### Individual
Cells:
- completed/present
- absent
- rescheduled
- cancelled
- planned

### Pair
Cells:
- `2/2`
- `1/2`

### Group
Cells:
- `5/5`
- `4/5`

Clicking a pair/group cell:
- opens participant list
- allows attendance editing

Final column examples:
- Individual: `7/8`
- Pair: `14/16`
- Group: `36/40`

Legend:
- compact single-row legend
- on mobile can be hidden behind `ⓘ`

---

## 6.11 Calendar — Global

Purpose:
- manage the teacher's full schedule
- not duplicate student-specific Lesson Calendar view

Primary view:
- Week
Secondary:
- Month

Filters:
- All
- Individuals
- Pairs
- Groups

Each event:
- color
- time
- student/pair/group
- optional lesson title
- status marker

Click event:
- open plan
- reschedule
- cancel
- edit occurrence

### Recurring schedule editor
Show:
- entity
- days
- time
- validity period

When editing:
- only this lesson
- this and all future lessons

### Schedule exceptions
Support:
- holidays
- vacation
- breaks

Past lessons are never changed by future recurring-schedule edits.

---

# 7. Mobile behavior

Daily workflows should be optimized for mobile.

## Lessons
- compact cards
- horizontal month navigation or month tabs
- lesson detail in bottom/full-height sheet

## Attendance
- horizontal date scrolling
- sticky row labels / totals where possible
- pair/group attendance detail in bottom sheet

## Payments
- collapsible pair/group sections
- add-payment form as bottom sheet / full-height form

## Calendar
- week/day-friendly list
- bottom sheet for edit actions

## Share
Use native device share sheet where supported.

---

# 8. Search and tags

All tags are user-defined.

Support:
- multiple tags per lesson
- multiple tags per student/group
- free text search
- filter by one or multiple tags

Primary use:
- retrieve previous lesson plans
- copy/reuse ideas
- organize by coursebook, club, format, topic, or any user-specific convention

Do not hard-code categories such as Grammar / Vocabulary / Speaking as mandatory tag types.

---

# 9. Data integrity requirements

1. Past lessons must remain historically accurate.
2. Payments must be append-only records.
3. Manual overrides must not silently disappear.
4. Rescheduled lessons must not be counted as extra income if they replace an original lesson.
5. Group absence must not create financial credit unless a group-specific rule is explicitly added later.
6. Individual/pair cancelled paid lessons may create carry-over credit.
7. Completing a lesson must not require completing all lesson stages.
8. Homework completion status is derived from homework content, not manually toggled.

---

# 10. MVP scope

Include:

1. Students / pairs / groups
2. Custom colors and optional custom images
3. User-defined tags
4. Recurring schedules
5. Automatic lesson generation
6. Lesson kanban by month
7. Calendar view
8. Inline lesson editing
9. Lesson stages + drag-and-drop
10. Finish lesson
11. Homework field + derived missing-homework indicator
12. Native share action for homework where available
13. Attendance
14. Pair/group participant attendance
15. Payment models
16. Auto-calculated suggested payment
17. Manual payment override
18. Partial payments
19. Receipt link
20. Credits/carry-over
21. Individual pricing inside groups/pairs
22. Student overview
23. Learning profile
24. Learning-record attachments
25. Unit test results
26. Parent-report generation basics
27. Dashboard summaries

---

# 11. Explicitly out of scope for MVP

Do not implement unless explicitly added later:

- AI lesson-plan generation
- AI homework generation
- automatic reading of private Telegram/VK chats
- complex messenger integrations
- student/parent login portal
- full accounting system
- payroll
- advanced CRM
- complex progress percentage scoring
- gamification
- homework templates
- automatic photo recognition/OCR
- advanced analytics dashboards
- third-party calendar sync
- public marketplace
- multi-teacher organization accounts

---

# 12. Design guidance

Current visual references are **UX references, not final pixel-perfect visual design**.

Current preferred direction:
- clean
- light
- calm
- spacious
- not overloaded
- card-based but not “generic SaaS dashboard”
- responsive
- readable on mobile
- student color accents
- minimal decorative elements

Do not overuse:
- charts
- icons
- gradients
- illustrations
- avatars
- decorative thumbnails

Functionality and information hierarchy are more important than visual polish in the first build.

---

# 13. Reference images

Create a folder:

`docs/references/`

Recommended naming:

- `01-dashboard.png`
- `02-lessons-kanban.png`
- `03-student-profile.png`
- `04-learning-profile.png`
- `05-payments.png`
- `06-attendance.png`
- `07-calendar.png`

Add a short README in that folder:

> These images are approved UX references.  
> Reproduce structure, hierarchy, and interaction logic where relevant.  
> Do not treat colors, typography, spacing, avatars, or decorative details as pixel-perfect requirements unless explicitly stated in the main specification.

---

# 14. Recommended development sequence

## Phase 0 — Foundation
- create project
- routing
- database/data model
- demo seed data
- responsive shell

## Phase 1 — Students + recurring schedules
- students
- pairs
- groups
- schedule rules
- automatic lesson generation

## Phase 2 — Lessons
- month kanban
- calendar view
- inline lesson panel
- tags
- lesson stages
- homework
- finish lesson

After approval:
> LESSONS UX — FROZEN

## Phase 3 — Attendance
- individual auto-attendance
- pair/group attendance
- global journal

After approval:
> ATTENDANCE UX — FROZEN

## Phase 4 — Payments
- payment models
- suggested amount
- custom pricing
- partial payments
- credits
- receipt links
- payment history

## Phase 5 — Student profile + Learning profile
- overview
- history
- finance
- learning record
- test results
- attachments

## Phase 6 — Homework sharing
- native Share flow

## Phase 7 — Dashboard
- real derived data only
- no fake static analytics

## Phase 8 — Visual polish
- typography
- spacing
- colors
- mobile refinement

## Phase 9 — Testing + deployment
- calculation tests
- recurring schedule tests
- reschedule tests
- mobile testing
- deployment

---

# 15. Codex implementation rules

Codex should:

1. Read this file before implementing changes.
2. Treat it as the current source of truth.
3. Work incrementally.
4. Avoid adding unrequested features.
5. Preserve already approved behavior.
6. Do not silently change frozen sections.
7. Test relevant existing flows after every change.
8. Prefer real data flow over static mock data.
9. Keep financial calculations testable and isolated.
10. Keep recurring schedule logic testable and isolated.
11. Keep mobile behavior in scope during implementation, not as a late patch.

---

# 16. Initial Codex task

Suggested first prompt:

> Read `docs/TEACHER_DASHBOARD_SPEC.md` fully before making changes.
>
> Do not implement the entire product yet.
>
> Create the project foundation and data model for:
> - students
> - pairs
> - groups
> - recurring schedules
> - lessons
> - attendance
> - payments
> - credits/carry-over
> - learning records
>
> Create realistic demo seed data for:
> - one individual student
> - one pair
> - one group with at least one participant on a custom price
> - monthly prepaid, weekly prepaid, pay-per-lesson, and group-subscription payment models
>
> Create only the basic responsive application shell and routes for the MVP screens.
>
> Do not spend time on final visual polish yet.
>
> Before coding, summarize the proposed architecture and identify any ambiguous data relationships or rules in the specification. Do not invent missing business rules without flagging them.

