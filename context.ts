// Script for sending the file to Ollama and getting the response

import { Ollama } from "ollama";

const ollama = new Ollama();

const response = await ollama.chat({
    model: 'qwen3.5:0.8b',
    think: false,
    messages: [{ role: 'user', content: 'Why is the sky blue?' }],
});



console.log(response)
console.log(response.message.content)