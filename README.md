# DragonRealms settings for Genie

Highlights and sounds for a new character. Written against text seen in play.

A fresh Genie install gives you 356 stock aliases, no highlights, no sounds,
and a sound directory that is configured and empty. This fills that in.

## Install

Copy `Config/highlights.cfg` into `C:\Genie4\Config\`, and the contents of
`Sounds/` into whatever `#config {sounddir}` points at — `C:\Genie4\Sounds` by
default. Check with `#config sounddir`.

Then in Genie: `#reload`

Run `node validate.mjs` after you edit. Genie does not complain about a broken
highlight. It skips the line. The alert you thought you had never fires.

## Sound is scarce on purpose

Only selected highlights carry a sound. `node validate.mjs` reports the current entry and sound counts directly from `Config/highlights.cfg`; a copied count here would drift as the configuration changes.

A client that pings constantly gets muted. A muted client has no idle warning
either. Sound is for things you need when you are not looking at the window.
Colour is for finding things once you are.

The most frequent line in normal play is `You feel fully attuned to the mana
streams again`, several times a minute. Coloured, silent. The validator fails
the build if that ever changes.

## Three that matter

**Idle.** Seen twice in one evening, both times followed by a disconnect:

```
[23:54] GENIE HAS FLAGGED YOU AS IDLE, PLEASE RESPOND!
> [IDLE TIMER] :quit
[23:55] Connection closed.
```

Genie quits for you if you do not answer. That line scrolls past in a window
full of arrivals. Highest-value match in the file.

**Resting.** At login:

> You are relaxed and your mind has entered a light state of rest. To wake up
> and start learning again, type: AWAKEN.

A character in that state learns nothing. Said once. Never repeated.

**A creature entering the room.**

```
You notice as a black lynx pads into the area.
```

Something that can act on you while you read another window. Matched on
"into the area", not the verb. The verb is per-creature flavour. "pads" would
only find lynxes.

## Arrivals used to chime

The argument for a sound was fine: knowing who walked in is most of what a MUD
is, and it might be a GM. Ninety seconds in Firulf Vista killed it. Nine
arrivals, nine departures, a movement every five seconds, each reprinting the
whole room block. About sixty lines a minute describing a room that had not
changed.

A crossroads in the Crossing is where people stand. A chime every five seconds
there mutes the client, including the idle warning that costs a session.

Arrivals stay highlighted, stay ungagged, and are silent. `validate.mjs`
asserts the silence so the old argument does not sneak back.

The room block is dimmed rather than gagged for the same reason. You need it
when you have just walked somewhere. You do not need it shouted.

## Departures

Match direction, not a single verb. Movement verbs are per-player flavour:

```
Heartbreaker Zarif just arrived.
Doom's Whisper Mazzick runs east.
Togballer Bulvine swaggers east.
Travelling Doctor Marconias goes west.
```

Matching `leaves` would have missed all of those.

## Classes

Every entry has a class, so a group can go off in one command — `#class combat off`.

`alert` `learning` `people` `speech` `wounds` `rt` `magic` `money` `items`

## Licence

MIT.
