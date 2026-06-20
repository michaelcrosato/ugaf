/**
 * The canonical intent ontology — a CLOSED vocabulary of generic, physical
 * actions. This is the K4 anti-leak design: laws trigger off generic physical
 * intents (`look_back`, `carry_item_class`, `speak_aloud`, `cross_threshold`),
 * never off law-specific verbs. The parser classifies player prose into exactly
 * one of these classes; it never needs to know a law exists, so enumerating the
 * verb surface cannot leak the hidden laws.
 *
 * The parser is non-authoritative: it proposes an intent + a confidence. The
 * kernel routes and resolves. Low confidence drives K8 (monotonic severity).
 */

export const INTENT_CLASSES = [
  // ---- movement / orientation -------------------------------------------
  'go', // move toward a target/direction/route
  'cross_threshold', // step across a named boundary (gate, ward, field edge)
  'look_back', // turn and regard the way you came  (Mile Road trigger)
  'wait', // let time pass (a beat)
  'rest', // longer pause (recover, pass to a phase)
  'flee', // break away from a threat

  // ---- perception --------------------------------------------------------
  'look', // observe the current scene
  'examine', // scrutinize a specific thing  (the GUMSHOE core-clue gather)
  'listen', // attend to sound
  'search', // actively look for the hidden
  'read', // read text/markings

  // ---- manipulation ------------------------------------------------------
  'take', // pick up
  'drop', // set down
  'use', // apply an object (generic)
  'carry_item_class', // META: declares you are carrying a class of item (metal, light)  -> law trigger
  'open',
  'close',
  'give',

  // ---- vocal -------------------------------------------------------------
  'speak_aloud', // say something out loud, NOT directed (Antenna Field trigger)
  'call_out', // shout for someone/something (loud)
  'say', // directed speech to an NPC

  // ---- social ------------------------------------------------------------
  'talk', // open conversation
  'parley', // negotiate / persuade  (social.fate)
  'bribe',
  'intimidate',
  'ask_about', // inquire about a topic / rumor / law

  // ---- investigation / knowledge ----------------------------------------
  'deduce', // assemble tells into a law conclusion  (invest.gumshoe)
  'survey', // attempt to confirm a law to Surveyed
  'recall', // consult the codex / what you know

  // ---- conflict ----------------------------------------------------------
  'attack', // intent to harm a creature's body  (combat.ito)
  'hide', // break line of sight (stealth.detection)
  'sneak', // move while avoiding detection

  // ---- economy -----------------------------------------------------------
  'trade', // open trade
  'buy',
  'sell',

  // ---- meta / fallthrough ------------------------------------------------
  'unclassified', // parser could not map -> K8 safety path
] as const;

export type IntentClass = (typeof INTENT_CLASSES)[number];
const INTENT_SET = new Set<string>(INTENT_CLASSES);
export function isIntentClass(s: string): s is IntentClass {
  return INTENT_SET.has(s);
}

/** A reference to an entity/place/item the player named (already resolved to an id, or raw). */
export interface EntityRef {
  /** resolved world id if the parser matched a known entity; absent if unresolved */
  readonly id?: string;
  /** the raw noun phrase the player used (for rendering + audit) */
  readonly raw: string;
  /** classification tags the parser attached (e.g. 'metal', 'light', 'npc', 'route') */
  readonly tags?: readonly string[];
}

/**
 * A parsed intent — the LLM/parser's NON-AUTHORITATIVE proposal. The committed
 * outcome is a function of the resolved intent token, so this is recorded to the
 * tape (oracle entry) and replayed, never re-parsed.
 */
export interface ParsedIntent {
  readonly class: IntentClass;
  readonly target?: EntityRef; // primary object/recipient/destination
  readonly instrument?: EntityRef; // secondary object ("with the crowbar")
  readonly direction?: string; // compass/relative direction
  readonly utterance?: string; // for speak_aloud/say: the actual words (Antenna Field reads this)
  readonly topic?: string; // for ask_about/deduce: the subject (a rumor id, a law id, a place)
  readonly itemClass?: string; // for carry_item_class: 'metal' | 'light' | ...
  readonly tags: readonly string[]; // free-form descriptor tags
  /** 0..1 — parser confidence. Below thresholds, K8 caps consequence severity. */
  readonly confidence: number;
  /** alternative readings the parser also considered (for inter-parser-agreement audit) */
  readonly alternatives?: readonly ParsedIntent[];
  /** the exact raw input, persisted verbatim (provenance) */
  readonly raw: string;
}

/** Confidence bands that gate K8 severity. */
export const CONFIDENCE = {
  /** at/above this, full-severity outcomes (including lethal laws) are permitted */
  CONFIDENT: 0.75,
  /** at/above this but below CONFIDENT: reversible friction only, may clarify */
  TENTATIVE: 0.4,
  /** below TENTATIVE: treat as unclassified — never irreversible */
  FLOOR: 0.4,
} as const;
