// LLM client Wrapper :/ For the internal model -  Make the code Redundant :p
export type LlmJsonResult<T> = {
  data: T;
  rawText?: string;
};

export interface LlmClient {
  completeJson<T>(input: {
    system: string;
    user: string;
    schemaHint?: string;
  }): Promise<LlmJsonResult<T>>;
}

export class StubLlmClient implements LlmClient {
  async completeJson<T>(input: { system: string; user: string }): Promise<LlmJsonResult<T>> {
    return { data: { system: input.system, user: input.user } as unknown as T };
  }
}

export class OpenAiCompatibleClient implements LlmClient {
  constructor(
    private config: {
      baseUrl: string;
      apiKey: string;
      model: string;
    }
  ) {}

  async completeJson<T>(input: {
    system: string;
    user: string;
    schemaHint?: string;
  }): Promise<LlmJsonResult<T>> {
    const url = new URL("/v1/chat/completions", this.config.baseUrl).toString();
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });

    if (!resp.ok) {
      throw new Error(`LLM_REQUEST_FAILED_${resp.status}`);
    }

    const json = (await resp.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("LLM_EMPTY_RESPONSE");
    }

    const parsed = JSON.parse(content) as T;
    return { data: parsed, rawText: content };
  }
}

export class GeminiClient implements LlmClient {
  constructor(
    private config: {
      apiKey: string;
      model: string;
    }
  ) {}

  private extractFirstJson(text: string): string | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && typeof fenceMatch[1] === "string") {
      const inner = fenceMatch[1].trim();
      if (inner.startsWith("{") || inner.startsWith("[")) return inner;
    }

    const firstObj = trimmed.indexOf("{");
    const firstArr = trimmed.indexOf("[");
    const start =
      firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
    if (start === -1) return null;
    return trimmed.slice(start);
  }

  async completeJson<T>(input: { system: string; user: string; schemaHint?: string }): Promise<LlmJsonResult<T>> {
    const url = new URL(
      `/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent`,
      "https://generativelanguage.googleapis.com"
    );
    url.searchParams.set("key", this.config.apiKey);

    const prompt = [
      input.system,
      input.schemaHint ? `\nSchema hint:\n${input.schemaHint}` : "",
      "\nReturn JSON only.",
    ].join("");

    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt }] },
        contents: [{ role: "user", parts: [{ text: input.user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!resp.ok) {
      throw new Error(`LLM_REQUEST_FAILED_${resp.status}`);
    }

    const json = (await resp.json()) as any;
    const content = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("LLM_EMPTY_RESPONSE");
    }

    const extracted = this.extractFirstJson(content) ?? content;
    const parsed = JSON.parse(extracted) as T;
    return { data: parsed, rawText: content };
  }
}

export function createLlmClient(): LlmClient {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (geminiApiKey) {
    return new GeminiClient({ apiKey: geminiApiKey, model: geminiModel });
  }

  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;

  if (apiKey && baseUrl && model) {
    return new OpenAiCompatibleClient({ apiKey, baseUrl, model });
  }
  return new StubLlmClient();
}
