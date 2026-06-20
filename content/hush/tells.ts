/**
 * The tell library for The Hush — the FIXED, stable signifiers (research rule 8:
 * redundant channels). Each tell renders from this consistent prose so a
 * "misread = costly" law stays learnable across runs and drift. `cue` is the
 * learnable signifier; `note` is what it teaches; `conclusion` is the deduced
 * law, shown once the law reaches `surveyed`.
 */
import type { TellProse } from '../../src/sdk/worldpack.js';

export const TELL_LIBRARY: TellProse[] = [
  // ---- The Mile Road (topology) -----------------------------------------
  {
    id: 'mile_milepost_reset',
    channel: 'sight',
    cue: 'The next milepost reads the same numeral as the last one — and the one before that.',
    note: 'The road is not counting honestly. The distance behind you is not what it was.',
    conclusion: 'On the Mile Road, to look back is to double the distance behind you.',
  },
  {
    id: 'mile_shadow_long',
    channel: 'sight',
    cue: 'Your shadow lies far longer behind you than this thin light could ever cast it.',
    note: 'What is behind you stretches. The road keeps the wrongness at your back, where you cannot watch it.',
    conclusion: 'On the Mile Road, to look back is to double the distance behind you.',
  },
  {
    id: 'mile_dead_walker',
    channel: 'sight',
    cue: 'A salvager sits against a milepost, long dead, facing back the way she came. The bootprints around her loop and double and loop again, a thousand steps that never got her home.',
    note: 'She kept looking back. The road kept giving her more road to look at. She never reached the end of it.',
    conclusion: 'On the Mile Road, to look back is to double the distance behind you — and you can walk it forever.',
  },
  // ---- The Greywater (material) -----------------------------------------
  {
    id: 'grey_rust_bloom',
    channel: 'sight',
    cue: 'Rust blooms across every worked rivet and blade like frost across a window — fast enough to watch it spread.',
    note: 'Worked iron is rotting here, and quickly. Something in the dark un-makes it.',
    conclusion: 'In the Greywater after dark, worked metal slumps back toward ore. Iron tools and blades fail.',
  },
  {
    id: 'grey_low_hum',
    channel: 'sound',
    cue: 'A low hum comes up through the soles of your boots — and you feel it answer, faintly, in the iron you carry.',
    note: 'The hum is in the metal. It is calling your worked iron back to the ground it came from.',
    conclusion: 'In the Greywater after dark, worked metal slumps back toward ore. Iron tools and blades fail.',
  },
  {
    id: 'grey_slumped_blade',
    channel: 'sight',
    cue: 'A good knife lies half-sunk in the mud — except the blade has slumped into a smear of red ore, as if it had always been melting and only just remembered to.',
    note: "Someone's steel gave out down here, all at once, after dark.",
    conclusion: 'In the Greywater after dark, worked metal slumps back toward ore — carry no iron in by night.',
  },
  // ---- The Antenna Field (summon / perception) --------------------------
  {
    id: 'antenna_field_hum',
    channel: 'sound',
    cue: 'The dead antennas hum when you speak, as if the sound were a current and they were listening for it.',
    note: 'Your voice goes into the field and does not entirely come back to you. Something else is receiving it.',
    conclusion: 'At the Antenna Field, a name spoken aloud is heard a mile off — and the Changed come toward it.',
  },
  {
    id: 'antenna_far_echo',
    channel: 'sound',
    cue: 'A word you said a breath ago comes back to you from far out in the dark — late, and wearing a voice that is almost but not quite yours.',
    note: 'Sound carries impossibly far here, and what it reaches answers it.',
    conclusion: 'At the Antenna Field, a name spoken aloud is heard a mile off — and the Changed come toward it.',
  },
  {
    id: 'antenna_name_stones',
    channel: 'sight',
    cue: 'Names are scratched into the concrete bases of the antennas, dozens of them. Beneath the freshest name lies a body not three days cold, mouth still open on its last syllable.',
    note: 'They came here and they said a name. The field took it, and gave them the Changed in return.',
    conclusion: 'At the Antenna Field, a name spoken aloud calls the Changed. Speak nothing here you are not ready to be answered.',
  },
  // ---- The Hollow Dark (agency) — a rotating-slot law (per-seed variance) ----
  {
    id: 'hollow_silence',
    channel: 'sound',
    cue: 'The silence here is not empty — it has a weight, and it leans on you, and the longer you stand still the more it presses.',
    note: 'The dark in the deep is patient and it does not like a thing that stops moving. To linger here after dark is to invite it closer.',
    conclusion: 'In the deep dark, to wait or rest is to let the Hush lean in — it costs you your nerve, and it takes a step closer each time.',
  },
  {
    id: 'hollow_heartbeat',
    channel: 'touch',
    cue: 'Your own heartbeat has gone loud and slow in your ears, and you have the distinct, animal certainty that something is matching it, breath for breath, just out past the light.',
    note: 'Stillness in the deep is what it hunts by. Keep moving, or the dark closes the distance.',
    conclusion: 'In the deep dark, to wait or rest is to let the Hush lean in — keep moving, or it takes a step closer.',
  },
  {
    id: 'hollow_sitter',
    channel: 'sight',
    cue: 'A salvager sits cross-legged in the dark a little way off, perfectly still, as if resting. He has been resting a long time. The dark has come all the way up to him and stopped, the way a tide stops, having got what it came for.',
    note: 'He sat down in the deep after dark to catch his breath. He never got up. Stillness is what it waits for.',
    conclusion: 'In the deep dark, to wait or rest is fatal patience — the Hush leans in on anything that stops moving.',
  },
];
