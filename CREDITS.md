# Credits & Content Attribution

OpenFray includes game content from the following sources. This governs the
**game content** (the data); it is **separate from** the project's own code license
(AGPL-3.0, see [`LICENSE`](./LICENSE)). Both apply.

**Policy:** all game content is used under **CC-BY-4.0; the OGL is never used.** See
[`docs/content-licensing.md`](./docs/content-licensing.md) for the full build-agent
instructions. The running app must also surface this attribution in-app (an
About/Credits screen), alongside the AGPL §13 "Source" link.

> Attribution strings below are scaffolding. When SRD content is ingested, replace the
> bracketed placeholders with **WotC's exact specified attribution text** for each SRD
> version — verbatim, not paraphrased.

## System Reference Document 5.2 (D&D 2024)

OpenFray's compendium uses material from the SRD 5.2 under CC-BY-4.0: **330
creatures parsed from WotC's official SRD 5.2.1 PDF**, plus 339 spells via the
[Open5e](https://open5e.com) API. Required attribution:

> This work includes material from the System Reference Document 5.2 ("SRD 5.2")
> by Wizards of the Coast LLC and available at <https://www.dndbeyond.com/srd>.
> The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International
> License available at <https://creativecommons.org/licenses/by/4.0/legalcode>.

Changes were made: content was reformatted and restructured into OpenFray's schema
(structured action/damage fields, etc.), and known typos in the source PDF (e.g.
the Archmage's XP) were corrected. The ingest tooling lives in the
[openfray-compendium](https://github.com/SirDarcanos/openfray-compendium) repo.

## System Reference Document 5.1 (D&D 2014)

OpenFray's SRD 5.1 compendium (334 creatures, 319 spells) is used under CC-BY-4.0.
SRD 5.1 is dual-licensed (OGL 1.0a or CC-BY-4.0); we elect CC-BY-4.0 and never invoke
the OGL. Required attribution:

> This work includes material from the System Reference Document 5.1 ("SRD 5.1")
> by Wizards of the Coast LLC and available at
> <https://dnd.wizards.com/resources/systems-reference-document>. The SRD 5.1 is
> licensed under the Creative Commons Attribution 4.0 International License available
> at <https://creativecommons.org/licenses/by/4.0/legalcode>.

Changes were made: content was reformatted and restructured into OpenFray's schema
(structured action/damage/spellcasting fields, etc.).

> ⚠️ Verify the wording above against the SRD 5.1 CC-BY preamble before public release —
> it must match WotC's specified text verbatim.

## Third-party content

*(For each third-party source actually ingested — e.g. Kobold Press — name it and
reproduce ITS required attribution under ITS own license. Do not assume CC-BY. Check
each publisher's terms before ingesting and record them here. If a source is OGL-only,
flag it to the maintainer rather than reintroducing the OGL.)*

None bundled yet.

## Data source

SRD 5.2 **creatures** are parsed from WotC's official SRD 5.2.1 PDF
(<https://www.dndbeyond.com/srd>); SRD 5.2 **spells** come via the Open5e API
(<https://open5e.com>). SRD 5.1 data is sourced via the 5e-bits API
(<https://www.dnd5eapi.co>). All deliver WotC's SRD content, used here under
CC-BY-4.0 (never the OGL). The ingest tooling lives in the
[openfray-compendium](https://github.com/SirDarcanos/openfray-compendium) repo.

---

*OpenFray is compatible with fifth edition and is not affiliated with, endorsed,
sponsored, or specifically approved by Wizards of the Coast LLC.*
