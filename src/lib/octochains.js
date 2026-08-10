/**
 * octochains.js — Octochains-Inspired Parallel Isolated Multi-Agent Reasoning Engine.
 *
 * Ported from the Python Octochains framework concept to JavaScript for browser execution.
 * 
 * Architecture:
 * 1. Multiple specialist "agents" each receive the SAME problem data.
 * 2. Each agent runs in COMPLETE ISOLATION — zero awareness of peer outputs.
 * 3. All agents execute in parallel via Promise.allSettled().
 * 4. A centralized Synthesizer aggregates isolated reports into a consensus verdict.
 * 
 * This eliminates Cognitive Tunnel Vision and Groupthink that plague sequential chains.
 */

import { chatCompletion } from './geminiClient.js';

// ─── Agent Base ──────────────────────────────────────────────────────────────

/**
 * An isolated specialist agent that analyzes a problem from a single expert perspective.
 */
class Agent {
  /**
   * @param {object} config
   * @param {string} config.role - e.g. "Emergency Medicine Specialist"
   * @param {string} config.goal - What this agent focuses on.
   * @param {string} config.icon - Material icon name for UI.
   * @param {string} config.color - Tailwind color class for UI.
   * @param {string[]} [config.skills] - Domain-specific knowledge injected into prompt.
   */
  constructor({ role, goal, icon = 'psychology', color = 'primary', skills = [] }) {
    this.role = role;
    this.goal = goal;
    this.icon = icon;
    this.color = color;
    this.skills = skills;
  }

  /**
   * Build the strict "Forced Perspective" system prompt that locks
   * the agent into its isolated expert identity.
   */
  _buildSystemPrompt() {
    let prompt = `You are a ${this.role}.\n\nYour singular objective: ${this.goal}\n\n`;
    prompt += `CRITICAL RULES:\n`;
    prompt += `1. You MUST analyze ONLY from the perspective of your assigned role.\n`;
    prompt += `2. You have ZERO awareness of any other expert's analysis.\n`;
    prompt += `3. Provide evidence-based reasoning with confidence levels.\n`;
    prompt += `4. Flag any information gaps or uncertainties explicitly.\n`;
    prompt += `5. Structure your response with: ASSESSMENT, KEY FINDINGS, RECOMMENDATIONS, CONFIDENCE LEVEL.\n`;

    if (this.skills.length > 0) {
      prompt += `\nDOMAIN KNOWLEDGE:\n`;
      this.skills.forEach(skill => { prompt += `- ${skill}\n`; });
    }

    return prompt;
  }

