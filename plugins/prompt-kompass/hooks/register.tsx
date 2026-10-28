import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Prompt, ToolMode } from '../types'

const PANE = 'prompts'
const MODES: ToolMode[] = ['aus', 'kompakt', 'voll']
const KEEP_TOOLS = ['AskUserQuestion']

const prompts = atom({ plugin: 'prompt-kompass', key: 'prompts' } as const, [])
const toolMode = atom({ plugin: 'prompt-kompass', key: 'toolMode' } as const, 'aus')
const paneOpen = atom({ plugin: 'prompt-kompass', key: 'paneOpen' } as const, false)

function firstLine(text: string, max: number): string {
  const line = text.trim().split('\n')[0] ?? ''

  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

function toolLabel(tool: string, input: unknown): string {
  const fields = (input ?? {}) as Record<string, unknown>
  const arg = [fields.file_path, fields.command, fields.pattern, fields.description, fields.url, fields.query, fields.path]
    .find(value => typeof value === 'string') as string | undefined
  const short = arg === undefined ? '' : arg.replace(/^.*[\\/](?=[^\\/]+$)/, '')

  return short === '' ? tool : `${tool} ${firstLine(short, 70)}`
}

async function toPrompt($: EngineInterface, id: string | undefined) {
  if (id === undefined) return { deny: 'noch kein Prompt in dieser Session' }

  return $.ui.scroll({ to: { requestId: id }, block: 'start' })
}

async function openPane($: EngineInterface) {
  await $.ui.open({ id: PANE, title: 'Meine Prompts' })
  await update($, paneOpen, () => true)
}

async function togglePane($: EngineInterface) {
  const isUp = (await $.ui.panes()).some(pane => pane.id === PANE)
  if (isUp) return $.ui.close({ id: PANE })

  return openPane($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const stored = await $.store.get('toolMode')
    if (typeof stored === 'string' && (MODES as string[]).includes(stored)) {
      await update($, toolMode, () => stored as ToolMode)
    }
    const isUp = (await $.ui.panes()).some(pane => pane.id === PANE)
    await update($, paneOpen, () => isUp)
    await $.command.register({ name: 'oben', description: 'Scrollt zum Anfang meines letzten Prompts' })
    await $.command.register({ name: 'prompts', description: 'Liste meiner Prompts zum Hinspringen' })
    await $.command.register({
      name: 'tools',
      description: 'Tool-Zeilen: aus | kompakt | voll',
      argumentHint: 'aus|kompakt|voll',
    })

    return next(e)
  })

  // Remember each prompt the person typed, so it can be numbered and jumped to.
  on('session.append', { door: 'prompt' }, async ($, e, next) => {
    const stored = await next(e)
    if (e.agentId === undefined && e.origin.kind === 'composer' && !e.message.isMeta) {
      const text = e.message.content
        .map(block => (block.type === 'text' ? block.text : ''))
        .join('\n')
      const prompt: Prompt = { id: stored.uuid ?? e.uuid, text }
      try {
        await update($, prompts, list => [...list, prompt].slice(-200))
      } catch {
        // A lost number in the list must never block the prompt itself.
      }
    }

    return stored
  })

  on('command.run', { command: 'oben' }, async $ => {
    const list = await read($, prompts)
    const moved = await toPrompt($, list.at(-1)?.id)

    return { text: moved.deny === undefined ? 'Zum letzten Prompt gescrollt.' : `Nicht gescrollt: ${moved.deny}` }
  })

  on('command.run', { command: 'prompts' }, async $ => {
    await openPane($)

    return { text: 'Prompt-Liste geöffnet.' }
  })

  // Whoever closes the pane (button, close mark, key), the button label follows.
  on('ui.close', async ($, e, next) => {
    const result = await next(e)
    if (e.id === PANE) await update($, paneOpen, () => false)

    return result
  })

  on('command.run', { command: 'tools' }, async ($, e) => {
    const wanted = e.args.trim()
    const current = await read($, toolMode)
    const mode = (MODES as string[]).includes(wanted)
      ? (wanted as ToolMode)
      : MODES[(MODES.indexOf(current) + 1) % MODES.length]
    await update($, toolMode, () => mode)
    await $.store.set('toolMode', mode)

    return { text: `Tool-Zeilen: ${mode}` }
  })

  // The person's own prompt: a cyan box headed "Du · #n".
  on('ui.render', { component: 'UserMessage', props: { origin: { kind: 'composer' } } }, async ($, e) => {
    const list = await read($, prompts)
    const index = list.findIndex(prompt => prompt.id === e.requestId)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
        <Text bold color="cyan">
          Du{index >= 0 ? ` · #${index + 1}` : ''}
        </Text>
        <Text>{e.props.text}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const mode = await read($, toolMode)
    if (mode === 'voll' || e.props.isExpanded || KEEP_TOOLS.includes(e.props.tool)) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const label = toolLabel(e.props.tool, e.props.input)
    if (e.props.isErrored || e.props.isInterrupted) return <Text color="red">✗ {label}</Text>
    if (mode === 'aus') return <Box display="none" />

    return <Text dimColor>· {label}</Text>
  })

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const mode = await read($, toolMode)
    if (mode === 'voll' || e.props.isExpanded || KEEP_TOOLS.includes(e.props.tool)) return next(e)

    const { Box } = $.ui.resolve(e)

    return <Box display="none" />
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const mode = await read($, toolMode)
    if (mode !== 'aus' || e.props.isExpanded || e.props.isCallsOnly === false) return next(e)

    const { Box } = $.ui.resolve(e)

    return <Box display="none" />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, prompts)
    if (e.props.hasSurvey || list.length === 0) return next(e)

    const { Box, Button } = $.ui.resolve(e)
    const last = list[list.length - 1]
    const isOpen = await read($, paneOpen)

    return (
      <Box gap={1}>
        <Button key="up" label={`↑ #${list.length}`} onPress={() => toPrompt($, last?.id)} />
        <Button key="list" label={isOpen ? 'Prompts ✕' : 'Prompts'} onPress={() => togglePane($)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, prompts)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 4)
    const width = Math.max(10, (e.props.bodyColumns ?? 40) - 8)
    const shown = list.map((prompt, index) => ({ prompt, index })).slice(-room)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>Noch keine Prompts.</Text>}
        {shown.map(({ prompt, index }) => (
          <Button key={prompt.id} plain onPress={() => toPrompt($, prompt.id)}>
            <Text color="cyan">#{index + 1}</Text> {firstLine(prompt.text, width)}
          </Button>
        ))}
      </Box>
    )
  })
}
