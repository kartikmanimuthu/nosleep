---
name: Bug Report
about: Something isn't working
labels: bug
---

**Describe the bug**
A clear description of what's wrong.

**To reproduce**
Steps to reproduce the behavior.

**Expected behavior**
What you expected to happen.

**Environment**
- macOS version (`sw_vers -productVersion`):
- Node.js version (`node --version`):
- nosleep version (`cat package.json | grep version`):

**Diagnostics**
```
# Paste output of:
nosleep status --json
pgrep -l caffeinate
cat ~/.nosleep/state.json
```
