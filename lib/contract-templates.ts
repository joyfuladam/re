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
    <h1 style="margin: 0; font-size: 20px;">Project-Specific Full Publishing Assignment Agreement Template</h1>
  </div>
</div>

**PROJECT-SPECIFIC PUBLISHING ASSIGNMENT AGREEMENT**

This Agreement is made effective as of {{effective_date}} ("Effective Date"), between **River and Ember, LLC** ("Publisher"), a {{publisher_state}} limited liability company with principal place of business at {{publisher_address}}, and **{{writer_full_name}}**, an individual residing at {% if writer_address %}{{writer_address}}{% else %}<span style="color: red;">[Writer address not provided]</span>{% endif %} ("Writer").

**RECITALS**  
Writer has created certain musical compositions for recording and release under Publisher's label projects. Publisher desires to administer publishing rights in those compositions to maximize congregational and global impact.

**AGREEMENT**

1. **Assignment of Publishing Rights**

<div class="indent">Writer hereby irrevocably and exclusively assigns to Publisher one hundred percent (100%) of the worldwide publisher's share (including but not limited to performance, mechanical, synchronization, print, and all other royalties) in and to the musical compositions listed in Exhibit A attached hereto (the "Compositions"), which are created for and recorded/released under Publisher's label projects. Writer retains one hundred percent (100%) of the writer's share of all royalties, which shall be paid directly to Writer by Writer's performing rights organization (e.g., ASCAP, BMI, SESAC) without interference from Publisher.</div>

2. **Scope & Project-Specific Nature**

<div class="indent">This assignment applies **solely** to the Compositions listed in Exhibit A (and any approved revisions). Writer retains full publishing rights in all other compositions not created for or released under Publisher's projects.</div>

3. **Term**

<div class="indent">Perpetual, subject to reversion to Writer upon {{reversion_condition}}.</div>

4. **Administration**

<div class="indent">Publisher shall administer the assigned rights worldwide through its chosen publishing administrator (e.g., Sentric Music). Publisher shall account to Writer quarterly for Publisher's collected share (for transparency only—no payment due to Writer from publisher's share).</div>

5. **Morals & Conduct Clause**

<div class="indent">Writer agrees to conduct themselves, both publicly and privately, in a manner consistent with biblical Christian principles. Material breach (as reasonably determined by Publisher, e.g., public conduct contrary to Scripture) shall allow Publisher immediate termination of this Agreement and reversion of rights to Writer.</div>

6. **Warranties & Representations**

<div class="indent">Writer warrants that the Compositions are original, do not infringe third-party rights, and Writer has full authority to grant these rights.</div>

7. **Governing Law**<br>
   This Agreement shall be governed by the laws of the State of {{governing_state}}, without regard to conflict of laws principles.

8. **Alternative Versions & Expanded Releases**

<div class="indent">Publisher, at its discretion and expense, may create, record, and release alternative versions of the Compositions (including but not limited to acoustic, instrumental, live, radio edit, or featured artist collaborations) to enhance visibility, congregational adoption, and revenue potential. Such versions shall be subject to the same publishing assignment terms herein. Publisher will consult with Writer on creative decisions where practicable and credit Writer appropriately. This provision is intended to maximize the Compositions' ministry impact through diverse formats suitable for church use, streaming, and sync opportunities.</div>

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

| Title                  | Writers & Shares                              |
|------------------------|-----------------------------------------------|
{% for song in compositions %}| {{song.title}}         | {{song.writers}}                              |
{% endfor %}

`

const MASTER_REVENUE_SHARE_TEMPLATE = `<div style="display: flex; align-items: center; margin-bottom: 30px; gap: 30px;">
  <img src="{{logo_url}}" alt="River & Ember" style="width: 150px; height: auto; flex-shrink: 0;" />
  <div style="flex: 1;">
    <h1 style="margin: 0; font-size: 20px;">Song-by-Song Master Revenue Share Agreement Template</h1>
  </div>
</div>

**MASTER REVENUE SHARE AGREEMENT**

This Agreement is made effective as of {{effective_date}} ("Effective Date"), between **River and Ember, LLC** ("Label"), a {{label_state}} limited liability company with principal place of business at {{label_address}}, and **{{artist_full_name}}**, an individual residing at {% if artist_address %}{{artist_address}}{% else %}<span style="color: red;">[Address not provided]</span>{% endif %} ({% if is_musician %}"Musician"{% else %}{% if is_producer %}"Producer"{% else %}"Artist"{% endif %}{% endif %}).

**RECITALS**  
{% if is_musician %}Label and Musician desire to collaborate on a per-song basis for the sound recording titled "{{song_title}}" (the "Recording"). Musician shall provide instrumental performance services for the Recording. This Agreement is limited to this specific song and does not create an exclusive or long-term relationship, preserving Musician's freedom to pursue other opportunities.{% else %}{% if is_producer %}Label and Producer desire to collaborate on a per-song basis for the sound recording titled "{{song_title}}" (the "Recording"). Producer shall provide production, arrangement, and creative direction services for the Recording. This Agreement is limited to this specific song and does not create an exclusive or long-term relationship, preserving Producer's freedom to pursue other opportunities.{% else %}Label and Artist desire to collaborate on a per-song basis for the sound recording titled "{{song_title}}" (the "Recording"). Artist shall provide lead performance and creative input for the Recording. This Agreement is limited to this specific song and does not create an exclusive or long-term relationship, preserving Artist's freedom to pursue other opportunities.{% endif %}{% endif %}

