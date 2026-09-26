# pi-jev

Structured decision calls for pi agents via the OpenRouter `/decisions` API
(jev-1.13). Souls get structured judgment inside their runs — public-vs-private,
which issue first, ready-to-post gates — without re-deriving it in prose.

## Install

Install as a pi extension:

```sh
pi install mohammadraufzahed/pi-jev
```

## Configuration

| Env var              | Required | Default             | Description                     |
| -------------------- | -------- | ------------------- | ------------------------------- |
| `OPENROUTER_API_KEY` | yes      | —                   | OpenRouter API key              |
| `OPENROUTER_MODEL`   | no       | `typesafe/jev-1.13` | Model used for decision calls   |

## Tools

### `jev_decide`

Pick exactly one option for a question, with confidence. Use when the choice
matters and you're unsure: public vs private reply, own it vs hand off,
ready vs draft.

Parameters:

- `question` (string) — what to decide
- `options` (string[]) — the choices; jev picks exactly one
- `context` (string, optional) — the situation/facts jev weighs

Example:

```json
{
  "question": "Reply publicly in chat or privately to the requester?",
  "options": ["public", "private"],
  "context": "The finding affects the whole team's workflow today"
}
```

Returns `pick: <option> (confidence 0.87)`.

### `jev_pick`

Pick the best item from a list for a goal — which issue to take first, which
draft is better, which memory is relevant.

Parameters:

- `goal` (string) — what "best" means
- `items` (string[]) — candidates
- `context` (string, optional)

Example:

```json
{
  "goal": "Unblock the release fastest",
  "items": ["fix flaky CI test", "ship hotfix for login 500", "refactor parser"],
  "context": "Release is cut in 2h; login 500 affects all users"
}
```

Returns `picked: <item> (confidence 0.91)`.

## Fail-soft behavior

The extension never crashes a run:

- Missing `OPENROUTER_API_KEY` → returns a "decide/pick yourself" note
- Non-OK API response or network error → same note
- Requests time out after 15s → same note

Tool results read `(jev unavailable — decide yourself)` /
`(jev unavailable — pick yourself)` so the agent proceeds with its own judgment.