  /**
   * Execute this agent's analysis in isolation.
   * @param {string} problemData - The patient query / medical scenario.
   * @returns {Promise<{ role: string, status: string, report: string, error: string|null }>}
   */
  async execute(problemData) {
    const startTime = Date.now();
    try {
      const systemPrompt = this._buildSystemPrompt();
      const report = await chatCompletion(systemPrompt, problemData);
      return {
        role: this.role,
        icon: this.icon,
        color: this.color,
        status: 'success',
        report,
        error: null,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        role: this.role,
        icon: this.icon,
        color: this.color,
        status: 'error',
        report: '',
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// ─── Synthesizer (Aggregator) ────────────────────────────────────────────────

/**
 * Centralized Synthesizer that audits isolated expert reports,
 * resolves conflicts, and produces a unified consensus verdict.
 */
class Synthesizer {
  constructor() {
    this.role = 'Chief Medical Synthesizer';
    this.goal = 'Merge isolated expert analyses into a unified, safe medical consensus.';
  }

  /**
   * Aggregate all expert reports into a single consensus.
   * @param {Array} agentReports - Array of { role, status, report } objects.
   * @param {string} originalQuery - The patient's original question.
   * @returns {Promise<string>} The synthesized consensus.
   */
  async execute(agentReports, originalQuery) {
    const validReports = agentReports.filter(r => r.status === 'success');

    if (validReports.length === 0) {
      return 'Unable to generate a consensus — all specialist analyses failed. Please try again or consult a healthcare professional directly.';
    }

    if (validReports.length === 1) {
      return validReports[0].report;
    }

    const compiledReports = validReports
      .map((r, i) => `\n--- EXPERT ${i + 1}: ${r.role} ---\n${r.report}`)
      .join('\n');

    const systemPrompt = `You are a ${this.role}.
Your objective: ${this.goal}

You will receive isolated analyses from multiple medical specialists who have ZERO awareness of each other's reports.

Your task:
1. SYNTHESIZE their findings into a coherent, unified response.
2. RESOLVE any contradictions by noting them and providing the safest recommendation.
3. HIGHLIGHT consensus points where experts agree.
4. FLAG any information gaps identified by any expert.
5. Provide a FINAL RECOMMENDATION that is safe, actionable, and clear.
6. Always include the disclaimer that this is AI-assisted guidance, not a replacement for professional medical advice.

Format your response in clear sections with headers. Use simple language the patient can understand.
Do NOT mention "Expert 1" or "Expert 2" — present it as unified medical guidance.`;

    const userMessage = `PATIENT QUERY: ${originalQuery}\n\nISOLATED EXPERT REPORTS:${compiledReports}\n\nPlease synthesize these isolated analyses into a unified medical consensus.`;

    return chatCompletion(systemPrompt, userMessage);
  }
}

// ─── Engine ──────────────────────────────────────────────────────────────────

/**
 * The parallel orchestration engine.
 * Launches all agents concurrently, traps individual failures,
 * and pipes results to the Synthesizer.
 */
class Engine {
  /**
   * @param {Agent[]} agents - Array of specialist agents.
   * @param {Synthesizer} aggregator - The consensus synthesizer.
   */
  constructor(agents, aggregator) {
    this.agents = agents;
    this.aggregator = aggregator;
  }

  /**
   * Run the full parallel-isolated reasoning pipeline.
   * @param {string} problemData - The input query.
   * @param {function} [onAgentComplete] - Callback when each agent finishes (for live UI updates).
   * @returns {Promise<{ consensus: string, traces: Array, totalMs: number }>}
   */
  async run(problemData, onAgentComplete) {
    const startTime = Date.now();

    // Phase 1: Launch all agents in parallel isolation
    const agentPromises = this.agents.map(agent =>
      agent.execute(problemData).then(result => {
        if (onAgentComplete) onAgentComplete(result);
        return result;
      })
    );

    const results = await Promise.allSettled(agentPromises);
    const traces = results.map(r =>
      r.status === 'fulfilled' ? r.value : {
        role: 'Unknown',
        status: 'error',
        report: '',
        error: r.reason?.message || 'Unknown error',
        durationMs: 0,
      }
    );

    // Phase 2: Synthesize consensus from isolated reports
    const consensus = await this.aggregator.execute(traces, problemData);

    return {
      consensus,
      traces,
      totalMs: Date.now() - startTime,
    };
  }
}

// ─── Pre-built Medical Specialist Agents ─────────────────────────────────────

/** General Practitioner — broad diagnostic perspective */
export function gpAgent() {
  return new Agent({
    role: 'General Practitioner',
    goal: 'Provide broad diagnostic assessment covering common conditions, differential diagnoses, and appropriate referral pathways.',
    icon: 'stethoscope',
    color: 'emerald',
    skills: [
      'Primary care diagnostics across all body systems',
      'Common drug interactions and contraindications',
      'Preventive health screening guidelines',
      'Red-flag symptom identification requiring urgent referral',
    ],
  });
}

/** Emergency Medicine Specialist — acute/critical care */
export function emergencyAgent() {
  return new Agent({
    role: 'Emergency Medicine Specialist',
    goal: 'Evaluate for acute, life-threatening conditions requiring immediate intervention. Triage urgency level.',
    icon: 'emergency',
    color: 'rose',
    skills: [
      'Acute cardiac events (STEMI, arrhythmia, cardiac arrest)',
      'Stroke recognition (FAST protocol)',
      'Trauma assessment and hemorrhage control',
      'Poisoning and overdose management protocols',
      'Anaphylaxis and airway emergency management',
    ],
  });
}

/** Pharmacologist — drug safety and interactions */
export function pharmacologyAgent() {
  return new Agent({
    role: 'Clinical Pharmacologist',
    goal: 'Analyze medication safety, drug interactions, dosage appropriateness, and potential adverse effects.',
    icon: 'medication',
    color: 'violet',
    skills: [
      'Drug-drug interaction databases',
      'Hepatic and renal dosage adjustments',
      'Teratogenicity and pregnancy category classifications',
      'Polypharmacy risk assessment in elderly patients',
      'Generic vs brand bioequivalence considerations',
    ],
  });
}

// ─── Factory: Create a Medical Reasoning Engine ──────────────────────────────

/**
 * Create a ready-to-use Octochains medical reasoning engine
 * with 3 parallel isolated specialists + a synthesizer.
 * @returns {Engine}
 */
export function createMedicalEngine() {
  return new Engine(
    [gpAgent(), emergencyAgent(), pharmacologyAgent()],
    new Synthesizer()
  );
}

export { Agent, Synthesizer, Engine };