**AGREEMENT**

1. **Services & Grant of Rights**

<div class="indent">{% if is_musician %}Musician shall provide instrumental performance services for the Recording. Musician hereby grants and assigns to Label all right, title, and interest in and to the master sound recording(s) of the Recording (the "Master"), including all worldwide copyright and other proprietary rights therein. Musician further grants Label perpetual, worldwide rights to exploit, distribute, promote, and create derivative works from the Master (including alternative versions), and to use Musician's name, likeness, voice, and performance in connection therewith. Musician acknowledges that this assignment constitutes full transfer of ownership of the Master to Label, and Musician shall have no ownership interest therein.{% else %}{% if is_producer %}Producer shall provide production, arrangement, and creative direction services for the Recording. Producer hereby grants and assigns to Label all right, title, and interest in and to the master sound recording(s) of the Recording (the "Master"), including all worldwide copyright and other proprietary rights therein. Producer further grants Label perpetual, worldwide rights to exploit, distribute, promote, and create derivative works from the Master (including alternative versions), and to use Producer's name, likeness, voice, and performance in connection therewith. Producer acknowledges that this assignment constitutes full transfer of ownership of the Master to Label, and Producer shall have no ownership interest therein.{% else %}Artist shall provide lead performance and creative input for the Recording. Artist hereby grants and assigns to Label all right, title, and interest in and to the master sound recording(s) of the Recording (the "Master"), including all worldwide copyright and other proprietary rights therein. Artist further grants Label perpetual, worldwide rights to exploit, distribute, promote, and create derivative works from the Master (including alternative versions), and to use Artist's name, likeness, voice, and performance in connection therewith. Artist acknowledges that this assignment constitutes full transfer of ownership of the Master to Label, and Artist shall have no ownership interest therein.{% endif %}{% endif %}</div>

2. **Compensation - Master Revenue Share**

<div class="indent">In full consideration for {% if is_musician %}Musician's{% else %}{% if is_producer %}Producer's{% else %}Artist's{% endif %}{% endif %} services and the assignment of Master rights, Label shall pay {% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} {{artist_share_percentage}}% of Net Receipts from digital revenue streams (streaming and downloads). "Net Receipts" means all monies actually received by Label from any source attributable to the digital exploitation of the Master (including streaming and downloads), less any third-party fees, taxes, returns, or customary deductions.  

{% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} shall **not** be entitled to any revenue from the Master outside of Net Receipts, including but not limited to synchronization licenses, physical sales, live performance fees, direct licensing, or any other exploitation. Label retains 100% of such revenue to fund future ministry projects and Label operations.</div>

3. **Alternative Versions**

<div class="indent">Label may, at its sole discretion and expense, create, record, and release alternative versions of the Recording (including but not limited to acoustic, instrumental, live, radio edits, or featured artist collaborations) to enhance visibility, congregational adoption, church usage (e.g., CCLI), and revenue potential. All such versions shall be owned exclusively by Label. Alternative versions will be subject to separate contracts specific to those arrangements, and shall not be subject to the revenue share terms of this Agreement. Label will consult with {% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} on creative decisions where practicable and provide appropriate credit.</div>

4. **Publishing**

<div class="indent">Publishing rights for the underlying musical composition(s) are governed by separate Song-by-Song Publishing Assignment Agreement (if applicable). {% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} retains full control of publishing rights in non-Label songs. This Agreement pertains solely to Master rights and revenues.</div>

5. **Conduct Standards**

<div class="indent">{% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} agrees to conduct themselves, both publicly and privately, in a manner consistent with biblical Christian principles during the term of this Agreement and in connection with promotion of the Recording. {% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} understands that any public conduct reasonably deemed by Label to be materially inconsistent with such principles may impact Label's willingness to collaborate on future projects, though it shall not affect Label's perpetual ownership of the Master or rights hereunder.</div>

6. **Warranties & Representations**

<div class="indent">{% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} warrants and represents that: (i) {% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} has full right and authority to grant the rights herein; (ii) the {% if is_musician %}performance{% else %}{% if is_producer %}production work{% else %}performance{% endif %}{% endif %} is original and does not infringe third-party rights; and (iii) {% if is_musician %}Musician{% else %}{% if is_producer %}Producer{% else %}Artist{% endif %}{% endif %} will not make any claims inconsistent with Label's ownership of the Master.</div>

7. **Governing Law**

<div class="indent">This Agreement shall be governed by the laws of the State of {{governing_state}}, without regard to conflict of laws principles. Any disputes shall be resolved exclusively in the courts of {{governing_state}}.</div>

8. **Entire Agreement**

<div class="indent">This constitutes the entire understanding between the parties and supersedes all prior agreements. No modifications except in writing signed by both parties.</div>

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

**Label:** River and Ember, LLC <br> 
  
Name: {{publisher_manager_name}}<br>
Title: {{publisher_manager_title}}<br>
Signature: <span style="color: white;">{{signature:1:y}}</span><br>
Date: <span style="color: white;">{{date:1:y}}</span><br><br>
 
**Collaborator Name:** {{artist_full_name}}<br>
Signature: <span style="color: white;">{{signature:2:y}}</span><br>
Date: <span style="color: white;">{{date:2:y}}</span>

**Exhibit A: Song & Recording Details**

| Detail                  | Information                              |
|-------------------------|------------------------------------------|
| Song Title             | {{song_title}}                           |
| Share           | {{artist_share_percentage}}% of Net Receipts |
| Role            | {{artist_role_description}}              |
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

