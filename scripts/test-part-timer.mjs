import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/partTimer.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const context = { exports: {} }
runInNewContext(compiled.outputText, context)
const { initialPartTimerState, togglePartTimer, getPartElapsedMs, formatPartElapsed } = context.exports

test('waiting to start leaves the clock unset and elapsed time at zero', () => {
    assert.equal(initialPartTimerState.startedAt, null)
    assert.equal(getPartElapsedMs(initialPartTimerState, 90_000), 0)
})

test('starting fixes the actual start time rather than the time the modal opened', () => {
    const timer = togglePartTimer(initialPartTimerState, 30_000)
    assert.equal(timer.startedAt, 30_000)
    assert.equal(getPartElapsedMs(timer, 35_000), 5_000)
})

test('delayed ticks and a closed modal do not lose running time', () => {
    const timer = togglePartTimer(initialPartTimerState, 10_000)
    assert.equal(getPartElapsedMs(timer, 310_000), 300_000)
})

test('pause freezes elapsed time and resume preserves the original start and deadline', () => {
    const started = togglePartTimer(initialPartTimerState, 10_000)
    const paused = togglePartTimer(started, 20_000)
    assert.equal(getPartElapsedMs(paused, 80_000), 10_000)
    const resumed = togglePartTimer(paused, 80_000)
    assert.equal(resumed.startedAt, 10_000)
    assert.equal(resumed.startedAt + 5 * 60_000, started.startedAt + 5 * 60_000)
    assert.equal(getPartElapsedMs(resumed, 85_000), 15_000)
    const pausedAgain = togglePartTimer(resumed, 90_000)
    assert.equal(getPartElapsedMs(pausedAgain, 200_000), 20_000)
})

test('elapsed time continues past the allotted duration', () => {
    const timer = togglePartTimer(initialPartTimerState, 0)
    assert.equal(getPartElapsedMs(timer, 300_000) > 300_000, false)
    assert.equal(getPartElapsedMs(timer, 300_001) > 300_000, true)
    assert.equal(formatPartElapsed(getPartElapsedMs(timer, 361_000)), '06:01')
})

test('display supports zero, minute boundaries and long parts', () => {
    assert.equal(formatPartElapsed(0), '00:00')
    assert.equal(formatPartElapsed(59_999), '00:59')
    assert.equal(formatPartElapsed(60_000), '01:00')
    assert.equal(formatPartElapsed(3_661_000), '61:01')
})

test('resetting restores a fresh timer without mutating the initial state', () => {
    togglePartTimer(initialPartTimerState, 100_000)
    assert.equal(initialPartTimerState.startedAt, null)
    assert.equal(initialPartTimerState.runningSince, null)
    assert.equal(initialPartTimerState.accumulatedMs, 0)
})
