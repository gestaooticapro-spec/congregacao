export interface PartTimerState {
    startedAt: number | null
    runningSince: number | null
    accumulatedMs: number
}

export const initialPartTimerState: PartTimerState = {
    startedAt: null,
    runningSince: null,
    accumulatedMs: 0,
}

/** Derive elapsed time from timestamps so delayed background ticks do not lose time. */
export function getPartElapsedMs(state: PartTimerState, now: number): number {
    return state.accumulatedMs + (state.runningSince === null ? 0 : Math.max(0, now - state.runningSince))
}

export function togglePartTimer(state: PartTimerState, now: number): PartTimerState {
    if (state.runningSince !== null) {
        return { ...state, accumulatedMs: getPartElapsedMs(state, now), runningSince: null }
    }
    return { ...state, startedAt: state.startedAt ?? now, runningSince: now }
}

export function formatPartElapsed(ms: number): string {
    const seconds = Math.floor(Math.max(0, ms) / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
