/**
 * pi-jev — structured decision calls for pi agents (OpenRouter /decisions).
 *
 *   jev_decide — pick one option: {question, options[], context?}
 *   jev_pick   — pick the best item from a list for a goal
 *
 * The same jev model the host uses for routing — souls get structured
 * judgment inside their runs: public-vs-private, which issue first,
 * ready-to-post gates. Fails soft (returns note, never crashes a run).
 *
 * Env: OPENROUTER_API_KEY, OPENROUTER_MODEL (default typesafe/jev-1.13)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const MODEL = process.env.OPENROUTER_MODEL ?? "typesafe/jev-1.13";

async function decide(
	instructions: string,
	criteria: Record<string, string>,
	state: string,
): Promise<{ choice: string; confidence: number } | null> {
	const key = process.env.OPENROUTER_API_KEY;
	if (!key) return null;
	try {
		const resp = await fetch("https://openrouter.ai/api/alpha/decisions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${key}`,
				"X-Title": "pi-jev",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: MODEL,
				state: { message: state.slice(0, 2000) },
				questions: {
					pick: { type: "choice", instructions, criteria },
				},
			}),
			signal: AbortSignal.timeout(15_000),
		});
		if (!resp.ok) return null;
		const data = await resp.json();
		const ans = Object.values(data?.answers ?? {})[0] as
			| { choice?: string; confidence?: number }
			| undefined;
		if (!ans?.choice) return null;
		return { choice: ans.choice, confidence: ans.confidence ?? 0 };
	} catch {
		return null;
	}
}

export default function piJev(pi: ExtensionAPI) {
	pi.registerTool({
		name: "jev_decide",
		label: "Jev Decide",
		description:
			"Structured judgment call — pick exactly one option for a question, with confidence. Use when the choice matters and you're unsure: public vs private reply, own it vs hand off, ready vs draft.",
		promptSnippet: "Make a structured decision",
		parameters: Type.Object({
			question: Type.String({ description: "What to decide" }),
			options: Type.Array(Type.String(), {
				description: "The choices — jev picks exactly one",
			}),
			context: Type.Optional(
				Type.String({ description: "The situation/facts jev weighs" }),
			),
		}),
		async execute(_id, params) {
			const criteria = Object.fromEntries(
				params.options.map((o) => [o, o]),
			);
			const r = await decide(
				params.question,
				criteria,
				params.context ?? params.question,
			);
			return {
				content: [
					{
						type: "text" as const,
						text: r
							? `pick: ${r.choice} (confidence ${r.confidence.toFixed(2)})`
							: "(jev unavailable — decide yourself)",
					},
				],
				details: r ?? {},
			};
		},
	});

	pi.registerTool({
		name: "jev_pick",
		label: "Jev Pick",
		description:
			"Pick the best item from a list for a goal — which issue to take first, which draft is better, which memory is relevant.",
		parameters: Type.Object({
			goal: Type.String({ description: "What 'best' means" }),
			items: Type.Array(Type.String(), { description: "Candidates" }),
			context: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const criteria = Object.fromEntries(
				params.items.map((it, i) => [`item_${i + 1}`, it.slice(0, 300)]),
			);
			const r = await decide(
				`Pick the item that best serves this goal: ${params.goal}`,
				criteria,
				params.context ?? params.items.join("\n"),
			);
			const idx = r ? parseInt(r.choice.replace("item_", "")) - 1 : -1;
			const picked = idx >= 0 ? params.items[idx] : undefined;
			return {
				content: [
					{
						type: "text" as const,
						text: picked
							? `picked: ${picked} (confidence ${r!.confidence.toFixed(2)})`
							: `(jev unavailable — pick yourself)\nraw: ${r?.choice ?? "none"}`,
					},
				],
				details: { picked },
			};
		},
	});
}
