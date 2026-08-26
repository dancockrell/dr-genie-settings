# DragonRealms settings for Genie

Highlights and sounds for a new character, written against text observed in
play rather than imagined.

A fresh Genie install gives you 356 stock aliases, **no highlights, no
sounds**, and a sound directory that is configured and empty. This fills that
in.

## Install

Copy `Config/highlights.cfg` into `C:\Genie4\Config\`, and the contents of
`Sounds/` into whatever `#config {sounddir}` points at — `C:\Genie4\Sounds` by
default. Check with `#config sounddir` if you are not sure.

Then in Genie: `#reload`

Run `node validate.mjs` first if you have edited anything. Genie does not
complain about a malformed highlight; it skips the line and carries on, so a
typo means the alert you thought you had never fires and nothing tells you.

## What makes a sound, and what does not

Twelve of fifty-two entries carry a sound. That ratio is the point.

A client that pings constantly is a client people mute, and a muted client has
no alerts at all. So sound is reserved for things you need to know when you
are **not looking at the window**. Colour is for finding things once you are.

The most frequent line in normal play is `You feel fully attuned to the mana
streams again`, several times a minute. It is coloured and silent, and the
validator fails the build if that ever changes.

## The three that matter most

**The idle warning.** Observed twice in one evening, both times followed by a
disconnect:

```
[23:54] GENIE HAS FLAGGED YOU AS IDLE, PLEASE RESPOND!
> [IDLE TIMER] :quit
[23:55] Connection closed.
```

Genie quits the game for you if you do not answer. That warning is the only
notice, and it scrolls past in a window full of arrivals. It is the highest
value line in the file.

**Resting and not learning.** At login:

> You are relaxed and your mind has entered a light state of rest. To wake up
> and start learning again, type: AWAKEN.

A character in that state learns nothing. It is stated once and never
repeated.

**A creature entering the room.**

```
You notice as a black lynx pads into the area.
```

Something that can act on you while you are reading another window. That is
what a sound is for, and it is the clearest example in the file of the line
between a sound and a colour.

Matched on "into the area" rather than on the verb, because the verb is
per-creature flavour in the same way the player movement verb is: "pads" finds
lynxes and nothing else.

## The one that got reversed

**Arrivals had a sound and no longer do.**

The argument for it was good: knowing who is in the room is most of what a MUD
is, and the person who walked in might be a GM. Ninety seconds of standing in
Firulf Vista settled it anyway. Nine arrivals, nine departures, one movement
every five seconds, and each of them reprinting the whole room block
underneath — roughly sixty lines a minute describing a room that had not
changed.

A crossroads in the Crossing is where players actually stand. A chime every
five seconds there gets the client muted, and a muted client has no alerts at
all, including the idle warning that costs a session.

So the argument was right about the colour and wrong about the sound. A GM in
the room is something you find by looking at a window you are already looking
at. Arrivals are still highlighted, still not gagged, and now silent, and
`validate.mjs` asserts the silence so that the good argument does not quietly
win again.

The room block is dimmed rather than gagged for the same reason: it is how you
know where you are when you have just walked somewhere, and it is sixty lines
a minute when you have not.

## Departures

Matched by direction rather than by a single verb, because the movement verb is
per-player flavour:

```
Heartbreaker Zarif just arrived.
Doom's Whisper Mazzick runs east.
Togballer Bulvine swaggers east.
Travelling Doctor Marconias goes west.
```

Matching `leaves` would have missed every one of those.

## Classes

Every entry carries a class, so you can turn a whole group off in one command
— `#class combat off` and so on.

`alert` `learning` `people` `speech` `wounds` `rt` `magic` `money` `items`

## Licence

MIT.
