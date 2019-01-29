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
