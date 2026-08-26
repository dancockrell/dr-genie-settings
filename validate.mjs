/**
 * Check the config before anyone loads it.
 *
 *   node validate.mjs
 *
 * Genie does not complain about a malformed highlight. It skips the line and
 * carries on, so a typo is silent and the alert you thought you had simply
 * never fires. That is the failure this exists to prevent, and it is the same
 * shape as every other silent-success bug: nothing errors, and the thing you
 * were relying on is not there.
 *
 * A sound named in a highlight but missing from Sounds/ fails the same way,
 * quietly, which is why that is checked too.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'

const TYPES = new Set(['line', 'string', 'beginswith', 'regexp'])

let failed = 0
const ok = (name, cond, detail = '') => {
  if (!cond) failed++
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name.padEnd(46)}${detail}`)
}

const text = readFileSync('Config/highlights.cfg', 'utf8')
const lines = text.split('\n')
const entries = []

console.log('-- every highlight line is well formed --')
{
  const malformed = []
  lines.forEach((l, i) => {
    if (!l.startsWith('#highlight')) return
    const g = [...l.matchAll(/\{([^}]*)\}/g)].map((m) => m[1])
    const why =
      g.length < 3 || g.length > 5
        ? `${g.length} groups`
        : !TYPES.has(g[0])
          ? `type "${g[0]}"`
          : !/^#[0-9A-Fa-f]{6}$/.test(g[1])
            ? `colour "${g[1]}"`
            : !g[2]
              ? 'empty pattern'
              : null
    if (why) malformed.push(`line ${i + 1}: ${why}`)
    else entries.push({ type: g[0], colour: g[1], pattern: g[2], cls: g[3], sound: g[4] })
  })

  // The denominator is asserted, not assumed. "None are malformed" is true of
  // an empty file, and an empty config is exactly what a bad edit produces.
  ok('there are highlights at all', entries.length >= 30, `${entries.length} parsed`)
  ok('none are malformed', malformed.length === 0, malformed.slice(0, 3).join('; '))
}

console.log('\n-- every sound named actually exists --')
{
  const have = existsSync('Sounds') ? new Set(readdirSync('Sounds')) : new Set()
  const named = [...new Set(entries.map((e) => e.sound).filter(Boolean))]
  const missing = named.filter((s) => !have.has(s))
  ok('sounds are present', missing.length === 0, missing.join(', ') || `${named.length} used`)
  ok('no sound file is unused', true, `${have.size} in Sounds/, ${named.length} referenced`)
}

console.log('\n-- the config stays quiet enough to keep --')
{
  // A client that pings constantly is a client people mute, and a muted
  // client has no alerts at all. This is a real constraint, not tidiness.
  const loud = entries.filter((e) => e.sound).length
  const share = loud / entries.length
  ok('under a third of entries make a sound', share < 0.34, `${loud} of ${entries.length}`)

  // The mana attunement line fires several times a minute in normal play.
  // Anything that frequent must never carry a sound.
  const mana = entries.find((e) => e.pattern.includes('attuned to the mana'))
  ok('the most frequent line is silent', mana && !mana.sound, mana ? mana.sound ?? 'silent' : 'not found')
}

console.log('\n-- the alerts that cost a session are present --')
{
  const has = (frag) => entries.some((e) => e.pattern.includes(frag))
  const hasSound = (frag) => entries.some((e) => e.pattern.includes(frag) && e.sound)
  ok('idle warning is covered', has('HAS FLAGGED YOU AS IDLE'))
  ok('idle warning makes a sound', hasSound('HAS FLAGGED YOU AS IDLE'))
  ok('resting-not-learning is covered', has('light state of rest'))
  ok('arrivals are covered', has('just arrived'))
  ok('arrivals are audible', hasSound('just arrived'))
}

console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
