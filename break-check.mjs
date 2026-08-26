/**
 * Negative tests: break the config on purpose and prove the validator notices.
 *
 *   node break-check.mjs            run every case
 *   node break-check.mjs very       run the cases whose name contains "very"
 *
 * A check that has never been seen to fail is indistinguishable from a check
 * that cannot fail, and validate.mjs is now long enough that reading it is no
 * longer evidence about what it does. So each case here damages a copy of the
 * config in one specific way and asserts which checks go red.
 *
 * THE GUARD IS THE POINT, MORE THAN THE TEST.
 *
 * Every case asserts that the sabotage actually landed before it believes
 * anything about the result. This is not defensiveness for its own sake: a
 * sibling suite lost an afternoon to a sed whose escapes collapsed, so it
 * edited a line nobody meant and then reported a clean pass. That looked
 * exactly like proof the check worked. If a fragment here stops matching, the
 * case would write the file back unchanged, the validator would pass, and the
 * output would read "these entries are not needed" when it meant "the test did
 * nothing". So a sabotage that changes nothing is a hard ABORT, never a pass.
 *
 * SPECIFICITY IS ALSO ASSERTED. Each case names the checks it expects to fail,
 * and a case that fails *more* than it should is reported as loudly as one that
 * fails less. Removing the direction regexp should break departures and nothing
 * else; if it also breaks the sound budget, the checks are entangled and the
 * suite is telling you less than it appears to.
 *
 * The config is restored from a byte copy afterwards and the restoration is
 * verified. A negative test that leaves the real file damaged is worse than no
 * negative test at all.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const CFG = 'Config/highlights.cfg'
const BAK = 'Config/highlights.cfg.breakcheck.bak'

/**
 * Ways to damage the config.
 *
 * Each returns the new text. They are deliberately dumb string operations on
 * text we control - no shell, no sed, nothing that can reinterpret a backslash
 * between here and the file.
 */
const sabotage = {
  /** Drop whole `#highlight` entries containing any of these fragments. */
  removeEntries: (text, fragments) =>
    text
      .split('\n')
      .filter((l) => !(l.startsWith('#highlight') && fragments.some((f) => l.includes(f))))
      .join('\n'),

  /** Plain textual substitution, applied everywhere it occurs. */
  replace: (text, [from, to]) => text.split(from).join(to),

  /** Put a line back that should not be there. */
  append: (text, line) => `${text}\n${line}\n`,
}

/** How many `#highlight` entries a given text has. The unit the guard counts. */
const count = (text) => text.split('\n').filter((l) => l.startsWith('#highlight')).length

