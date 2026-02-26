import { ContractType } from "@prisma/client"
import { renderTemplate, markdownToHTML } from "./template-engine"

// Helper function to create template variable placeholders
// This avoids TypeScript/JavaScript parsing issues with ${{variable}} in template literals
function tplVar(name: string): string {
  return '{{' + name + '}}'
}

/**
 * Embedded contract templates
 * These are embedded directly in the code to ensure they're available in serverless environments like Vercel
 */
const PUBLISHING_ASSIGNMENT_TEMPLATE = `<div style="display: flex; align-items: center; margin-bottom: 30px; gap: 30px;">
  <img src="{{logo_url}}" alt="River & Ember" style="width: 150px; height: auto; flex-shrink: 0;" />
  <div style="flex: 1;">
    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">PROJECT-SPECIFIC PUBLISHING ASSIGNMENT AGREEMENT</h1>
  </div>
</div>

This Agreement is made effective as of {{effective_date}} ("Effective Date"), between **River and Ember, LLC** ("Publisher"), a {{publisher_state}} limited liability company with principal place of business at {{publisher_address}}, and **{{writer_full_name}}**, an individual residing at {% if writer_address %}{{writer_address}}{% else %}<span style="color: red;">[Writer address not provided]</span>{% endif %} ("Writer").

**PLAIN LANGUAGE SUMMARY**  
*This summary is provided to help you understand this agreement. The legal terms below are what actually govern our relationship.*

This agreement covers **publishing rights only** for the songs listed in Exhibit A. Here is a brief overview of each section:

1. **Publishing Rights (Section 1)** — You assign 100% of the publisher's share of royalties to River & Ember. You keep 100% of the writer's share, which your PRO (ASCAP, BMI, SESAC) pays directly to you.
2. **Scope (Section 2)** — This only applies to the specific songs listed in Exhibit A. You keep full publishing rights to all your other songs.
3. **Master Rights (Section 3)** — This agreement does NOT cover master recording rights. If you're also a performer on the recording, those rights are handled in a separate Master Revenue Share Agreement.
4. **Term & Reversion (Section 4)** — This agreement lasts indefinitely, but you can get your rights back if: (a) at least 10 years have passed since the song's first release, (b) the publisher's share earned less than $500 over the prior 24 months, and (c) River & Ember can't fix that within 6 months of your written notice.
5. **Warranties (Section 5)** — You confirm the songs are original, don't infringe on anyone else's rights, and you have the authority to sign this agreement.
6. **Governing Law (Section 6)** — Any legal disputes are handled under the laws of the state specified in this agreement.
7. **Derivative Works (Section 7)** — River & Ember can create alternative versions of the songs (remixes, acoustic versions, translations, etc.) for their projects. You still get songwriting credit and keep your writer's share on those versions.
8. **Indemnification (Section 8)** — If either side causes a legal problem (like a copyright claim), the responsible party covers the other's costs and legal fees.
9. **Entire Agreement (Section 9)** — This document is the complete agreement. Any changes must be in writing and signed by both parties.
10. **Assignment (Section 10)** — River & Ember can transfer this agreement to another entity (like in a sale or merger). You cannot transfer your obligations without River & Ember's written permission.

**RECITALS**  
Writer has created certain musical compositions for recording and release under Publisher's label projects. Publisher desires to administer publishing rights in those compositions to maximize congregational and global impact.

**AGREEMENT**

1. **Assignment of Publishing Rights**

<div class="indent">Writer hereby irrevocably and exclusively assigns to Publisher one hundred percent (100%) of the worldwide publisher's share (including but not limited to performance, mechanical, synchronization, print, and all other royalties) in and to the musical compositions listed in Exhibit A attached hereto (the "Compositions"), which are created for and recorded/released under Publisher's label projects. Writer retains one hundred percent (100%) of the writer's share of all royalties, which shall be paid directly to Writer by Writer's performing rights organization (e.g., ASCAP, BMI, SESAC) without interference from Publisher. **No payment is due to Writer from the publisher's share**—Publisher retains 100% of the publisher's share as full consideration for administration and promotion of the Compositions.</div>

2. **Scope & Project-Specific Nature**

<div class="indent">This assignment applies **solely** to the Compositions listed in Exhibit A (and any approved revisions). Writer retains full publishing rights in all other compositions not created for or released under Publisher's projects.</div>

3. **Master Rights & Revenue Share**

<div class="indent">This Agreement covers **only publishing rights** and revenues for the underlying musical compositions. Master rights and revenue shares for sound recordings are governed by a separate Master Revenue Share Agreement (if applicable). Writer has **no right** to master revenue share or ownership based on their songwriting or composition contributions under this Agreement. If Writer is also a performer on the sound recording(s) of the Compositions, Writer's master rights and revenue share (if any) are governed exclusively by a separate Master Revenue Share Agreement with River and Ember, and any master revenue share or ownership shall be in accordance with the terms of that separate master agreement. Writer is **not** eligible for master revenue share based solely on songwriting or composition contributions; such contributions are handled separately through master revenue share agreements. This Agreement pertains solely to Publishing rights and revenues.</div>

4. **Term and Reversion**

<div class="indent">This Agreement shall remain in full force and effect perpetually from the Effective Date, subject to the following reversion provision:</div>

<div class="indent">Notwithstanding the foregoing, the rights assigned to Publisher hereunder shall automatically revert to Writer, and this Agreement shall terminate with respect to the Compositions, upon written notice from Writer to Publisher if:</div>

<div class="indent">(a) Ten (10) years have passed since the first commercial release of a sound recording embodying any of the Compositions under Publisher's label projects; and</div>

<div class="indent">(b) In the twenty-four (24) consecutive months immediately preceding such notice, the total Publisher's share of royalties actually received by Publisher from all sources (including but not limited to performance, mechanical, synchronization, print, and digital) for the Compositions is less than Five Hundred United States Dollars (USD $500.00); and</div>

<div class="indent">(c) Publisher has failed to cure such low-revenue condition within six (6) months after receipt of Writer's written notice specifying the claimed reversion grounds (during which cure period Publisher may continue to exploit the Compositions and attempt to increase revenue).</div>

<div class="indent">Upon reversion under this Section, all rights assigned to Publisher shall immediately revert to Writer free and clear of any claim by Publisher, except for any Derivative Works created and released by Publisher prior to reversion, which shall remain subject to the terms herein (with Publisher retaining 100% of the publisher's share thereof). Publisher shall execute and deliver to Writer any documents reasonably necessary to effectuate such reversion and transfer of rights.</div>

<div class="indent">This reversion right is personal to Writer and non-assignable without Publisher's consent. Publisher's good-faith efforts to exploit the Compositions (including promotion, licensing, and adaptations for congregational use) shall not be deemed a breach for purposes of triggering reversion.</div>

5. **Warranties & Representations**

<div class="indent">Writer warrants that the Compositions are original, do not infringe third-party rights, and Writer has full authority to grant these rights.</div>

6. **Governing Law**<br>
   This Agreement shall be governed by the laws of the State of {{governing_state}}, without regard to conflict of laws principles.

7. **Derivative Works & Alternative Exploitations**

<div class="indent">Publisher shall have the exclusive right to authorize, create, adapt, arrange, edit, translate, modify, and otherwise prepare derivative works based upon the Compositions, including but not limited to alternative arrangements, acoustic versions, instrumental versions, live adaptations, remixes, translations, congregational adaptations, lyric revisions for ministry use, radio edits, featured collaborations, and other derivative versions (collectively, "Derivative Works").</div>

<div class="indent">Publisher may record, authorize, and release such Derivative Works in connection with Publisher's label projects without additional approval from Writer, provided that Writer receives appropriate songwriting credit consistent with Writer's ownership share of the Compositions.</div>

<div class="indent">All Derivative Works shall remain subject to the publishing assignment terms herein, and Publisher shall retain one hundred percent (100%) of the publisher's share of all income derived therefrom.</div>

<div class="indent">Nothing herein shall diminish Writer's retained one hundred percent (100%) writer's share of publishing royalties.</div>

8. **Indemnification**

<div class="indent">Each party (the "Indemnifying Party") agrees to indemnify, defend, and hold harmless the other party (the "Indemnified Party"), its officers, directors, members, employees, agents, successors, and assigns, from and against any and all claims, losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees and court costs) arising out of or resulting from:</div>

<div class="indent">(a) any breach by the Indemnifying Party of any representation, warranty, covenant, or obligation contained in this Agreement;</div>

<div class="indent">(b) any third-party claim alleging infringement of copyright, trademark, or other intellectual property rights in the Compositions (in the case of Writer as Indemnifying Party) or in Publisher's exploitation of the Compositions in accordance with this Agreement (in the case of Publisher as Indemnifying Party), except to the extent caused by the other party's negligence or willful misconduct;</div>

<div class="indent">(c) any negligence or willful misconduct of the Indemnifying Party in connection with this Agreement.</div>

<div class="indent">The Indemnified Party shall promptly notify the Indemnifying Party in writing of any such claim and shall reasonably cooperate with the Indemnifying Party in the defense or settlement thereof (at the Indemnifying Party's expense). The Indemnifying Party shall have the right to control the defense and settlement of any claim, provided that no settlement admitting liability on the part of the Indemnified Party shall be made without the Indemnified Party's prior written consent, which shall not be unreasonably withheld.</div>

<div class="indent">This provision survives termination or expiration of this Agreement.</div>

9. **Entire Agreement**

<div class="indent">This Agreement constitutes the entire understanding and agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, understandings, negotiations, representations, and warranties, whether oral or written, relating to such subject matter. No modification, amendment, or waiver of any provision of this Agreement shall be effective unless in writing and signed by both parties. No course of dealing between the parties nor any delay or omission by either party in exercising any right hereunder shall operate as a waiver of any rights hereunder.</div>

10. **Assignment**

<div class="indent">This Agreement and all rights and obligations hereunder may be assigned by Publisher to any person, entity, or successor in interest (including, without limitation, in connection with a merger, consolidation, sale of all or substantially all assets, or any other change in control of Publisher) without the consent of Writer. Writer may not assign this Agreement or any rights or obligations hereunder without the prior written consent of Publisher, which consent may be withheld in Publisher's sole discretion. This Agreement shall be binding upon and inure to the benefit of the parties hereto and their respective permitted successors and assigns.</div>

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

**Publisher** River and Ember, LLC<br> 

Representative: {{publisher_manager_name}}<br>
Title: {{publisher_manager_title}}<br>
Signature: <span style="color: white;">{{signature:1:y}}</span><br>
Date: <span style="color: white;">{{date:1:y}}</span><br>

**Writer** <br>
Name: {{writer_full_name}}<br>
Signature: <span style="color: white;">{{signature:2:y}}</span><br>
Date: <span style="color: white;">{{date:2:y}}</span><br>

**Exhibit A: Compositions**

| Title                  | ISWC Code              | ASCAP Work ID        | Writers & Shares                              |
|------------------------|------------------------|----------------------|-----------------------------------------------|
{% for song in compositions %}| {{song.title}}         | {% if song.iswc %}{{song.iswc}}{% else %}ISWC CODE{% endif %} | {% if song.ascapWorkId %}{{song.ascapWorkId}}{% else %}—{% endif %} | {{song.writers}}                              |
{% endfor %}

`

