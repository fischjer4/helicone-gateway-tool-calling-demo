import { createOpenAI, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText } from "ai";
import dotenv from "dotenv";

dotenv.config();

type ModelSettings = NonNullable<Parameters<ReturnType<typeof createHelicone>>[1]>;

export const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY,
});

interface GetHeliconeHeadersFromChatContextParams {
  tags?: string[];
}

export function getHeliconeModelSettingsFromChatContext({
  tags,
}: GetHeliconeHeadersFromChatContextParams): ModelSettings {
  return {
    environment: "Development",
    extraBody: {
      helicone: {
        sessionId: crypto.randomUUID(),
        userId: "-1",
        tags,
        properties: {
          experienceId: "123",
          projectId: "-1",
          fromPreview: false,
        },
      },
    },
  };
}

async function main(provider: "openai" | "gateway" = "gateway") {
  const gateway = createHelicone({
    apiKey: process.env.HELICONE_API_KEY,
  });

  const openai = createOpenAI({
    baseURL: "https://oai.helicone.ai/v1",
    headers: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      // "helicone-stream-usage": "true",
    },
  });

  const model =
    provider === "openai" ? openai("gpt-5-mini") : gateway("gpt-5-mini", getHeliconeModelSettingsFromChatContext({}));

  const startTime = performance.now();

  const result = streamText({
    model,
    system: "you are an agent that can answer questions about the weather",
    messages: [
      {
        role: "user",
        content: "What is the weather like in San Francisco?",
      },
    ],
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
        reasoningSummary: "auto",
      } satisfies OpenAIResponsesProviderOptions,
    },
    onFinish: () => {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`⏱️  Request finished in ${duration}s`);
    },
  });

  for await (const chunk of result.fullStream) {
    // Process stream silently
    console.log(chunk);
  }

  const finalTime = performance.now();
  const totalDuration = ((finalTime - startTime) / 1000).toFixed(2);

  console.log(`⏱️  Total duration: ${totalDuration}s`);
  console.log(`✓ Request completed successfully!`);
}

// Get provider from command line argument, default to gateway
const provider = (process.argv[2] as "openai" | "gateway") || "gateway";
main(provider).catch(console.error);
