---
description: Add a new caffeinate mode to nosleep (flags, UI, docs)
---

To add a new caffeinate mode named `$ARGUMENTS`:

1. Read `source/caffeinate.js` — add the new mode and its flags to `modeFlags`
2. Read `source/components/ModeSelector.jsx` — add the new mode to the `MODES` array
3. Read `source/components/Dashboard.jsx` — verify MODES is imported from ModeSelector, no change needed if so
4. Read `README.md` — add the new mode to the Modes table with a description
5. Read `CLAUDE.md` — no change needed (modes are derived from code)

Run `/test` to verify the new mode starts and stops cleanly.
