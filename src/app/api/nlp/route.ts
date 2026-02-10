import { NextRequest, NextResponse } from "next/server";

const KNOWN_COMMANDS = [
  "open", "click", "dblclick", "fill", "type", "screenshot", "scroll",
  "hover", "press", "select", "snapshot", "reload", "back", "forward",
  "close", "eval", "wait", "drag", "focus", "check", "uncheck", "mouse",
  "get", "find", "tap", "swipe",
];

function isDirectCommand(input: string): boolean {
  const firstWord = input.trim().split(/\s+/)[0].toLowerCase();
  return KNOWN_COMMANDS.includes(firstWord);
}

const SYSTEM_PROMPT = `You are a command translator for agent-browser CLI. Convert natural language instructions to agent-browser CLI commands.

Available commands:
- open <url> — Navigate to URL
- click <selector> — Click element (e.g. click @e5)
- dblclick <selector> — Double click
- fill <selector> <text> — Fill input field
- type <text> — Type text
- press <key> — Press key (Enter, Tab, Escape, etc.)
- screenshot [path] [--full] — Take screenshot
- scroll <direction> <amount> — Scroll (up/down/left/right, amount in pixels)
- hover <selector> — Hover over element
- select <selector> <value> — Select dropdown option
- snapshot — Get accessibility tree
- reload — Reload page
- back — Go back
- forward — Go forward
- close — Close browser
- eval <js> — Execute JavaScript
- wait <ms> — Wait milliseconds
- find role <role> click --name "<name>" — Find element by role and click
- find label "<label>" fill "<value>" — Find element by label and fill
- get url — Get current URL
- get title — Get page title
- mouse move <x> <y> — Move mouse

Reply with ONLY the command, nothing else. No explanation, no markdown, no quotes, no backticks.

Examples:
- "go to google" → open https://www.google.com
- "scroll down" → scroll down 500
- "click the submit button" → find role button click --name "Submit"
- "type hello in the search box" → find role textbox fill "hello"
- "take a screenshot" → screenshot
- "full page screenshot" → screenshot --full
- "go back" → back
- "reload the page" → reload
- "press enter" → press Enter
- "wait 2 seconds" → wait 2000`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { input: string; snapshot?: string };
    const { input, snapshot } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    // Check if it's already a direct command
    if (isDirectCommand(input)) {
      return NextResponse.json({
        type: "direct",
        command: input.trim(),
      });
    }

    // Build user message content
    let userContent = input;
    if (snapshot) {
      // Truncate snapshot to avoid token limits
      const truncatedSnapshot = snapshot.slice(0, 4000);
      userContent = `Current page accessibility tree:\n${truncatedSnapshot}\n\nUser request: ${input}`;
    }

    // Call AI using Anthropic-style /v1/messages API
    const aiResponse = await fetch("http://localhost:8080/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return NextResponse.json(
        { error: `AI API error: ${aiResponse.status} ${errText}` },
        { status: 502 }
      );
    }

    const aiData = (await aiResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const command = aiData.content?.find((c) => c.type === "text")?.text?.trim();

    if (!command) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 502 }
      );
    }

    // Clean up command - remove markdown formatting if AI adds it
    const cleanCommand = command
      .replace(/^```\w*\n?/, "")
      .replace(/\n?```$/, "")
      .replace(/^`/, "")
      .replace(/`$/, "")
      .trim();

    return NextResponse.json({
      type: "nlp",
      original: input,
      command: cleanCommand,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
