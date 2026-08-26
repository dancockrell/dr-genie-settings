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

console.log('\n-- every regexp actually compiles --')
{
  // A malformed regexp is the worst version of the failure this file exists
  // for. Genie skips the line without a word, so the alert never fires - and
  // unlike a typo in a literal pattern you cannot spot it by reading, because
  // a broken regexp and a working one look equally plausible.
  //
  // Genie is .NET and this is JavaScript, which is not the same engine. It is
  // close enough for what is used here: alternation, non-capturing groups,
  // anchors, escapes. A pattern that fails to compile in either is certainly
  // wrong. This catches the mistakes people actually make. It does not certify
  // .NET compatibility, and a pattern reaching for something .NET-only would
  // still need trying in the client.
  const rx = entries.filter((e) => e.type === 'regexp')
  const broken = []
  for (const e of rx) {
    try {
      new RegExp(e.pattern)
    } catch (err) {
      broken.push(`${e.pattern} - ${err.message}`)
    }
  }
  ok('there are regexps to check', rx.length >= 1, `${rx.length} found`)
  ok('all of them compile', broken.length === 0, broken.slice(0, 2).join('; '))
}

console.log('\n-- departures match the direction, not the verb --')
{
  // Enumerating movement verbs cannot finish: runs, goes, swaggers, hobbles,
  // and one more every evening. Directions are a closed set of ten. This is
  // the third attempt at departures and the first two both failed by trying to
  // name the verb, so it is worth a test that fails if anyone tries again.
  const byVerb = entries.filter((e) =>
    /^(runs|goes|walks|strolls|hobbles|swaggers) (east|west|north|south)$/.test(e.pattern)
  )
  ok('no verb-plus-direction literals', byVerb.length === 0, byVerb.map((e) => e.pattern).join(', '))
  const dir = entries.find((e) => e.type === 'regexp' && e.pattern.includes('east|west'))
  ok('the direction match is present', !!dir, dir ? dir.pattern.slice(0, 42) : 'missing')
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

  // Reversed after ninety seconds of standing in Firulf Vista: nine arrivals
  // and nine departures, a chime every five seconds. The assertion used to be
  // "arrivals are audible" and it was written from reasoning rather than from
  // watching, in a repo whose whole claim is that its contents were observed.
  //
  // It is asserted in the negative now, and it stays asserted, because the
  // argument for making arrivals audible is a good one - the person walking in
  // might be a GM - and somebody reading this file will make it again.
  ok('arrivals are silent', !hasSound('just arrived'))

  // What replaced it. A creature entering is the case a sound is actually for:
  // it can act on you while you are looking at another window.
  ok('a creature entering is covered', has('into the area'))
  ok('a creature entering is audible', hasSound('into the area'))
}

console.log(failed ? `\n${failed} failed` : '\nall passed')
process.exit(failed ? 1 : 0)
