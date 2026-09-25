# QVAC-SDK

Turn your own notes into a multiple-choice quiz, generated and graded
entirely **on your device**, using [Tether's QVAC SDK](https://github.com/tetherto/qvac).

Point it at a `.txt` or `.md` file of notes and it will:

1. Load a small language model locally (`@qvac/sdk`'s `loadModel`).
2. Ask the model to write multiple-choice questions from your notes
   (`completion`, streamed token by token).
3. Quiz you interactively in the terminal and score your answers.

Nothing is sent to a server. There's no API key and no usage bill —
the model runs on your CPU/GPU and your notes never leave your machine.

## Requirements

- Node.js `>= 22.17`, npm `>= 10.9`
- ~2 GB free disk space for the model on first run (downloaded once and
  cached locally by QVAC)

## Install

```bash
git clone https://github.com/<your-username>/qvac-quizmaker.git
cd qvac-quizmaker
npm install
```

This installs `@qvac/sdk` (tested with **0.20.0**, requires `>=0.19.0`).

## Run

Try it on the included example notes about the water cycle:

```bash
QVAC_CONFIG_PATH=./qvac.config.json node quiz.js notes.example.md 5
```

Or point it at your own notes, with an optional question count
(defaults to 5):

```bash
QVAC_CONFIG_PATH=./qvac.config.json node quiz.js path/to/my-notes.md 8
```

The first run downloads the model (`LLAMA_3_2_1B_INST_Q4_0`) to a local
cache; every run after that is fully offline.

Example session:

```
▸ Downloading model 100% (770.1/770.1 MB)
▸ Generating quiz from your notes...

Generated 5 questions. Let's go!

Q1. What powers the evaporation step of the water cycle?
  A. Wind
  B. The sun
  C. Gravity
  D. The moon
Your answer (A/B/C/...): B
✔ Correct!

...

Score: 4/5
```

## How it maps to the QVAC SDK

| Step | QVAC function |
|---|---|
| Load the local model | `loadModel` |
| Generate quiz questions from notes | `completion` (streamed) |
| Free resources when done | `unloadModel` |

See [`quiz.js`](./quiz.js) for the full implementation.

## Why

A lot of "AI quiz from your notes" tools require uploading your notes
to a cloud service. This one doesn't — it's meant for study material
you'd rather keep on your own laptop.

## License

MIT — see [LICENSE](./LICENSE).
