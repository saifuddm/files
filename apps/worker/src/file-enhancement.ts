import { Ollama } from "ollama";

const enhancementModel = "qwen3.5:0.8b";
const ollama = new Ollama();

interface EnhanceFileContentProps {
  filePath: string;
  fileText: string;
}

export async function enhanceFileContent(props: EnhanceFileContentProps) {
  const response = await ollama.chat({
    model: enhancementModel,
    think: false,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant. Given the contents of a file, respond with a concise 1-3 sentence summary describing what the file does or contains. Do not include any preamble.",
      },
      {
        role: "user",
        content: `File path: ${props.filePath}\n\nFile content:\n${props.fileText}`,
      },
    ],
  });

  return {
    model: enhancementModel,
    summary: response.message.content,
  };
}