const MASTER_REVENUE_SHARE_TEMPLATE = `<div style="display: flex; align-items: center; margin-bottom: 30px; gap: 30px;">
  <img src="{{logo_url}}" alt="River & Ember" style="width: 150px; height: auto; flex-shrink: 0;" />
  <div style="flex: 1;">
    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">MASTER REVENUE SHARE AGREEMENT</h1>
  </div>
</div>

This Agreement is made effective as of {{effective_date}} ("Effective Date"), between **River and Ember, LLC** ("Label"), a {{label_state}} limited liability company with principal place of business at {{label_address}}, and **{{collaborator_full_name}}**, an individual residing at {% if collaborator_address %}{{collaborator_address}}{% else %}<span style="color: red;">[Address not provided]</span>{% endif %} ("Collaborator").

**PLAIN LANGUAGE SUMMARY**  
*This summary is provided to help you understand this agreement. The legal terms below are what actually govern our relationship.*

This agreement covers **master recording rights only** for the song listed in Exhibit A. Here's what that means:
- **River & Ember owns the master recording** - you have no ownership rights to the recording itself
- **You receive {{collaborator_share_percentage}}% of digital revenue** (streaming and downloads only) from the master recording
- **You do NOT receive revenue from** sync licenses, physical sales, live performances, or any other uses - River & Ember keeps 100% of those
- **This does NOT cover publishing rights** - if you're also a songwriter, those are handled in a separate Publishing Assignment Agreement
- **This only applies to this specific song** - you're free to work on other projects
- **Your contribution is work-made-for-hire** - River & Ember owns it from the moment you create it

**RECITALS**  
Label and Collaborator desire to collaborate on a per-song basis for the sound recording titled "{{song_title}}" (the "Recording"). Collaborator shall provide the services and contributions described in Exhibit A attached hereto. This Agreement is limited to this specific song and does not create an exclusive or long-term relationship, preserving Collaborator's freedom to pursue other opportunities.

**AGREEMENT**

1. **Services & Grant of Rights**

<div class="indent">Collaborator shall provide the services and contributions described in Exhibit A. {% if collaborator_role == "Producer" %}Collaborator hereby grants and assigns to Label all right, title, and interest in and to the master sound recording(s) of the Recording (the "Master"), including all worldwide copyright and other proprietary rights therein. Collaborator further grants Label perpetual, worldwide rights to exploit, distribute, promote, and create derivative works from the Master (including alternative versions), and to use Collaborator's name, likeness, voice, and performance in connection therewith. Collaborator acknowledges that this assignment constitutes full transfer of ownership of the Master to Label, and Collaborator shall have no ownership interest therein.{% else %}Collaborator's services and contributions to the Recording are provided as a "work made for hire" under the Copyright Act of 1976, as amended. To the extent that any portion of Collaborator's contribution is not deemed a work made for hire, Collaborator hereby irrevocably assigns to Label all right, title, and interest in and to Collaborator's specific performance and contribution to the Master, including all worldwide copyright and other proprietary rights therein. Collaborator acknowledges that Label owns the entire Master, including all contributions thereto. Collaborator has no ownership, copyright, or other proprietary interest in the Master, whether as a whole or in any part thereof. Collaborator grants Label a perpetual, worldwide, royalty-free license to use Collaborator's name, likeness, voice, image, and biographical information in connection with the exploitation, distribution, promotion, and marketing of the Master and any derivative works thereof.{% endif %}</div>

2. **Compensation – Master Revenue Share**

<div class="indent">In full consideration for Collaborator's services and the assignment of Master rights, Label shall pay Collaborator {{collaborator_share_percentage}}% of Net Receipts from digital revenue streams (streaming and downloads only) derived from exploitation of the Master.</div>

<div class="indent">"Net Receipts" means all monies actually received by Label from digital exploitation of the Master, including but not limited to streaming and download revenue, less any third-party fees, distribution fees, platform fees, mechanical royalties paid on behalf of the Master, taxes, chargebacks, refunds, collection costs, or other customary industry deductions.</div>

<div class="indent">Collaborator shall not be entitled to any revenue from the Master outside of Net Receipts, including but not limited to synchronization licenses, physical sales, live performance fees, direct licensing, merchandise bundling, or any other exploitation. Label retains 100% of such revenue.</div>

<div class="indent">Collaborator's revenue share shall continue for the life of the Master and any renewals or extensions thereof.</div>

<div class="indent">Accounting and payments shall be administered through Label's designated royalty administration platform (currently Wings Access or its successor). Statements and payments issued through such platform shall constitute full accounting under this Agreement.</div>

3. **Alternative Versions**

<div class="indent">Label shall have the sole and exclusive right, but not the obligation, to create, record, produce, exploit, and release alternative versions of the Recording, including but not limited to acoustic versions, instrumental versions, live recordings, radio edits, remixes, featured artist collaborations, translations, edits, or other derivative masters (collectively, "Alternative Versions").</div>

<div class="indent">All Alternative Versions shall be owned exclusively by Label as master recordings separate and distinct from the original Master.</div>

<div class="indent">Unless otherwise agreed in writing in a separate agreement specific to such Alternative Version, Collaborator shall have no right to compensation or revenue participation from Alternative Versions.</div>

<div class="indent">Label may determine, in its sole discretion, the creative direction, release strategy, marketing, distribution, and exploitation of any Alternative Versions.</div>

4. **Publishing**

<div class="indent">This Agreement covers **only master rights** and revenues. Publishing rights for the underlying musical composition(s) are governed by a separate Song-by-Song Publishing Assignment Agreement (if applicable). Collaborator has **no right** to publishing revenue or ownership based on their performance or contribution to the Master under this Agreement. If Collaborator is also a songwriter on the underlying composition, Collaborator's publishing rights and shares (if any) are governed exclusively by a separate Publishing Assignment Agreement with River and Ember, and any publishing revenue or ownership shall be in accordance with the terms of that separate publishing agreement. Collaborator is **not** eligible for master revenue share based on songwriting or composition contributions; such contributions are handled separately through publishing agreements and split sheets. Collaborator retains full control of publishing rights in non-Label songs. This Agreement pertains solely to Master rights and revenues.</div>

5. **Warranties & Representations**

<div class="indent">Collaborator warrants and represents that: (i) Collaborator has full right and authority to grant the rights herein; (ii) Collaborator's contribution is original and does not infringe third-party rights; and (iii) Collaborator will not make any claims inconsistent with Label's ownership of the Master.</div>

6. **Governing Law**

<div class="indent">This Agreement shall be governed by the laws of the State of {{governing_state}}, without regard to conflict of laws principles. Any disputes shall be resolved exclusively in the courts of {{governing_state}}.</div>

7. **Entire Agreement**

<div class="indent">This constitutes the entire understanding between the parties and supersedes all prior agreements. No modifications except in writing signed by both parties.</div>

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

**Label:** River and Ember, LLC <br> 
  
Name: {{publisher_manager_name}}<br>
Title: {{publisher_manager_title}}<br>
Signature: <span style="color: white;">{{signature:1:y}}</span><br>
Date: <span style="color: white;">{{date:1:y}}</span><br><br>
 
**Collaborator:** {{collaborator_full_name}}<br>
Signature: <span style="color: white;">{{signature:2:y}}</span><br>
Date: <span style="color: white;">{{date:2:y}}</span>

**Exhibit A: Song & Recording Details**

| Detail                  | Information                              |
|-------------------------|------------------------------------------|
| Song Title             | {{song_title}}                           |
| ISRC Code              | {% if song_isrc %}{{song_isrc}}{% else %}ISRC CODE{% endif %} |
| Role                   | {{collaborator_role}} ({{collaborator_role_description}}) |
| Specific Services / Contribution | {{services_description}} |
| Revenue Share          | {{collaborator_share_percentage}}% of Net Receipts (digital streaming & downloads only) |

<!-- How to Use:
- Set collaborator_role to "Producer", "Instrumentalist", "Vocalist", or "Featured Artist"
- Fill Exhibit A fields (Title, ISRC, Role, Services, Revenue Share) for each contract
- Producers get full master assignment; performers get work-made-for-hire + performance assignment
- Always use separate publishing/split sheet for songwriting. Do not include song lyrics.
-->
`

