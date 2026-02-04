# Project-Specific Full Publishing Assignment Agreement Template

**PROJECT-SPECIFIC PUBLISHING ASSIGNMENT AGREEMENT**

This Agreement is made effective as of {{effective_date}} ("Effective Date"), between **River and Ember, LLC** ("Publisher"), a {{publisher_state}} limited liability company with principal place of business at {{publisher_address}}, and **{{writer_full_name}}**, an individual residing at {% if writer_address %}{{writer_address}}{% else %}<span style="color: red;">[Writer address not provided]</span>{% endif %} ("Writer").

**RECITALS**  
Writer has created certain musical compositions for recording and release under Publisher's label projects. Publisher desires to administer publishing rights in those compositions to maximize congregational and global impact.

**AGREEMENT**

1. **Assignment of Publishing Rights**  
   Writer hereby irrevocably and exclusively assigns to Publisher one hundred percent (100%) of the worldwide publisher's share (including but not limited to performance, mechanical, synchronization, print, and all other royalties) in and to the musical compositions listed in Exhibit A attached hereto (the "Compositions"), which are created for and recorded/released under Publisher's label projects. Writer retains one hundred percent (100%) of the writer's share of all royalties, which shall be paid directly to Writer by Writer's performing rights organization (e.g., ASCAP, BMI, SESAC) without interference from Publisher.

2. **Scope & Project-Specific Nature**  
   This assignment applies **solely** to the Compositions listed in Exhibit A (and any approved revisions). Writer retains full publishing rights in all other compositions not created for or released under Publisher's projects.

3. **Term**  
   Perpetual, subject to reversion to Writer upon {{reversion_condition}}.

4. **Administration**  
   Publisher shall administer the assigned rights worldwide through its chosen publishing administrator (e.g., Sentric Music). Publisher shall account to Writer quarterly for Publisher's collected share (for transparency only—no payment due to Writer from publisher's share).

5. **Morals & Conduct Clause**  
   Writer agrees to conduct themselves, both publicly and privately, in a manner consistent with biblical Christian principles. Material breach (as reasonably determined by Publisher, e.g., public conduct contrary to Scripture) shall allow Publisher immediate termination of this Agreement and reversion of rights to Writer.

6. **Warranties & Representations**  
   Writer warrants that the Compositions are original, do not infringe third-party rights, and Writer has full authority to grant these rights.

7. **Governing Law**  
   This Agreement shall be governed by the laws of the State of {{governing_state}}, without regard to conflict of laws principles.

8. **Alternative Versions & Expanded Releases**  
   Publisher, at its discretion and expense, may create, record, and release alternative versions of the Compositions (including but not limited to acoustic, instrumental, live, radio edit, or featured artist collaborations) to enhance visibility, congregational adoption, and revenue potential. Such versions shall be subject to the same publishing assignment terms herein. Publisher will consult with Writer on creative decisions where practicable and credit Writer appropriately. This provision is intended to maximize the Compositions' ministry impact through diverse formats suitable for church use, streaming, and sync opportunities.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

**Publisher:** River and Ember, LLC  

Name: {{publisher_manager_name}}<br>
Title: {{publisher_manager_title}}<br>
Signature: <span style="color: white;">{{signature:1:y}}</span><br>
Date: <span style="color: white;">{{date:1:y}}</span>

**Writer:**  

Name: {{writer_full_name}}<br>
Signature: <span style="color: white;">{{signature:2:y}}</span><br>
Date: <span style="color: white;">{{date:2:y}}</span>

**Exhibit A: Compositions**

| Title                  | Writers & Shares                              |
|------------------------|-----------------------------------------------|
{% for song in compositions %}| {{song.title}}         | {{song.writers}}                              |
{% endfor %}


