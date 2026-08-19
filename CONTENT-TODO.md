# Content checklist — everything the chapter needs to supply

The site is built and runs. What's below is content only the chapter can
provide. Nothing here requires code.

**How the site behaves while these are unfilled:** anything still marked `TODO`
shows a loud amber warning in development and renders **nothing at all** in
production. No placeholder text can ship by accident — but an unfinished page
will look thin, so work the launch blockers first.

**Audience:** this site is for **alumni and parents**. Recruitment is handled on
separate platforms and is deliberately not advertised here.

*Last reviewed August 2026.*

---

## 🔴 Launch blockers

- [x] **Chapter contact details — done.** One inbox, `fijitamu@gmail.com`,
      monitored by the President and the Treasurer. Mail goes to the P.O. box;
      the Lodge address is listed as a place to visit, not to post to.
      **Still worth confirming the spelling** — it was once given as
      `fiijitamu@gmail.com`, and a wrong contact address is how the old site
      failed.
- [x] **Officer names — done.** All eight.
- [ ] **Ben Powell's headshot.** Seven of eight are in. Square, roughly 800×800,
      under 300KB. Drop it in `public/officers/` and it gets wired up.
      *An officer with no photo shows a plain block, not a broken image — so
      this is cosmetic, not blocking.*
- [ ] **Donor Wall names.** The page is built and currently shows its
      "being updated" state. Add a `Donor Wall` tab to the chapter sheet with
      columns `Name` and `Group` — **names only, never amounts** — or fill in
      `content/donations/donors.json`.

## 🟡 Worth doing before launch

- [x] **`Memo Name` column — done August 2026.** Verified live: "Storage Car
      Port" carries the memo name "Car Port", so a donor pressing Give beside it
      is told to write `Fundraising Campaign - Car Port`. Keep filling this in
      for any new wishlist row — a blank one falls back to the full item name,
      which works but makes for an unusably long memo.
- [ ] **Gallery captions.** All five photos have an empty caption. The photos
      render fine without them, but an empty caption also means the image has no
      alt text for screen readers or when a photo fails to load. Note the CMS
      currently marks caption **required**, so an officer cannot re-save an
      existing photo without inventing one — flagged in `HANDOFF.md`.
- [ ] **Chapter founding year.** `site.json` → `foundedChapter` is still a TODO.
      Renders nothing until filled.
- [ ] **Summer 2026 newsletter PDF.** The issue is listed but has no file, so it
      is hidden from visitors entirely. Drop the PDF in `public/newsletters/`.
- [ ] **Social handles.** `site.json` → `social`, editable in the CMS under
      Chapter info. Any blank one is skipped — the footer never shows a dead
      icon. Leave them all blank if the chapter has none.

## 🟢 Ongoing — not blockers

- [ ] **Keep the calendar current.** This is the whole events system. See
      `CALENDAR-SETUP.md`. Anything with `TBD` in the title stays hidden until
      it is real.
- [ ] **Keep the wishlist current.** Items, costs, and photos all come from the
      sheet's `Wishlist` tab. The list sorts itself most expensive first.
- [ ] **Fund goals.** The $75,000 General goal is real. The foundation and
      philanthropy goals are still guesses the chapter thinks are too high.
      Goals live in the sheet's `Settings` tab — a treasurer edit, no deploy.
- [ ] **Decide on Miller and Clark.** Both may be retired at year end. Miller has
      no recorded gifts; Clark was driven by a class that has graduated.

---

## Struck off — decided, not pending

Recorded so nobody re-opens them.

- **Homepage chapter-intro paragraph.** Removed August 2026. That section is now
  the leadership row, and the field came out of the CMS with it.
- **DFW Alumni Dinner details.** No longer a content task. Events come from the
  calendar — put the dinner on it with a real date, time and venue and it
  publishes itself.
- **Per-officer bios.** Removed with the Leadership page. Officers are photo,
  name, position.
- **The five values, the timeline, the chapter history.** Removed from Our
  Chapter — national boilerplate, one real timeline entry of four, and a history
  that had gone unwritten for months.
- **Newsletter signup / mailing list.** The chapter distributes separately. The
  site hosts the archive and nothing more.
- **Online card payments.** No processor, by decision. Venmo, Zelle and cheque
  are the collection methods, not a stopgap.
- **Contact form.** Removed. It showed a success message and sent nothing.
- **Wishlist category tags and their filter.** Removed after readers found them
  noise. The sheet's `Category` column is no longer displayed — keep using it to
  organise the sheet if it helps you.
