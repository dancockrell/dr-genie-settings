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

Twelve of forty-six entries carry a sound. That ratio is the point.

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

**Arrivals.** These look like noise and are not. Knowing who is in the room is
most of what a MUD is, and the person who just walked in might be a GM. They
are highlighted and given a quiet sound so they stop scrolling past unread —
not gagged.

Departures are matched by direction rather than by a single verb, because the
movement verb is per-player flavour:

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