const CASES = [
  {
    name: 'bard-entries',
    why: 'the entries added from a Bard training in a town street',
    how: ['removeEntries', ['makes playing your', 'already playing a song', 'on your ']],
    expectFail: ['every observed line is caught'],
  },
  {
    name: 'mindstate-bands',
    why: 'the three EXP mindstate bands',
    how: ['removeEntries', ['dabbling|perusing', 'understanding|absorbing', 'captivated|engrossed']],
    expectFail: ['every DR mindstate is covered', 'every observed line is caught'],
  },
  {
    name: 'very-prefix',
    why: 'the optional "very " in front of four mindstates',
    // The subtlest real bug found in this file: the anchor puts "very"
    // immediately after the percentage, so a bare alternative never sees
    // "07% very focused". Invisible by eye in a list of thirty-five words.
    how: ['replace', ['(?:very )?', '']],
    expectFail: ['every DR mindstate is covered'],
  },
  {
    name: 'gemstone-restored',
    why: 'a GemStone IV mindstate put back into a DragonRealms config',
    how: ['append', '#highlight {line} {#FF0000} {is saturated} {learning}'],
    expectFail: ['no GemStone mindstates'],
  },
  {
    name: 'direction-regexp',
    why: 'the departure match that keys on direction rather than verb',
    how: ['removeEntries', ['east|west']],
    expectFail: ['the direction match is present', 'every observed line is caught'],
  },
  {
    name: 'empty-config',
    why: 'every highlight in the file',
    how: ['removeEntries', ['#']],
    expectFail: [
      'there are highlights at all',
      'there are regexps to check',
      'the direction match is present',
      'the most frequent line is silent',
      'idle warning is covered',
      'idle warning makes a sound',
      'resting-not-learning is covered',
      'arrivals are covered',
      'a creature entering is covered',
      'a creature entering is audible',
      'every DR mindstate is covered',
      'there are entries to match against',
      'every observed line is caught',
      'every line Lich documents is caught',
      'every wound severity is covered',
    ],
    // Not a failure: with nothing to take a ratio of, "is it too loud" has no
    // answer. It used to report FAIL with "0 of 0" - a real failure carrying a
    // false reason, which would send the next reader hunting for sounds to
    // remove from a file that has none. This case is what surfaced it.
    // Only this one. Lich is still on disk, so the mindstate ladder check runs
    // and fails on coverage rather than skipping - emptying the config does not
    // make the instrument unavailable, only the thing being measured.
    expectSkip: ['under a third of entries make a sound'],
  },
  {
    name: 'wound-bands',
    why: 'the four wound severity bands',
    how: ['removeEntries', ['-- *(']],
    expectFail: ['every wound severity is covered', 'every line Lich documents is caught'],
  },
  {
    name: 'bare-severity',
    why: 'a bare severity word put back, the regression this section replaced',
    // The old entry was `{line} {#FF0000} {severe} {wounds}`, which reddened
    // "severe scarring" and "severely swollen" while leaving "devastating" and
    // "useless" uncoloured. Asserted so reaching for the short version fails.
    how: ['append', '#highlight {line} {#FF0000} {severe} {wounds}'],
    expectFail: ['no unanchored severity words'],
  },
  {
    name: 'lodged-and-parasites',
    why: 'the lodged-item and parasite entries',
    how: ['removeEntries', ['lodged .* into your', 'blood mite']],
    expectFail: ['every line Lich documents is caught'],
  },
  {
    name: 'no-lich-healing',
    why: 'the wound ladder is unavailable, not wrong',
    how: null,
    env: { DR_LICH_HEALINGDATA: 'C:/nowhere/does/this/exist.rb' },
    expectFail: [],
    expectSkip: ['the DR wound severity ladder'],
    expectSummaryNot: 'all passed',
  },
  {
    name: 'guard-itself',
    why: 'nothing, on purpose - this fragment matches no line in the config',
    // The guard is the reason this file is trustworthy, so the guard needs a
    // test of its own. Without this case, "the sabotage landed" is a promise in
    // a comment; with it, a run that stopped noticing silent no-ops fails here
    // first and says so. The fragment is deliberate nonsense and must stay
    // that way.
    how: ['removeEntries', ['this-fragment-matches-nothing-on-purpose']],
    expectAbort: true,
    expectFail: [],
  },
  {
    name: 'no-lich',
    why: 'the mindstate ladder is unavailable, not wrong',
    // Nothing is damaged here. This case exists because the SKIP branch was
    // itself broken: it printed NOT CHECKED and the run still ended on the
    // words "all passed", which is the whole failure this repo keeps finding,
    // committed by the check written to prevent it.
    how: null,
    env: { DR_LICH_DRVARIABLES: 'C:/nowhere/does/this/exist.rb' },
    expectFail: [],
    expectSkip: ['the DR mindstate ladder'],
    expectSummaryNot: 'all passed',
  },
]

/** Run the validator and pull the three answers back out of its output. */
function runValidator(env) {
  let out
  try {
    out = execFileSync('node', ['validate.mjs'], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    })
  } catch (e) {
    // A non-zero exit is the normal case here, and its output is the payload.
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
  const named = (prefix) =>
    out
      .split('\n')
      .filter((l) => l.startsWith(prefix))
      .map((l) => l.slice(prefix.length).trim().split(/\s{2,}/)[0])
  return { out, failed: named('FAIL'), skipped: named('SKIP'), summary: out.trim().split('\n').pop() }
}

const same = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

const only = process.argv[2]
const cases = only ? CASES.filter((c) => c.name.includes(only)) : CASES
if (!cases.length) {
  console.error(`no case matches "${only}". Names: ${CASES.map((c) => c.name).join(', ')}`)
  process.exit(2)
}

