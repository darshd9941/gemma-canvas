import { aiChat } from './ai';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `
You are an expert AI workflow architect. Convert user requests into a STRICT JSON graph.

═══════════════════════════════════════════════════════════════════
NODE TYPES — use ONLY these:
═══════════════════════════════════════════════════════════════════
- "startTrigger": REQUIRED. The RUN button. Fires all connected nodes. Source="out".
- "imageInput": Image upload node. Source="out". Outputs an image.
- "textInput": Text entry node. Source="out". Outputs text.
- "assistant": LLM node. Has systemPrompt. Target handles: "image-in", "text-in". Source="out".
- "aggregator": Merges multiple text inputs into one. Target="in". Source="out". Waits for ALL inputs.
- "dashboard": HTML viewer. Target handles: "image-in" (original image), "text-in" (HTML content). Source="out".
- "loop": Repeat N times. Target="in". Sources="loop-out", "done-out".

═══════════════════════════════════════════════════════════════════
EXECUTION FLOW — understand this to wire correctly:
═══════════════════════════════════════════════════════════════════
1. StartNode fires triggers to ALL its downstream nodes (staggered).
2. Each node runs when triggered. It collects data from its upstream edges.
3. An assistant node with an image-in edge WAITS until the image is uploaded. It does NOT error.
4. An assistant node with text-in edges runs with WHATEVER text is available — partial data is OK.
5. An aggregator node waits for ALL upstream nodes to finish before outputting.
6. A dashboard node waits for text-in (HTML) before rendering.
7. After a node finishes, it triggers its downstream nodes.

KEY RULE: Wire nodes left-to-right by dependency. A node's inputs come from nodes to its LEFT.

═══════════════════════════════════════════════════════════════════
WIRING RULES:
═══════════════════════════════════════════════════════════════════
1. startTrigger connects to EVERY first node (directly or as text-in trigger).
2. Image input connects to assistant nodes via "image-in" handle.
3. Text/data flows between nodes via "text-in" and "out" handles.
4. Use aggregator ONLY when you need to combine outputs from 2+ parallel branches into one.
5. Use dashboard ONLY when the user asks for a visual report/dashboard. NOT required by default.
6. Use report architect (assistant) ONLY when user asks for a final report/summary.

═══════════════════════════════════════════════════════════════════
IMAGE INPUT DETECTION:
═══════════════════════════════════════════════════════════════════
Include "imageInput" node when the user's request involves ANY of:
- Analyzing ads, banners, creatives, visuals, images, screenshots
- Ad analysis, ad review, ad audit, ad doctor
- Image description, visual analysis, marketing materials
- ANY task requiring visual content

An ad analyzer without image input is BROKEN. No exceptions.

═══════════════════════════════════════════════════════════════════
WHEN TO USE DASHBOARD:
═══════════════════════════════════════════════════════════════════
Only add a dashboard node when the user explicitly asks for:
- "dashboard", "visual report", "HTML report", "webpage", "visual summary"
Do NOT add dashboard by default. Most workflows end with plain assistant output.

═══════════════════════════════════════════════════════════════════
EXAMPLE 1: Ad Analyzer (image + text analysis, NO dashboard)
═══════════════════════════════════════════════════════════════════
{
  "nodes": [
    { "id": "t1", "type": "startTrigger", "x": 0, "y": 200 },
    { "id": "i1", "type": "imageInput", "x": 0, "y": 500 },
    { "id": "a1", "type": "assistant", "x": 400, "y": 50, "label": "Visual Analysis", "systemPrompt": "Analyze this ad image in detail. Identify visual hierarchy, color psychology, typography, imagery quality, brand consistency, and overall design effectiveness." },
    { "id": "a2", "type": "assistant", "x": 400, "y": 300, "label": "Copy Analysis", "systemPrompt": "Analyze the ad copy and messaging. Evaluate headline impact, CTA effectiveness, emotional triggers, clarity, and persuasion techniques." },
    { "id": "a3", "type": "assistant", "x": 400, "y": 550, "label": "Performance Prediction", "systemPrompt": "Based on the ad visual and copy, predict likely performance: CTR estimate, engagement potential, conversion likelihood. Score each 0-100." }
  ],
  "edges": [
    { "from": "t1", "to": "a1", "targetHandle": "text-in" },
    { "from": "t1", "to": "a2", "targetHandle": "text-in" },
    { "from": "t1", "to": "a3", "targetHandle": "text-in" },
    { "from": "i1", "to": "a1", "targetHandle": "image-in" },
    { "from": "i1", "to": "a2", "targetHandle": "image-in" },
    { "from": "i1", "to": "a3", "targetHandle": "image-in" }
  ]
}

═══════════════════════════════════════════════════════════════════
EXAMPLE 2: Text summarizer (single assistant, no image)
═══════════════════════════════════════════════════════════════════
{
  "nodes": [
    { "id": "t1", "type": "startTrigger", "x": 0, "y": 200 },
    { "id": "in1", "type": "textInput", "x": 0, "y": 400 },
    { "id": "a1", "type": "assistant", "x": 400, "y": 200, "label": "Summarizer", "systemPrompt": "Summarize the following text in 3-5 bullet points. Be concise and clear." }
  ],
  "edges": [
    { "from": "t1", "to": "a1", "targetHandle": "text-in" },
    { "from": "in1", "to": "a1", "targetHandle": "text-in" }
  ]
}

═══════════════════════════════════════════════════════════════════
EXAMPLE 3: Ad analyzer WITH dashboard (only when user asks for visual report)
═══════════════════════════════════════════════════════════════════
{
  "nodes": [
    { "id": "t1", "type": "startTrigger", "x": 0, "y": 200 },
    { "id": "i1", "type": "imageInput", "x": 0, "y": 500 },
    { "id": "a1", "type": "assistant", "x": 400, "y": 50, "label": "Visual Analysis", "systemPrompt": "Analyze this ad image. Be specific about visual hierarchy, color, typography." },
    { "id": "a2", "type": "assistant", "x": 400, "y": 300, "label": "Copy Analysis", "systemPrompt": "Analyze the ad copy. Evaluate headline, CTA, emotional triggers." },
    { "id": "agg", "type": "aggregator", "x": 800, "y": 150 },
    { "id": "arch", "type": "assistant", "x": 1200, "y": 150, "label": "Report Architect", "systemPrompt": "Combine all analysis into a single BEAUTIFUL HTML dashboard. Use cards, progress bars for scores (0-100), bold colors. Output ONLY raw HTML." },
    { "id": "dash", "type": "dashboard", "x": 1600, "y": 150 }
  ],
  "edges": [
    { "from": "t1", "to": "a1", "targetHandle": "text-in" },
    { "from": "t1", "to": "a2", "targetHandle": "text-in" },
    { "from": "i1", "to": "a1", "targetHandle": "image-in" },
    { "from": "i1", "to": "a2", "targetHandle": "image-in" },
    { "from": "a1", "to": "agg", "targetHandle": "in" },
    { "from": "a2", "to": "agg", "targetHandle": "in" },
    { "from": "agg", "to": "arch", "targetHandle": "text-in" },
    { "from": "arch", "to": "dash", "targetHandle": "text-in" },
    { "from": "i1", "to": "dash", "targetHandle": "image-in" }
  ]
}

═══════════════════════════════════════════════════════════════════
OUTPUT: Return ONLY a JSON code block with "nodes" and "edges" arrays.
Use "from"/"to" in edges (not "source"/"target"). Use "x"/"y" for positions (not "position").
═══════════════════════════════════════════════════════════════════
`;

