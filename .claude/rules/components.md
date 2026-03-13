# Rules: source/components/

React Ink component conventions for this project.

- Every component is a named export (not default)
- Props are plain objects — no TypeScript interfaces, no PropTypes
- Use `Box`, `Text`, `useInput`, `useApp` from `ink` — no other Ink imports unless discussed
- `useInput` belongs in the component that owns keyboard focus — don't hoist it
- No `useEffect` for derived state — compute inline
- Width is fixed at 48 chars (outer Box) — don't exceed it
- Colors in use: `green` (active), `gray` (inactive), `cyan` (mode), `yellow` (timer), `dimColor` (hints)
- Never hardcode ANSI escape codes — use Ink's `color`/`dimColor` props
