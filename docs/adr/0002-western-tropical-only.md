# Western tropical astrology only

Lumen is constrained to Western tropical astrology even though the underlying caelus engine supports sidereal zodiacs and ayanamsa calculations. The `zodiac` option is locked to `"tropical"` and sidereal code paths (ayanamsa offsets, star zodiac modes) were removed.

This reduces the option surface, simplifies output schemas, and cuts token overhead when LLM agents consume lumen's JSON — a primary use case. Sidereal support can be re-introduced later if needed, but it would require reintroducing ayanamsa calculations and expanding the schema.
