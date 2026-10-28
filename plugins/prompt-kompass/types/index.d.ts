export type Prompt = { id: string; text: string }

export type ToolMode = 'aus' | 'kompakt' | 'voll'

declare module 'claude-code' {
  interface PluginState {
    'prompt-kompass': { prompts: Prompt[]; toolMode: ToolMode; paneOpen: boolean }
  }
}
