/**
 * Negative test for the entries added on 27 Aug 2026.
 *
 * Strips exactly the new highlights back out of a COPY of the config, so
 * `node validate.mjs` can be run against it and asked to fail. A check that
 * has never been seen to fail is indistinguishable from one that cannot.
 *
 * Restores the original afterwards. Run it, look at what failed, and confirm
 * the failures are the four lines these entries were added for and nothing
 * else - a broader failure means something unrelated got removed too.
 *
 *   node break-check.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'

const CFG = 'Config/highlights.cfg'
const BAK = 'Config/highlights.cfg.breakcheck.bak'

// The entries under test, by a fragment unique to each.
const ADDED = [
  'makes playing your',
  'already playing a song',
  'on your ',
  'dabbling|perusing',
  'understanding|absorbing',
  'captivated|engrossed',
]

copyFileSync(CFG, BAK)
try {
  const kept = readFileSync(CFG, 'utf8')
    .split('\n')
    .filter((l) => !(l.startsWith('#highlight') && ADDED.some((f) => l.includes(f))))
  const before = readFileSync(CFG, 'utf8').split('\n').filter((l) => l.startsWith('#highlight')).length
  const after = kept.filter((l) => l.startsWith('#highlight')).length

  // Assert the removal actually removed something. If the fragments stopped
  // matching, this script would write the file back unchanged and the
  // validator would pass - which would read as "the entries are not needed"
  // when it actually means "the test did nothing".
  if (before - after !== ADDED.length) {
    console.error(`ABORT: expected to remove ${ADDED.length} entries, removed ${before - after}.`)
    console.error('The fragments no longer match the config. Fix them before trusting this.')
    process.exit(2)
  }
  console.log(`removed ${before - after} of ${before} entries, running validator against the gap\n`)

  writeFileSync(CFG, kept.join('\n'))
  try {
    execSync('node validate.mjs', { stdio: 'inherit' })
    console.error('\nPROBLEM: the validator passed without the new entries.')
    console.error('Either they are not what catches those lines, or the fixture is not testing them.')
  } catch {
    console.log('\nGood: the validator failed without them, and named which lines went uncovered.')
  }
} finally {
  copyFileSync(BAK, CFG)
  unlinkSync(BAK)
  console.log('config restored')
}
