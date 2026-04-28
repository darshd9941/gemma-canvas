import { ollamaChat } from './ollama';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `
You are an expert AI workflow architect. Convert user requests into a STRICT JSON graph.

NODE TYPES:
- "startTrigger": REQUIRED. Global run button. Source="out".
- "imageInput": Image upload. Source="out".
- "textInput": Text entry. Source="out".
- "assistant": LLM Node. REQUIRES "systemPrompt". Inputs='image-in', 'text-in'. Source='out'.
- "aggregator": Concat text inputs. Target='in'. Source='out'.
- "dashboard": Visual HTML Dashboard. Inputs: 'image-in' (original ad), 'text-in' (HTML content).
- "loop": Standard loop. SourceHandles='loop-out', 'done-out'. Target='in'.

MANDATORY WIRING RULES:
1. THE START TRIGGER RULE: Connect the "startTrigger" to EVERY node that should run first. If you have 5 assistants in parallel, the startTrigger MUST have 5 edges, one to each assistant's 'text-in'.
2. THE DASHBOARD FORMULA: Every high-end report MUST end with a "dashboard" node.
   - Step A: Create an "assistant" node labeled "Report Architect".
   - Step B: Give that assistant a systemPrompt to: "Take all input data and write a single, BEAUTIFUL, modern HTML dashboard using inline CSS. Use cards, progress bars for scores (0-100), and bold colors. Output ONLY HTML code."
   - Step C: Connect "Report Architect" to "dashboard" node (text-in).
   - Step D: Connect the original "imageInput" to "dashboard" node (image-in) so the ad is visible.

JSON EXAMPLE:
{
  "nodes": [
    { "id": "t1", "type": "startTrigger", "x": 0, "y": 200 },
    { "id": "i1", "type": "imageInput", "x": 0, "y": 500 },
    { "id": "a1", "type": "assistant", "x": 400, "y": 100, "systemPrompt": "Perspective A..." },
    { "id": "agg", "type": "aggregator", "x": 800, "y": 200 },
    { "id": "arch", "type": "assistant", "x": 1200, "y": 200, "label": "Report Architect", "systemPrompt": "Write HTML/CSS dashboard..." },
    { "id": "dash", "type": "dashboard", "x": 1600, "y": 200 }
  ],
  "edges": [
    { "from": "t1", "to": "a1", "targetHandle": "text-in" },
    { "from": "i1", "to": "a1", "targetHandle": "image-in" },
    { "from": "a1", "to": "agg", "targetHandle": "in" },
    { "from": "agg", "to": "arch", "targetHandle": "text-in" },
    { "from": "arch", "to": "dash", "targetHandle": "text-in" },
    { "from": "i1", "to": "dash", "targetHandle": "image-in" }
  ]
}
`;

export async function buildGraphFromPrompt(request: string, model: string): Promise<{ rawJson: string }> {
  let fullResponse = '';
  
  await ollamaChat(
    [
      { role: 'system', content: SYSTEM_PROMPT.trim() },
      { role: 'user', content: request }
    ],
    model,
    (chunk) => {
      fullResponse = chunk; // ollamaChat accumulates internally and passes full text if using our standard implementation
      // Wait, our ollamaChat passes the accumulated string so far.
    }
  );

  return { rawJson: fullResponse };
}

export function parseGeneratedGraph(rawOutput: string): { nodes: any[], edges: any[] } {
  // Extract JSON block
  const jsonMatch = rawOutput.match(/```json\n([\s\S]*?)\n```/) || rawOutput.match(/```\n([\s\S]*?)\n```/);
  
  let jsonString = rawOutput;
  if (jsonMatch && jsonMatch[1]) {
    jsonString = jsonMatch[1];
  } else {
    // Attempt brute parsing if no markdown blocks
    const startObj = rawOutput.indexOf('{');
    const endObj = rawOutput.lastIndexOf('}');
    if (startObj >= 0 && endObj > startObj) {
      jsonString = rawOutput.substring(startObj, endObj + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error("Failed to parse JSON from AI response.");
  }

  if (!parsed.nodes || !parsed.edges) {
    throw new Error("Generated JSON missing 'nodes' or 'edges' array.");
  }

  // Construct actual React Flow structures
  // Map temporary IDs to UUIDs to avoid collisions
  const idMap = new Map<string, string>();
  
  const finalNodes = parsed.nodes.map((n: any) => {
    const freshId = uuidv4();
    idMap.set(n.id, freshId);

    return {
      id: freshId,
      type: n.type,
      position: { x: n.x || 0, y: n.y || 0 },
      data: {
        nodeType: n.type,
        label: n.label || n.type,
        systemPrompt: n.systemPrompt || '',
        condition: n.condition || '',
        operator: n.operator || '+',
        maxLoops: n.maxLoops || 5,
        text: '',
        output: '',
        running: false
      }
    };
  });

  const finalEdges = parsed.edges.map((e: any) => ({
    id: uuidv4(),
    source: idMap.get(e.from) || e.from,
    sourceHandle: e.sourceHandle || 'out',
    target: idMap.get(e.to) || e.to,
    targetHandle: e.targetHandle || 'in',
    type: 'deletableEdge',
    animated: true
  }));

  return { nodes: finalNodes, edges: finalEdges };
}
