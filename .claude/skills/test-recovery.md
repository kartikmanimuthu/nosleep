---
description: Test stale socket/PID recovery after daemon is force-killed
---

Run the stale recovery test:

1. Kill any stray caffeinate: `pkill -x caffeinate 2>/dev/null; sleep 0.3`
2. `npx tsx source/cli.jsx start` — start daemon normally
3. `pgrep -l caffeinate` — note the PID
4. Force-kill the daemon: `kill -9 $(cat ~/.nosleep/daemon.pid)`
5. Wait 1 second
6. `npx tsx source/cli.jsx start` — must recover cleanly, output "Starting daemon... done"
7. `pgrep -l caffeinate` — must show exactly ONE caffeinate process (old one killed, new one started)
8. `npx tsx source/cli.jsx status` — must show ● ACTIVE
9. `npx tsx source/cli.jsx shutdown` — clean up
10. `pgrep -l caffeinate` — must be empty

Report PASS or FAIL for each step.
