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
- [ ] Implement reading lyrics from a file if it contains any in its metadata (MP4, MP4, FLAC)
  - https://github.com/borewit/music-metadata
- [ ] Implement importing stamps from a JSON or CSV export files
- [ ] Make time stamps in the list editable - input with pattern
- [ ] Implement a button for splitting the current line per word into multiple lines for word-level adjustments
- [ ] Consider https://jsxdirect.com/
- [ ] Implement adding, removing and renaming voices
- [ ] Add UI tests with Puppeteer running in Azure Pipelines
- [ ] Implement mobile friendly responsive design
- [ ] Create an interactive guide for the landing page showing the flow and highlighting what shortcuts are used
