export const HELP_TOPICS = ['setup', 'coin', 'reveal', 'bidding', 'result', 'teams', 'freeDraft', 'match'] as const
export type HelpTopic = (typeof HELP_TOPICS)[number]

const TOPIC_FOR_PHASE: Readonly<Record<string, HelpTopic | undefined>> = {
  LOBBY: 'coin', REVEAL_PLAYER: 'reveal', BIDDING: 'bidding', ROUND_RESULT: 'result', TEAMS_COMPLETED: 'teams',
}
/** No game yet means the setup screen. */
export const helpTopicForPhase = (phase: string | null | undefined): HelpTopic | undefined => (phase ? TOPIC_FOR_PHASE[phase] : 'setup')

export const TUTORIAL_STEPS = ['goal', 'auction', 'budget', 'lineup', 'match', 'keys'] as const
export const TUTORIAL_KEYS = ['move', 'activate', 'bid', 'close', 'drag'] as const
