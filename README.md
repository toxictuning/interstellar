# LogView

Fast CSV data log viewer for automotive and engineering logs.

## Features

- **Instant open**: double-click any `.csv` file — choose to view in LogView or open in your external app (Excel, etc.)
- **Time-series charts**: ultra-fast rendering with uPlot, handles millions of data points
- **Channel management**: toggle channels on/off, search, pick colors per channel
- **View modes**: Single chart, Split (one chart per channel), Raw table
- **Themes**: Dark, Midnight Blue, Nord, Solarized Dark, Light
- **Auto-update**: checks GitHub releases on startup, downloads and installs in-app

## Download

Get the latest installer from [Releases](https://github.com/toxictuning/logview/releases).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run dist:win   # builds Windows installer to dist/
```

## Release

Push a tag to trigger the GitHub Actions release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds the installer and publishes it as a GitHub Release automatically.

## License

MIT
