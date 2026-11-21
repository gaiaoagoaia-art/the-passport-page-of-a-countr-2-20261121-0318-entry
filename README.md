# The Passport Page of a Country That Isn't There

[![make.fun · the-passport-page-of-a-countr-2-20261121-0318](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)
[![rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/gaiaoagoaia-art/the-passport-page-of-a-countr-2-20261121-0318-entry/rank.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)
[![reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/gaiaoagoaia-art/the-passport-page-of-a-countr-2-20261121-0318-entry/reward.svg)](https://make.fun/bounty/the-passport-page-of-a-countr-2-20261121-0318?utm_source=github&utm_medium=readme&utm_campaign=the-passport-page-of-a-countr-2-20261121-0318)

A deterministic procedural renderer that draws an open passport spread for the
invented island Republic of Talverra: a data page with a vector portrait of
holder Mara Elise Ilves, a machine-readable zone with real ICAO check digits,
and a visas page carrying a Nordmark short-stay visa whose Condition 14 admits
the holder by sea from Haldenvik only, plus a consistent travel history —
Talverra exit 06 May 2024, Nordmark arrival 08 May 2024, Ostara departure
21 Jun 2024, Veldorra arrival 03 Oct 2025, Karsten Isles entry 17 Feb 2026 —
all after the passport's 12 Mar 2024 issue date. Everything is drawn in code
with a hand-rolled 5x7 bitmap font and a hand-written PNG encoder; no network,
no external images or fonts.

## How to run

```sh
node main.ts
# writes entry.png to $MAKEFUN_OUTPUT_DIR, or /output by default
```

Requires Node 22 or later. Output is a 1024x1024 PNG under 1 MiB, byte-identical
on every run.

## License

MIT — see [LICENSE](LICENSE).
