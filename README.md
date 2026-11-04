# 💖 LoveMeter – Love Compatibility Calculator

A modern, responsive love calculator built with plain HTML, CSS and JavaScript. Enter two names and get an animated compatibility score with a breakdown of chemistry, communication, trust and fun.

**Live demo:** https://aashana1012.github.io/love-calculator/

## Features

- **Animated score ring** with a pulsing heart and counting percentage
- **Four-part breakdown** (Chemistry, Communication, Trust, Fun) with animated bars
- **Deterministic results** – the same pair of names always gets the same score, in any order
- **Shareable links** – results are encoded in the URL (`?a=Name&b=Name`) and there is a one-click share / copy button
- **Confetti celebration** for high scores
- **Fully responsive** glassmorphism design with floating hearts background
- **Accessible** – labelled inputs, live regions, keyboard friendly, respects reduced-motion
- **No backend, no tracking** – everything runs in the browser

## Getting started

No build step is needed. Just open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
```

## Project structure

```
├── index.html   # Page markup
├── style.css    # Styling and animations
├── script.js    # Calculator logic, animations, sharing
└── README.md
```

## How the score works

The two names are normalised and combined in an order-independent way, then hashed (FNV-1a). The hash seeds a small pseudo-random generator that produces the overall score and the four sub-scores. Names that share more letters get a small affinity bonus. Entering the same name twice gives a playful 100%.

LoveMeter is for entertainment only. ❤

## License

MIT
