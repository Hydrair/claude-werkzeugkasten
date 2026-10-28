# claude-werkzeugkasten

Meine Plugins für Claude Code, als Marketplace, damit ich sie auf jedem Rechner installieren kann.

| Plugin | Was es macht |
| --- | --- |
| `prompt-kompass` | Mod: eigene Prompts als cyanfarbene Box mit Nummer, Tool-Zeilen ein-/ausblendbar (`/tools aus\|kompakt\|voll`), Button zum Hochspringen an den letzten Prompt, Prompt-Liste als Pane (Button schaltet sie an und aus, oder `/prompts`, `/oben`) |
| `razor-hush` | Skill: erst kürzen, dann ergänzen; kleinste Änderung, die funktioniert; still arbeiten und einmal am Ende berichten. Dazu der Output-Style **Hush** (in `/config` auswählbar): still während der Arbeit, danach eine kurze Nachricht in einfachen Worten |

## Installieren

Am Prompt einer Claude-Code-Session:

```
/plugin install prompt-kompass --marketplace Hydrair/claude-werkzeugkasten
/plugin install razor-hush --marketplace Hydrair/claude-werkzeugkasten
```

Aus einer Shell:

```
claude plugin install prompt-kompass --marketplace Hydrair/claude-werkzeugkasten
claude plugin install razor-hush --marketplace Hydrair/claude-werkzeugkasten
```

## Entwickeln

Die Mod lädt lokal ohne Installation über `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`:

```json
"env": { "CLAUDE_CODE_PLUGIN_DIRS": "C:/Workspace/claude-werkzeugkasten/plugins/prompt-kompass" }
```

Änderungen an `hooks/register.tsx` werden dann am Ende jedes Turns neu geladen.

Prüfen:

```
claude plugin validate plugins/prompt-kompass
claude plugin validate .
```
