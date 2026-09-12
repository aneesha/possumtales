# Possum Tales

A complete, English-language interactive 3D picture book about an Australian brushtail possum and his shiny plan. Includes all six story pages, original cover artwork, detailed furred animals and garden scenes, continuous book opening and page turns, synthesized music and foley, a quiz, and a collectible star.

Created by [@aneesha](https://x.com/aneesha). Prompt originally from [@sonia_code](https://x.com/sonia_code/status/2098389069592232052).

## Open the app

**Offline:** open [`docs/index.html`](docs/index.html) in a WebGL-capable browser. Everything is embedded, including Three.js and the cover. No internet or server is required to read the book. The footer credit links open X when an internet connection is available.

**Local development:** run `npm start`, then visit http://localhost:4173. This uses only Node.js and the files in `dist/`; dependency installation is not needed to serve the app.

To regenerate the offline file after editing source: `npm ci` then `npm run build`. The build writes `docs/index.html` and `docs/.nojekyll`.

## GitHub Pages

The `docs/` folder contains the complete static site, ready for GitHub Pages. In this repository’s **Settings → Pages**, choose **Deploy from a branch**, then the `main` branch and `/docs` folder, and save. See [GitHub’s publishing source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Commit the rebuilt `docs/index.html` along with source changes whenever the book is updated.

## Controls

- Choose **Open book** or click the book cover.
- Touch the characters or the labeled interaction button to trigger the scene.
- Choose **Next page** to continue. Page controls are locked during transitions.
- The back arrow returns to the previous page; on page one it closes the book.
- **Shelf** closes the book with an animation. **Treasures** opens the collection.
- **Sound on / Sound off** controls original synthesized BGM and effects. Playback begins after the first book interaction, with no spoken dialogue.
- The 3D surface supports Enter/Space to interact and Left/Right arrows to navigate. All essential actions also have standard keyboard-accessible buttons.
- The quiz can be retried. Touch the earned star to add it to the collection. The sound preference and collection are saved locally when browser storage is available.

Reduced-motion preferences minimize movement and remove the cursor trail. Dialogue appears in speech bubbles that follow the speaker. Narration and controls sit beneath the book. The reader and ending quiz fit phone, landscape, and desktop viewports without scrolling. A browser with WebGL 2 support is required; unsupported browsers receive a visible retry message.

## Source

- `dist/index.html`: accessible interface and English story scaffolding
- `dist/styles.css`: responsive paper-and-forest theme using system fonts
- `dist/animals.js`: detailed procedural animal anatomy, coat textures, fur, eyes, and shared geometry
- `dist/child.js`: young child, poseable limbs, and woven Easter basket
- `dist/foil.js`: reflective silver foil, local studio reflections, and Possum’s Easter-egg wrapper
- `dist/world.js`: garden dioramas, camera, speaker anchors, and ordered animation transitions
- `dist/app.js`: guarded story state, quiz, local collection, keyboard and optional WebMCP controls
- `dist/audio.js`: original Web Audio music and effects
- `dist/assets/cover.png`: original generated illustration
- `dist/vendor/`: locally vendored Three.js 0.180.0 and its MIT license
- `scripts/build.mjs`: packages the app as `docs/index.html`
- `docs/index.html`: generated offline app and GitHub Pages entry point

The procedural models need no external model downloads. The cover is decoded and shaders are prepared before the book becomes available.
