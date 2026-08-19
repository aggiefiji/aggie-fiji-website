# Chapter events calendar — setup

Every event on the website comes from one Google Calendar. Add an event there
and it appears on the site within five minutes. Delete it and it disappears.

**There is no website login for events.** That is the whole point of doing it
this way — the tool you already use every day is the tool that updates the site.

---

## The one rule

> ⚠️ **This calendar is public, and there is no review step.** Whatever you type
> is on the website within five minutes, visible to every alum and parent.
>
> Do **not** use the chapter's working calendar for this. Exec meetings, private
> member events, and half-finished notes do not belong on a calendar that
> publishes itself.

---

## Sheet-level setup — do this once

1. In a **chapter-owned Google account** (not a personal one — it disappears
   when that brother graduates), create a new calendar named
   **Aggie FIJI Alumni Events**.
2. Settings → that calendar → **Access permissions** → check
   **Make available to public**. Leave it on "See all event details".
3. Same screen, scroll to **Integrate calendar** and copy the **Calendar ID**.
   It looks like `abc123...@group.calendar.google.com`.
4. Put it in `.env.local`:

   ```
   GOOGLE_CALENDAR_ID=abc123...@group.calendar.google.com
   ```

5. The site reuses `GOOGLE_SHEETS_API_KEY` unless you set
   `GOOGLE_CALENDAR_API_KEY`. **Watch this one:** the setup notes for the sheet
   tell you to restrict that key to "Google Sheets API only", and a key
   restricted that way is rejected for Calendar. In Google Cloud Console →
   Credentials → your key → **API restrictions**, add **Google Calendar API**
   alongside Sheets. Or issue a second key and set `GOOGLE_CALENDAR_API_KEY`.

---

## How to add an event

Make a normal calendar event. The fields map like this:

| In Google Calendar | On the website |
|---|---|
| Title | Event name (the heading) |
| Date and time | The date badge and the time line |
| All-day event | Shows the date with no time |
| Location | The line under the date |
| Description | The paragraph under the event |
| Recurring event | Each occurrence appears on its own |

**Formatting in the description is ignored.** Bold, links, and bullets are
stripped to plain text. Write it as one or two plain sentences.

### Tagging an event

**Type a hashtag and it becomes a badge on the card.** Anywhere in the title or
the description, and any word you like — there is no approved list.

```
Parents Weekend #parents
Home game tailgate. #tailgate #alumni
```

The hashtag is removed before the text is shown, so `All families welcome.
#parents` displays as "All families welcome." with a **PARENTS** badge beside
the event.

- Use as many as you want; duplicates are merged.
- Capitals don't matter — `#Parents` and `#parents` are the same badge.
- Four words get friendlier wording: `#everyone` → "Open to all",
  `#parents` → "Parents & families", plus `#alumni` and `#members`.
  Everything else shows exactly as you typed it.
- A hashtag starting with a number is left alone, so "Game #5" keeps its "#5".

**By default an event shows no badge at all**, which is usually right — on a
page called Alumni Events, a badge reading "Alumni" on every single event tells
a visitor nothing. Tag the exceptions, not the rule.

### What will NOT publish

The site refuses to show an unfinished event, because the old site's worst habit
was leaving stale and fake details up. These rules are automatic:

| If you… | Then… |
|---|---|
| Put **TBD** or **TODO** in the **title** | The whole event is hidden until you fix it |
| Put **TBD** or **TODO** in the **location** | The event shows, the venue line is left off |
| Put **TBD** or **TODO** in the **description** | Everything before the marker shows; the rest is cut |
| Mark the event **private** (the lock icon) | The event is hidden — a working "not yet" switch. Google leaves it out of the public feed entirely, so the website never even sees it |
| **Cancel** / delete the event | It disappears from the site |

So the safe way to hold a date you haven't finalised: create it with **TBD in
the title**. It stays invisible until you take TBD out.

### Events move themselves

An event moves from "Upcoming" to "Past" on its own date. You never have to
delete an old event to stop the page looking stale. Past events are kept visible
on purpose — a chapter with a visible track record reads better than an empty
calendar over the summer.

---

## If something doesn't show up

Work down this list:

| Symptom | Cause |
|---|---|
| Event missing, others fine | TBD/TODO in the title, or marked private |
| **Every** event missing, page says it cannot reach the calendar | Calendar isn't public, or the API key doesn't allow Calendar. Check the terminal |
| Nothing at all, empty state | Calendar is genuinely empty in the window read (12 months back, 18 months ahead) |
| An old event vanished | Past events are only read one year back, on purpose — the list is evidence the chapter is active, not an archive |
| Change not showing yet | Figures refresh about every 5 minutes by design, not instantly |

With `npm run dev` running, the terminal prints a line for each problem, and the
events page shows a dev-only note saying where events came from.

### ⚠️ "TBA" is NOT the same as "TBD" here

The publish gate looks for **`TBD`** and **`TODO`** only. `TBA` is ordinary text
and publishes as typed.

That is deliberate, and it is useful — an event titled
"South Carolina Watch Party (Location TBA)" has a real date and a real name, and
hiding it would serve nobody. But it does mean the two abbreviations behave in
opposite ways:

| You type | What happens |
|---|---|
| `TBD` or `TODO` in the **title** | The event does not publish at all |
| `TBD` or `TODO` in the **location** | The event publishes; the venue is left off |
| `TBA` anywhere | Publishes exactly as typed, visible to everyone |

So use `TBD` when the event is not ready to be announced, and `TBA` when you
want people to see it and know a detail is still coming.

### There is no fallback — and that is deliberate

The calendar is the only source of events. There used to be JSON files in
`content/events/` as a safety net; they and the code that read them were deleted
in August 2026.

The reasoning: a fallback list is only useful if someone keeps it current, and
nobody keeps a file current that nobody ever sees. What it actually produced was
a stale list shown at exactly the moment the site could not tell it was stale.
An alum who drives to an event that moved is worse served than one who is told
plainly that the calendar could not be read.

So the events page now distinguishes two things a blank list can mean:

- **"We cannot reach the calendar right now"** — configured but unreadable. This
  is a fault on our end and it says so.
- **"No events to showcase right now"** — the calendar was read and is quiet.

**What this costs you:** the calendar has no field for a markdown body, a
"featured" flag, or a per-event image, so those are gone too. Everything an
event needs has to fit in a title, a date, a location, a description, and
hashtags. That constraint is the price of having one source that is always
current.

---

## Where the wiring lives

- `src/lib/calendar.ts` — reads the calendar, applies the publish gate above.
- `src/lib/events.ts` — the single entry point every page uses for events.
- `src/integrations.config.ts` → `calendar` — the on/off switch.
