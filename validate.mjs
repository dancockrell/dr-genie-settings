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

/**
 * Things that were not checked, which is a third answer and not a pass.
 *
 * A check has to be able to say three things: yes, no, and "I could not
 * determine this". Folding the third into either of the other two is where the
 * lie enters, and folding it into "yes" is the version that gets somebody
 * hurt. The summary line at the bottom is what people actually read, so an
 * unchecked item has to survive all the way down to it.
 */
const unchecked = []

const ok = (name, cond, detail = '') => {
  if (!cond) failed++
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${name.padEnd(46)}${detail}`)
}

const skip = (name, why) => {
  unchecked.push(name)
  console.log(`SKIP ${name.padEnd(46)}${why}`)
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

  // An empty config has no ratio to take, and calling it too loud is a
  // failure with the wrong reason attached - which is its own kind of lie,
  // and a costly one. `0 / 0` is NaN, `NaN < 0.34` is false, so the line
  // printed "FAIL ... 0 of 0" and sent the next reader hunting for sounds to
  // remove from a file that has none. The config was empty. That is what
  // needed saying.
  //
  // Found by break-check.mjs's empty-config case, which expected this check to
  // stay quiet and got a failure instead. That is the negative test earning
  // its keep on the suite rather than on the config.
  if (entries.length === 0) {
    skip('under a third of entries make a sound', 'no entries to take a ratio of')
  } else {
    ok('under a third of entries make a sound', loud / entries.length < 0.34, `${loud} of ${entries.length}`)
  }

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

console.log('\n-- lines we actually saw are actually matched --')
{
  /**
   * The only check here that tests the config against the game.
   *
   * Everything above tests the file: well-formed, not too loud, the important
   * fragments present. All of that can pass on a config that fires on nothing,
   * because "the pattern is in the file" and "the pattern matches the line" are
   * different claims and the first one is much easier to satisfy.
   *
   * These are real lines, copied off the wire in two play sessions. Each is
   * asserted to be matched by at least one entry, using the same matching
   * rules Genie uses: `string` is a substring, `line` is a substring too (Genie
   * colours the whole line rather than the fragment), `beginswith` anchors at
   * the start, and `regexp` is a regex.
   *
   * When this fails it means somebody rewrote a pattern into something that no
   * longer catches the thing it was written for, which is exactly the failure
   * you cannot see by reading the config.
   */
  const OBSERVED = [
    ['GENIE HAS FLAGGED YOU AS IDLE, PLEASE RESPOND!', 'idle warning'],
    ['You are relaxed and your mind has entered a light state of rest.', 'resting'],
    ['You awaken from your reverie and begin to take in the world around you (You will now begin to gain new experience again)', 'awakening'],
    ['Heartbreaker Zarif just arrived.', 'player arrives'],
    ['Togballer Bulvine swaggers east.', 'player leaves, odd verb'],
    ['Commoner Brommoner hobbles east.', 'player leaves, odder verb'],
    ['Travelling Doctor Marconias goes west.', 'player leaves, plain verb'],
    ['Commoner Brommoner came down a stone stairway.', 'player leaves, vertically'],
    ['Also here: Silvyandril who is blurred by hazy afterimages.', 'visible effect'],
    ['A shaggy mutt bounds into the area.', 'creature arrives'],
    ['You notice as a black lynx pads into the area.', 'creature arrives, noticed'],
    ['A town guard walks in, glancing about with a false look of boredom on his face.', 'creature arrives, other phrasing'],
    ['The black lynx pads off.', 'creature leaves'],
    ['You feel fully attuned to the mana streams again.', 'mana'],
    ['Obvious paths: east, south, west.', 'room block'],
    ['     Owes 1146 copper Kronars to the Principality of Zoluren', 'the debt'],

    // Off the wire on 27 Aug 2026, playing Phemius (Circle 1 Kaldar Bard).
    // A Bard trains Performance in a town street with an instrument, so these
    // are the lines a whole guild's training actually produces, and none of
    // them look like combat.
    ['A town guard ambles east.', 'creature leaves by direction, no name prefix'],
    [
      'The armor on your head makes playing your cocobolo txistu more difficult.',
      'worn armour is silently degrading the thing you are training',
    ],
    [
      'You begin some off-key scales on your cocobolo txistu with only the slightest hint of difficulty.',
      'song starts',
    ],
    [
      "You're already playing a song!  You'll need to stop that one first.",
      'song is still running',
    ],

    // The EXP window's own format. The mindstate is the word between the
    // percentage and the fraction, and it is the thing that decides whether
    // any of this training is doing anything.
    ['     Performance:      5 07% perusing       (2/34)', 'exp line, real mindstate word'],
  ]

  const matches = (e, line) => {
    if (e.type === 'regexp') {
      try {
        return new RegExp(e.pattern).test(line)
      } catch {
        return false
      }
    }
    if (e.type === 'beginswith') return line.trimStart().startsWith(e.pattern)
    return line.includes(e.pattern)
  }

  // The denominator, and it is the fragile one: if the parse above broke and
  // `entries` came back empty, every line below would report unmatched rather
  // than the suite quietly agreeing that nothing needed matching.
  ok('there are entries to match against', entries.length > 0, `${entries.length} entries`)

  const missed = OBSERVED.filter(([line]) => !entries.some((e) => matches(e, line)))
  ok(
    'every observed line is caught',
    missed.length === 0,
    missed.length ? missed.map(([, why]) => why).join(', ') : `${OBSERVED.length} lines`
  )

  /**
   * Lines nobody here has seen on the wire, kept apart on purpose.
   *
   * This repository's claim is that its contents were observed rather than
   * imagined, and these were not: they come from worked examples written into
   * Lich's own source beside the regexes that parse them. That is good
   * evidence - better than memory, because Lich has to be right about it to
   * function - but it is not the same evidence, and quietly mixing the two
   * would erode the one claim the README makes.
   *
   * So they are asserted just as hard and counted separately, and the label
   * says where they came from. If somebody later sees one of these in play,
   * move it up into OBSERVED with the date.
   */
  const DOCUMENTED = [
    [
      'Fresh External:  light scratches -- negligible',
      'PERCEIVE HEALTH severity, the worked example in PERCEIVE_HEALTH_SEVERITY_REGEX',
    ],
    [
      'Fresh Internal:  a deeply bruised head -- very devastating',
      'the dangerous end of the same ladder',
    ],
    [
      'a wood-hilted broadsword lodged deeply into your chest',
      'lodged item, from LODGED_BODY_PART_REGEX',
    ],
    ['a large black blood mite on your left leg', 'parasite, from PARASITES_REGEX'],
  ]

  const missedDoc = DOCUMENTED.filter(([line]) => !entries.some((e) => matches(e, line)))
  ok(
    'every line Lich documents is caught',
    missedDoc.length === 0,
    missedDoc.length ? missedDoc.map(([, why]) => why).join(', ') : `${DOCUMENTED.length} lines`
  )
}

console.log('\n-- the mindstates are DragonRealms\' own, and all of them --')
{
  /**
   * Checked against Lich rather than against memory.
   *
   * Seven entries in this file were once the GemStone IV ladder - clear as a
   * bell, muddled, becoming numbed, saturated - carried into a DragonRealms
   * config where they matched nothing. They survived a play session that
   * correctly suspected them and correctly refused to delete on the evidence
   * it had: a Circle 1 character never approaches mind lock, so no test
   * available that night could have produced those lines whether they existed
   * or not. "I never saw it" is not an absence you can establish.
   *
   * What settled it was not more play. Lich ships both ladders and the
   * directory names them: DR_LEARNING_RATES lives under lib/dragonrealms and
   * has 35 states; MINDMAP lives in lib/constants.rb and has the GemStone
   * eight. The suspect words appear only in the second.
   *
   * So this reads the DR list off disk and checks both directions - nothing
   * here that DragonRealms does not print, nothing DragonRealms prints that is
   * missing here. The second direction is the one that found something: the
   * first pass at the ladder covered 27 of 35, and the eight it missed were
   * invisible by eye because the list is long and half of it is ordinary
   * English.
   */
  // Overridable so the SKIP branch below is reachable from a test. That branch
  // is the one that was quietly wrong - it printed NOT CHECKED and the run
  // still ended on "all passed" - and a branch nobody can execute on purpose is
  // a branch nobody can prove they fixed. break-check.mjs points this at a path
  // that does not exist and asserts the summary refuses to say "all passed".
  const LICH =
    process.env.DR_LICH_DRVARIABLES ||
    'C:/Ruby4Lich5/Lich5/lib/dragonrealms/drinfomon/drvariables.rb'
  const mindstates = entries.filter((e) => e.cls === 'learning' && e.type === 'regexp')

  if (!existsSync(LICH)) {
    // The third answer, printed rather than folded into one of the other two.
    // A missing instrument is not a pass, and silently treating it as one is
    // how a check that cannot fail gets into a suite in the first place.
    skip('the DR mindstate ladder', `Lich is not at ${LICH}`)
  } else {
    const src = readFileSync(LICH, 'utf8')
    const block = src.slice(src.indexOf('DR_LEARNING_RATES'), src.indexOf('].freeze'))
    const ladder = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])

    // The fragile denominator: if the parse above breaks, this collapses to a
    // handful and the two checks below become vacuously true.
    ok('the DR ladder parsed', ladder.length >= 30, `${ladder.length} states from Lich`)

    // Every state DragonRealms prints is caught by some band here.
    const uncovered = ladder.filter(
      (state) => !mindstates.some((e) => new RegExp(e.pattern).test(`07% ${state} `))
    )
    ok('every DR mindstate is covered', uncovered.length === 0, uncovered.join(', ') || `${ladder.length} states`)

    // And nothing here is a word from the other game's ladder.
    const foreign = ['muddled', 'numbed', 'saturated', 'must rest', 'clear as a bell', 'fresh and clear']
    const wrongGame = entries.filter((e) => foreign.some((w) => e.pattern.includes(w)))
    ok(
      'no GemStone mindstates',
      wrongGame.length === 0,
      wrongGame.map((e) => e.pattern).join(', ') || `${foreign.length} words checked for`
    )
  }
}

console.log('\n-- the wound severities are all thirteen --')
{
  /**
   * The same treatment as the mindstates, for the category where being wrong
   * costs more than a wasted training session.
   *
   * This section used to carry one bare word out of the thirteen: `{severe}`,
   * unanchored, so it reddened "severe scarring" and "severely swollen" while
   * a character with a "devastating" or "useless" limb got no colour at all.
   * The scale ran the wrong way at exactly the end where it matters.
   *
   * DRCH::WOUND_SEVERITY is the authority, and the constant beside it names
   * the line the words appear in with a worked example:
   *
   *   "Fresh External:  light scratches -- negligible"
   *
   * Hence the "--" anchor in the config, and hence testing each severity in
   * that shape rather than bare - a check that fed the words in unanchored
   * would pass on patterns that fire on prose, which is the bug being fixed.
   */
  const HEAL =
    process.env.DR_LICH_HEALINGDATA ||
    'C:/Ruby4Lich5/Lich5/lib/dragonrealms/commons/common-healing-data.rb'
  const wounds = entries.filter((e) => e.cls === 'wounds' && e.type === 'regexp')

  if (!existsSync(HEAL)) {
    skip('the DR wound severity ladder', `Lich is not at ${HEAL}`)
  } else {
    const src = readFileSync(HEAL, 'utf8')
    const block = src.slice(src.indexOf('WOUND_SEVERITY = {'), src.indexOf('PARASITES_REGEX'))
    const ladder = [...block.matchAll(/'([^']+)' *=>/g)].map((m) => m[1])

    // The fragile denominator again. A changed table name or a moved constant
    // collapses this to nothing, and the coverage check below would then be
    // true of a config containing no wound entries at all.
    ok('the wound ladder parsed', ladder.length === 13, `${ladder.length} severities from Lich`)

    const uncovered = ladder.filter(
      (s) => !wounds.some((e) => new RegExp(e.pattern).test(`Fresh External:  a wound --  ${s}`))
    )
    ok('every wound severity is covered', uncovered.length === 0, uncovered.join(', ') || `${ladder.length} levels`)

    // The specific regression this replaced: a bare severity word with nothing
    // in front of it, which fires on any sentence using it. Asserted so that
    // reaching for the obvious short version fails loudly next time.
    const bare = entries.filter(
      (e) => e.cls === 'wounds' && e.type !== 'regexp' && ladder.includes(e.pattern)
    )
    ok(
      'no unanchored severity words',
      bare.length === 0,
      bare.map((e) => e.pattern).join(', ') || `${ladder.length} words checked for`
    )
  }
}

// The last line is the one people read, so it carries all three answers. A run
// that skipped something must never end on the words "all passed".
const summary = failed
  ? `${failed} failed`
  : unchecked.length
    ? `no failures, but ${unchecked.length} not checked: ${unchecked.join(', ')}`
    : 'all passed'
console.log(`\n${summary}`)
process.exit(failed ? 1 : 0)
