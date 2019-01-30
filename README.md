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
- [ ] Implement importing stamps from a JSON or CSV export
- [ ] Make time stamps in the list editable - input with pattern
- [ ] Implement a button for splitting the current line per word into multiple lines for word-level adjustments
- [ ] Consider https://jsxdirect.com/
- [ ] Add support for multiple voices (tabs with names)
- [ ] Test in Chrome and Safari properly
- [ ] Implement mobile friendly responsive design
- [ ] Apply the answer of the [`progress` minimal width question](https://stackoverflow.com/q/54431564/2715716)
- [ ] Consider animating the items on a horizontal timeline in preview
  - Items slide from right to left
  - Items fade in and out of existence near the edges of the screen
  - Progress bar only shown for the currently interested item(s)
  - Virtual vertical line representing current time goes through the vertical middle axis of the area
- [ ] Create an interactive guide for the landing page showing the flow and highlighting what shortcuts are used
