# Downline - Searching for maintainers and developers

I'm searching for someone to take over this project!

Background: Yt-dlp is a commandline Python program, and as such, has a horrible developer experience in terms of embedding. This won't change in the forseeable future, and frustrates me to the point where I do not enjoy working on this yt-dlp frontend. Potential developments that I'd love to see would be a cross platform Python binary [like this](https://ahgamut.github.io/2021/07/13/ape-python/) with all the required modules, or RustPython with all the required modules. Or a cross platform package manager that applications can rely on (so that downline can say "dear OS, make sure that yt-dlp is installed").

## Info
![GitHub All Releases](https://img.shields.io/github/downloads/stefnotch/downline/total.svg)

[Downline](https://stefnotch.github.io/downline/) is a free, cross-platform desktop application for downloading video and audio from YouTube and many other sites. It is a frontend for youtube-dl. Works on Windows, MacOS and Linux.

[Check out the other youtube-dl GUIs here](https://www.reddit.com/r/youtubedl/wiki/info-guis), I personally quite recommend [this one](https://github.com/jely2002/youtube-dl-gui)

## Screenshots

<p align="center">
  <img src="https://user-images.githubusercontent.com/23068820/52162513-f5db9a00-26fa-11e9-8cca-964d921f3bf3.png" alt="screenshots" width="460"/>
</p>

## Features

- Works for links from [several sites](https://ytdl-org.github.io/youtube-dl/supportedsites.html)
- Choose audio and video quality (with support for 4K videos)
- Convert audio to multiple formats `(mp3, aac, m4a and more)`
- Convert video to multiple formats `(mp4, webm, mkv)`
- Pause and resume downloads
- Download entire playlist and channel
- Download and embed subtitles
- Download multiple files simultaneously

To support this project, you can donate to the developers.

## Installing youtube-dl

If you have `pip` installed, you can install youtube-dl by running
```
# Linux
sudo pip install --upgrade youtube_dl
```
or
```
# Windows and macOS
pip install --upgrade youtube_dl
```

Alternativly for Windows, you can download the `.exe` file [here](http://ytdl-org.github.io/youtube-dl/download.html)

On macOS, you can install it using homebrew:
```
brew install youtube-dl
```

Or on Linux (and macOS), you can use the following command:
```
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl
```

Detailed instuctions are available on the offical [youtube-dl website](http://ytdl-org.github.io/youtube-dl/download.html)


## Tutorials for users

### Download a video

1. Paste the link into the bar on the top of the screen.
If Downline detects a link in your clipboard, it will automatically paste it, otherwise you can use the blue `+` button on the right of the text field.
2. Press the `enter` key, the video will then appear in the list below.
3. Click on the thumbnail of the video to start the download.

### Download a YouTube playlist

1. Paste the link of the playlist. Make sure the link looks like this: `https://www.youtube.com/playlist?list=...`, so that it's pointing directly to the playlist and not to some video inside the playlist.
2. Press the `enter` key, the videos included in the playlist will then appear in the list below.
3. Uncollapse the bottom bar by clicking on the little arrow in the bottom center.
4. Click the play button in the left of the bar to start downloading all videos.

## Developer Instructions

[Check out CONTRIBUTING.md](CONTRIBUTING.md)

## Credits

- [youtube-dl](https://github.com/ytdl-org/youtube-dl/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [ffmpeg](https://ffmpeg.org/)
- [tauri](https://tauri.studio/)
- [vuejs](https://vuejs.org/)
- [esbuild](https://github.com/evanw/esbuild)
- [vite tauri template](https://github.com/yooneskh/vite-tauri-template)