/**
 * Template registry mapping contract types to embedded templates
 */
const TEMPLATES: Record<ContractType, string | null> = {
  songwriter_publishing: PUBLISHING_ASSIGNMENT_TEMPLATE,
  digital_master_only: MASTER_REVENUE_SHARE_TEMPLATE,
  producer_agreement: null, // Keep using existing HTML generation for now
  label_record: null, // Keep using existing HTML generation for now
}

/**
 * Load a template (from embedded content)
 */
function loadTemplate(contractType: ContractType): string {
  const template = TEMPLATES[contractType]
  if (!template) {
    throw new Error(`No template available for contract type: ${contractType}`)
  }
  return template
}

/**
 * Check if a contract type has a template
 */
export function hasTemplate(contractType: ContractType): boolean {
  return TEMPLATES[contractType] !== null
}

/**
 * Get the template path for a contract type (for reference only, templates are now embedded)
 */
export function getTemplatePath(contractType: ContractType): string | null {
  // Return a reference path for documentation purposes
  const paths: Record<ContractType, string | null> = {
    songwriter_publishing: "templates/contracts/publishing-assignment.md",
    digital_master_only: "templates/contracts/master-revenue-share.md",
    producer_agreement: null,
    label_record: null,
  }
  return paths[contractType]
}

/**
 * Render a contract template with data
 */
export function renderContractTemplate(
  contractType: ContractType,
  data: Record<string, any>
): string {
  const template = loadTemplate(contractType)
  const rendered = renderTemplate(template, data)
  let html = markdownToHTML(rendered)
  
  // SignWell text tags MUST remain as plain text in the PDF for detection
  // DO NOT wrap them in spans, hide them, or modify them in any way
  // Format: [sig|req|signer1] for signatures, [date|req|signer1] for dates
  // SignWell will automatically detect and replace these tags when text_tags: true is enabled

  return html
}

/**
 * Get template content for a contract type (for preview/editing)
 */
export function getTemplateContent(contractType: ContractType): string | null {
  try {
    return loadTemplate(contractType)
  } catch {
    return null
  }
}

