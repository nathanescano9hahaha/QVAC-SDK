#!/usr/bin/env node
// qvac-quizmaker
//
// Turns your own notes (any .txt/.md file) into a multiple-choice quiz,
// then quizzes you interactively in the terminal.
//
// Everything runs on-device through the QVAC SDK: the notes never leave
// your machine, and there is no API key or per-call cost.
//
// Usage:
//   node quiz.js <path-to-notes-file> [numberOfQuestions]

import { readFileSync, existsSync } from 'node:fs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  loadModel,
  completion,
  unloadModel,
  LLAMA_3_2_1B_INST_Q4_0,
} from '@qvac/sdk';

const notesPath = process.argv[2];
const numQuestions = Number(process.argv[3]) || 5;

if (!notesPath || !existsSync(notesPath)) {
  console.error('Usage: node quiz.js <path-to-notes-file> [numberOfQuestions]');
  console.error('Example: node quiz.js ./notes.example.md 5');
  process.exit(1);
}

const notes = readFileSync(notesPath, 'utf-8').slice(0, 8000); // keep the prompt small

function extractJson(text) {
  // The model sometimes wraps JSON in prose or code fences. Grab the
  // outermost [...] block and parse just that.
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Could not find a JSON array in the model output');
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function generateQuiz(modelId, notesText, count) {
  const prompt = `You are a quiz generator. Read the study notes below and write exactly ${count} multiple-choice questions that test understanding of them.

Respond with ONLY a JSON array (no prose, no markdown fences). Each element must look like:
{"question": "...", "options": ["A text", "B text", "C text", "D text"], "answerIndex": 0}

"answerIndex" is the 0-based index of the correct option in "options".

STUDY NOTES:
"""
${notesText}
"""`;

  const history = [{ role: 'user', content: prompt }];
  const result = completion({ modelId, history, stream: true });

  let raw = '';
  process.stderr.write('▸ Generating quiz from your notes...\n');
  for await (const token of result.tokenStream) {
    raw += token;
  }
  return extractJson(raw);
}

async function runQuiz(questions) {
  const rl = readline.createInterface({ input, output });
  let score = 0;

  console.log(`\nGenerated ${questions.length} questions. Let's go!\n`);

  for (const [i, q] of questions.entries()) {
    console.log(`Q${i + 1}. ${q.question}`);
    q.options.forEach((opt, idx) => {
      console.log(`  ${String.fromCharCode(65 + idx)}. ${opt}`);
    });

    let answerIdx = -1;
    while (answerIdx < 0 || answerIdx >= q.options.length) {
      const ans = (await rl.question('Your answer (A/B/C/...): ')).trim().toUpperCase();
      answerIdx = ans.charCodeAt(0) - 65;
    }

    if (answerIdx === q.answerIndex) {
      console.log('✔ Correct!\n');
      score++;
    } else {
      const correctLetter = String.fromCharCode(65 + q.answerIndex);
      console.log(`✘ Not quite — the answer was ${correctLetter}. ${q.options[q.answerIndex]}\n`);
    }
  }

  rl.close();
  console.log(`Score: ${score}/${questions.length}`);
}

async function main() {
  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (p) => {
      const mb = (n) => (n / 1e6).toFixed(1);
      const line = `▸ Downloading model ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`;
      process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`);
      if (p.percentage >= 100) process.stderr.write('\n');
    },
  });

  try {
    const questions = await generateQuiz(modelId, notes, numQuestions);
    await runQuiz(questions);
  } finally {
    await unloadModel({ modelId });
  }
}

main().catch((error) => {
  console.error('✖', error);
  process.exit(1);
});