const original = readFileSync(CFG, 'utf8')
copyFileSync(CFG, BAK)
let bad = 0

try {
  // Nothing below means anything if the file was already failing.
  const base = runValidator({})
  if (base.failed.length) {
    console.error(`ABORT: the config already fails before any sabotage: ${base.failed.join(', ')}`)
    console.error('Fix the config first. A negative test on a broken baseline proves nothing.')
    process.exit(2)
  }
  console.log(`baseline clean, ${count(original)} entries\n`)

  for (const c of cases) {
    let text = original
    if (c.how) {
      const [kind, arg] = c.how
      text = sabotage[kind](original, arg)

      // The guard. A sabotage that changed nothing is an ABORT, because the
      // validator would then pass and the pass would look like a result.
      const removed = count(original) - count(text)
      const changed = text !== original
      if (!changed) {
        if (c.expectAbort) {
          console.log(`[${c.name}] ${c.why}`)
          console.log('  good   the guard fired: a sabotage that changes nothing is an ABORT')
          continue
        }
        console.error(`ABORT [${c.name}]: sabotage changed nothing.`)
        console.error(`  ${kind}(${JSON.stringify(arg)}) no longer matches the config.`)
        console.error('  Fix the fragment. Do not trust any result from this case until you do.')
        bad++
        continue
      }
      if (c.expectAbort) {
        // The inverse, and the more dangerous direction: a case that exists to
        // prove the guard fires must not quietly start doing real damage.
        console.log(`[${c.name}] ${c.why}`)
        console.log('  WRONG  expected the guard to fire, but the sabotage changed the file')
        bad++
        continue
      }
      // Say what actually happened. Not every sabotage removes an entry: a
      // substitution changes none and an append adds one, and reporting those
      // as "removed 0" and "removed -1" reads as a broken test rather than a
      // working one.
      const delta =
        removed > 0
          ? `removed ${removed} of ${count(original)} entries`
          : removed < 0
            ? `added ${-removed} entry`
            : 'rewrote a pattern in place'
      console.log(`[${c.name}] ${delta}, damaged ${c.why}`)
      writeFileSync(CFG, text)
    } else {
      console.log(`[${c.name}] config untouched, ${c.why}`)
    }

    const r = runValidator(c.env ?? {})
    writeFileSync(CFG, original)

    const problems = []
    if (!same(r.failed, c.expectFail)) {
      const extra = r.failed.filter((f) => !c.expectFail.includes(f))
      const missing = c.expectFail.filter((f) => !r.failed.includes(f))
      if (missing.length) problems.push(`did not fail: ${missing.join(', ')}`)
      if (extra.length) problems.push(`also failed: ${extra.join(', ')}`)
    }
    if (c.expectSkip && !same(r.skipped, c.expectSkip)) {
      problems.push(`skipped ${r.skipped.join(', ') || 'nothing'}, expected ${c.expectSkip.join(', ')}`)
    }
    if (c.expectSummaryNot && r.summary.includes(c.expectSummaryNot)) {
      problems.push(`summary said "${r.summary}" when it must not`)
    }

    if (problems.length) {
      bad++
      console.log(`  WRONG  ${problems.join('; ')}`)
    } else {
      const what = c.expectFail.length ? `failed exactly ${c.expectFail.length}` : `skipped, summary: "${r.summary}"`
      console.log(`  good   ${what}`)
    }
  }
} finally {
  copyFileSync(BAK, CFG)
  unlinkSync(BAK)

  // Verify the restore rather than assuming it. This file is installed into
  // someone's live client; leaving it damaged is the one outcome worse than
  // having no negative test.
  const restored = readFileSync(CFG, 'utf8')
  if (restored === original) {
    console.log(`\nconfig restored, ${restored.length} bytes, byte-identical`)
  } else {
    console.error(`\nRESTORE FAILED - ${CFG} does not match what it was. Recover with: git checkout ${CFG}`)
    process.exitCode = 3
  }
  if (existsSync(BAK)) unlinkSync(BAK)
}

console.log(bad ? `${bad} case(s) did not behave as expected` : `all ${cases.length} cases behaved as expected`)
process.exit(bad ? 1 : process.exitCode ?? 0)
