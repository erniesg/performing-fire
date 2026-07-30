# Broadcast Console Redesign — Progress Checkpoint

## Direction

The landing page becomes a single broadcast console that fits within one viewport. The scroll-driven intro is removed. Channel content opens inside the same CRT viewer without page scrolling or an independently scrolling panel.

The redesign preserves the current broadcast language: a monitor wall, phosphor color by channel, a substantial CRT bezel, scanlines, and the existing VT323 display face. It does not replace the broadcast with a generic carousel or a new visual system.

## Geometry

At a 1728-pixel viewport, the live site measures:

- 1180 pixels for the outer broadcast.
- 1124 pixels for the monitor wall.
- 1124 pixels for the CRT viewer.

The redesign matches those measurements. On smaller screens, the console uses narrow responsive gutters and remains within `100svh`.

## Channels

The console has five channels:

1. About
2. Contribute
3. Experiments
4. Research
5. Log

The monitor wall is the channel selector. The selected channel is confirmed once inside the CRT. Duplicate station status, channel menus, and badges are removed.

## Preview Signals

The site uses the existing local artifact renderers rather than approximations:

- CH 01 About: `g7` — chromatic lock
- CH 02 Contribute: `hj` — chimera field
- CH 03 Experiments: `x3` — magnet breathe
- CH 04 Research: `r1` — punch data
- CH 05 Log: `l1` — moon phases

The chimera field is pre-warmed to a complete 40-row history before first paint. It must not visibly fill upward from an empty buffer.

## Motion

- The main CRT is continuously animated.
- The selected preview is a clear static frame.
- Unselected previews are static, dimmed, and slightly blurred.
- Hovering or focusing an unselected preview wakes only that preview and brings it into focus.
- Moving away returns the preview to its frozen state.
- Reduced-motion mode renders stable frames and uses direct state changes.

## Navigation

Previous and next arrows live inside the CRT, not below or outside the console. A compact `01 / 05` indicator and five-segment progress line show the total channel count without repeating channel names.

The channel transition should feel like tuning a broadcast. Its final roll, chromatic-separation, and static timing will be resolved before implementation.

## Copy

Copy comes from the proposal and script. Invented marketing phrases and duplicated explanatory labels are excluded.

The current About-channel anchor is the proposal's own statement:

> Most AI systems try to reduce ε. But in Pεrforming Fire, we perform it.

Final channel copy will remain concise and will be reviewed in all four locales before release.

## Localization and Payload CMS

The site resolves language in this order:

1. Valid `?lang=` override
2. Saved user selection
3. Browser language
4. English fallback

The visible language control is a compact four-state toggle for English, Korean, Simplified Chinese, and Japanese.

Main broadcast copy will move from hardcoded locale JSON into localized Payload CMS fields. Changing the language toggle will fetch and render the corresponding localized content without a page reload. Bundled locale data remains the offline and CMS-failure fallback. Artist responses and experiments continue to use their existing Payload-backed flows.

## Remaining Design Work

- Review concise copy for every channel in English before translation.
- Validate complete Korean, Simplified Chinese, and Japanese versions.
- Finalize the channel-tuning transition.
- Confirm responsive composition on small phones and short laptop viewports.
- Convert the approved design into an implementation plan before editing the production page.
