---
description: Run the full manual test cycle for nosleep (start, verify, stop, shutdown)
---

Run the nosleep test cycle:

1. Kill any stray caffeinate processes: `pkill -x caffeinate 2>/dev/null; sleep 0.3`
2. Run `npx tsx source/cli.jsx start` and confirm output shows "nosleep active"
3. Run `pgrep -l caffeinate` — must show exactly one process
4. Run `npx tsx source/cli.jsx status` — must show ● ACTIVE with a PID
5. Run `npx tsx source/cli.jsx stop` — confirm "nosleep stopped"
6. Run `pgrep -l caffeinate` — must be empty
7. Run `npx tsx source/cli.jsx status` — must show ○ inactive
8. Run `npx tsx source/cli.jsx start --mode display --timer 30m`
9. Run `npx tsx source/cli.jsx status` — must show mode: display, ~30:00 remaining
10. Run `npx tsx source/cli.jsx shutdown` — confirm "daemon shut down"
11. Run `pgrep -l caffeinate` — must be empty
12. Run `npx tsx source/cli.jsx status --json` — must return `{"running":false}`

Report PASS or FAIL for each step. If any step fails, show the actual output and stop.
