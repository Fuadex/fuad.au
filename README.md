# fuad.au

A personal hub of three self-contained data apps, deployed as a static site via GitHub Pages.

- **Rotation** (`/rotation/`) — a listening observatory built on 315 000+ last.fm scrobbles:
  genre map, mood/texture charts, track reads, gigs, Spotify engagement layer.
- **Culture** (`/culture/`) — a personal canon of films, TV, games, animation and books:
  cover stacks, badge taxonomy, Reader with translated notes, stats and taste explorer.
- **Canvas** (`/canvas/`) — a personal art gallery: artworks seen in museums mapped to their
  cities, with close-reading blurbs and a pilgrimage list.

A static launcher at the root (`index.html`) picks between the three apps.
One deploy pipeline (`.github/workflows/sync.yml`) ships all three on every push to `main`.

**Start here:** [GUIDE.md](GUIDE.md) — hub overview, deploy pipeline, golden rules, and a
map of every doc in the repo.
