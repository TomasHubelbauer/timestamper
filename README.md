# [Timestamper](https://tomashubelbauer.github.io/timestamper/)

An application for timestamping audio and video streams for lyrics videos, subtitles etc.

## Running

[**DEMO**](https://tomashubelbauer.github.io/timestamper/)

```powershell
# Windows
start index.html
# macOS, Linux
open index.html
```

## Contributing

- Work through the `TODO` comments continuously
- [ ] Add tab close warning handler if open file / timestamps for Chrome, Firefox & Safari
- [ ] Implement writing the timestamps to the file if the format supports metadata (like ID3), in a standardized way if one or proprietary if none
- [ ] Implement loading the timestamps / lyrics from a file if it contains any
- [ ] Implement exporting to a CSV
- [ ] Make time stamps in the list editable - input with pattern
- [ ] Fix Escape for end timestamp not working in Chrome
- [ ] Implement a button for splitting the current line per word into multiple lines for word-level adjustments
- [ ] Consider https://jsxdirect.com/
- [ ] Add support for multiple voices (tabs with names)
- [ ] Fix switching songs not clearing the state properly
- [ ] Test in Chrome and Safari properly
- [ ] Implement mobile friendly responsive design
- [ ] Remove the heading
- [ ] Replace the file picker with a Close button which resets the app
- [ ] Make the player and the preview sticky to the top (and give the preview a dynamic height not fixed like it has now)
- [ ] Make the close button mark last instead of first stamp so that mistaken multiple presses on Enter can be ignored while timing and deleted afterwards instead of causing every end to associate with the start of the +1 stamp
- [ ] Highlight the to be closed item in the list
- [ ] Focus the editor after placing a new item in but without disrupting the playback (or only preview if paused at the time of insertion)
- [ ] Scroll the view to the newly inserted item
- [ ] Lay items in preview out horizontally and stack the text line and the progress bar vertically making the progress as wide as the text
- [ ] Consider animating the items on a horizontal timeline fading in and out of existence, progress bar only shown when active
