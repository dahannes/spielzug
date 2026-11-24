# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

Versions up to 1.6.0 were developed in a private repository; the public repository starts at 1.6.0 with a single commit, so the entries below have no commit links.

## 1.6.0 (2026-11-24)

### Features

* **api:** daily quotas for paid calls, debug view opt-in

## 1.5.0 (2026-11-17)

### Features

* **player:** the whole player card opens its editor, not only the picture

### Fixes

* **player:** the editor scrolls on the iPhone and the club row follows the finger

## 1.4.1 (2026-11-16)

### Fixes

* **dictation:** keep the round step on reload and ignore double taps, references [#1](https://github.com/dahannes/spielzug/issues/1) [#2](https://github.com/dahannes/spielzug/issues/2)
* **dictation:** Klasse picker picks one grade, a range only on purpose, closes [#4](https://github.com/dahannes/spielzug/issues/4)
* **dictation:** sheet check in reading order; locked photo buttons look locked, closes [#11](https://github.com/dahannes/spielzug/issues/11)
* **player:** a double tap on the card arrow moves one card, closes [#1](https://github.com/dahannes/spielzug/issues/1)
* **player:** card stats only from lists of the player's Klasse, closes [#3](https://github.com/dahannes/spielzug/issues/3)
* **trainer:** list editor keeps typed words and returns to its tab, references [#13](https://github.com/dahannes/spielzug/issues/13)
* **trainer:** PIN errors show tries left and the end of the lock, closes [#12](https://github.com/dahannes/spielzug/issues/12)

## 1.4.0 (2026-11-14)

### Features

* **player:** Spielvorbereitung per list, start page tabs and subject tags

## 1.3.0 (2026-11-13)

### Features

* **dictation:** Berichtigung as its own round
* **dictation:** sheet check before the photo
* **dictation:** Vokabeln Englisch as a word list training type
* **player:** game-like club picker
* **player:** Liga – jerseys unlocked by practice
* **player:** lighter editor with connecting motion
* **player:** name and number on the back of the club's shirt, centred labels
* **player:** new players start with a one-star club
* **player:** number rolls, position pitch and a sticky modal footer
* **player:** position on a real pitch with the player marker
* **player:** shirt and pitch side by side like a line-up board
* **player:** the shirt in miniature marks the position on the pitch

### Fixes

* **dictation:** no voice name in the preparation

### Performance

* **ui:** lazy routes and vendor chunks

## 1.2.0 (2026-11-13)

### Features

* **player:** card edge in the club's rim colour, rarity stars
* **player:** club schemes with crests, whole card and swipe row
* **player:** swipe the card to change the club
* **player:** the card flies from the page into the editor and back
* **ui:** Navy · Kreide logo as icon and header/login mark

## 1.1.0 (2026-11-13)

### Features

* subjects and grade ranges; one card per word list in a flat Trainingsplan

## 1.0.0 (2026-11-13)

### Features

* initial import of Spielzug ffe10d5