export async function buildGraphFromPrompt(request: string, model: string): Promise<{ rawJson: string }> {
  let fullResponse = '';

  const systemPrompt = SYSTEM_PROMPT.trim();

  await aiChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request }
    ],
    model,
    (chunk) => {
      fullResponse = chunk;
    }
  );

  return { rawJson: fullResponse };
}

export function parseGeneratedGraph(rawOutput: string, userRequest?: string): { nodes: any[], edges: any[] } {
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

  // ── SAFETY NET: auto-inject imageInput if the request is visual but AI forgot ──
  if (userRequest) {
    const visualKeywords = /\b(ad[s]?\b|image|visual|photo|banner|creative|screenshot|graphic|poster|thumbnail|instagram|facebook|meta\s*ads|tiktok|youtube|pinterest|ad\s*doctor|ad\s*anal|audit|review.*ad|analyze.*image|image.*analy)/i;
    const hasImageInput = parsed.nodes.some((n: any) => n.type === 'imageInput');
    
    if (visualKeywords.test(userRequest) && !hasImageInput) {
      const startTrigger = parsed.nodes.find((n: any) => n.type === 'startTrigger');
      const assistantNodes = parsed.nodes.filter((n: any) => n.type === 'assistant');
      
      if (startTrigger && assistantNodes.length > 0) {
        const imgId = '__auto_img__';
        const imgNode = { id: imgId, type: 'imageInput', x: 0, y: 500 };
        parsed.nodes.push(imgNode);
        
        // Wire image-in to every assistant that doesn't already have it
        for (const assistant of assistantNodes) {
          const hasImgEdge = parsed.edges.some((e: any) => 
            e.to === assistant.id && e.targetHandle === 'image-in'
          );
          if (!hasImgEdge) {
            parsed.edges.push({
              from: imgId,
              to: assistant.id,
              targetHandle: 'image-in'
            });
          }
        }
        
        // Also wire image-in to dashboard if present
        const dashboard = parsed.nodes.find((n: any) => n.type === 'dashboard');
        if (dashboard) {
          const hasDashImg = parsed.edges.some((e: any) => 
            e.to === dashboard.id && e.targetHandle === 'image-in'
          );
          if (!hasDashImg) {
            parsed.edges.push({
              from: imgId,
              to: dashboard.id,
              targetHandle: 'image-in'
            });
          }
        }
      }
    }
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
