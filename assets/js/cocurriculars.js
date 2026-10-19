/* Woodward Academy Upper School Cocurricular Guide — activity list.
 * Flags: pe = a full season counts toward the PE graduation requirement (Marching Band, WA athletic teams)
 * Notes are short reminders (audition / invitation / grade limits) taken from the guide. */
(function (root) {
  const G = (cat, arr) => arr.map(a => ({ cat, name: a[0], note: a[1] || '', pe: !!a[2] }));
  const LIST = [].concat(
    G('Academic Clubs & Teams', [
      ['Debate Team', 'Open to students enrolled in a Debate class'], ['German National Honor Society', 'Invitation only'],
      ['Upper School Reading Bowl Team'], ['Math Team', 'Dues $20'], ['Math Club'], ['Model UN', 'Dues $20'],
      ['National Honor Society', 'Invitation only; Grades 11–12; 3.8 Core GPA'], ['Science Olympiad', 'Dues $35'],
      ['Senior Philosophy Seminar', 'Seniors; application in spring'], ['Sociedad Honoraria Hispánica', 'Invitation only'],
      ['Société Honoraire de Français', 'Invitation only; Dues $30'], ['Quill & Scroll', 'Invitation only'], ['Quiz Bowl Team']
    ]),
    G('Performing & Visual Arts', [
      ['Art Club', 'Two semesters of art or prior member; Dues $15'], ['National Art Honor Society'], ['Coffee House'],
      ['Comedy Club', 'Dues $20'], ['Thespian Club', 'Dues $25'], ['Thespian Honor Society', 'Induction after 10 points'],
      ['Fall Theatre Production', 'Audition; Show fee $100'], ['Spring Musical', 'Audition; Show fee $140'],
      ['Regal Eagle Talent Competitions'], ['National Honor Society for Dance Arts', '30 points + 1 year'],
      ['Dance Ensemble', 'Audition only'], ['Marching Band', 'Audition; full season counts toward PE', true],
      ['Big Band', 'Year-long; Tuesdays after school'], ['Jazz Band', 'Audition'], ['Color Guard / Dance Team', 'Audition; open to Upper School girls'],
      ['Camerata Singers', 'Audition; Grades 11–12'], ['Jazz Choir', 'Audition; Grades 9–12'], ['WA Cappella'], ['Private Music Lessons', 'Additional charge']
    ]),
    G('Publications', [
      ['The Blade / butterknife', 'Application'], ['The Phoenix (Yearbook)', 'Application'], ['Silent Voices Literary Arts Magazine']
    ]),
    G('Religious Clubs & Affinity Groups', [
      ['Black Student Union'], ['Caribbean Affinity Club'], ['Catholic Identity Club'], ['Chinese Club', 'Dues $20'],
      ['Fellowship of Christian Athletes', 'Dues $20'], ['French Club', 'Dues $5'], ['German Club'],
      ['Genders & Sexualities Alliance'], ['Japan Club', 'Dues $5'], ['Jewish Student Union'], ['Islamic Awareness Club', 'Dues $10'],
      ['South Asian Affinity Club'], ['Spanish Club', 'Dues $20']
    ]),
    G('Leadership & Service', [
      ['Scouts BSA Troop 631'], ['Interfaith Council'], ['Honor Council & Discipline Board', 'Elected'], ['Honor Guard', 'Invitation & audition'],
      ['Peer Leadership', 'Juniors & seniors; application'], ['Athletic Leadership Council'], ['Big Rocks Student Leadership Committee'],
      ['Student Admissions Ambassadors', 'Application'], ['Student Government Association (SGA)'],
      ['Service Leadership Board', 'Grades 11–12; application'], ['Woodward Serves (WA Serves)'], ['Chick-fil-A Leader Academy']
    ]),
    G('Special Interest Clubs', [
      ['Alternative Investments Club'], ['ASL Club (American Sign Language)'], ['Chess & Games Club'], ['Technology Club'],
      ['Girls Learn International'], ['Cooking Club', 'Dues $20'], ['DECA Club'], ['Dollhouse'], ['Environmental Awareness Club'],
      ['Equestrian Team'], ['HOSA Club'], ['K-Culture Club'], ['Legal Studies Club'], ['Mock Trial Team'], ['Mountain Biking Team'],
      ['My Mind Matters Club (M3)', 'Grades 10–12; application'], ['Outdoors Club', 'Dues $10'], ['Paleontology Club'], ['Pre-Med Club'],
      ['Psychology Club', 'Dues $8'], ['Robotics Club'], ['Scouting Club'], ['Sports Analytics Club'], ['WA Spirit'], ['UNICEF Club'],
      ['WA Global'], ['WA Reads'], ['WA Think Tank']
    ]),
    G('Athletics — Fall', [
      ['Athletic Team Manager (any sport)'], ['Cross Country', 'Full season counts toward PE', true],
      ['Football / Gameday Competition Cheerleading', 'Full season counts toward PE', true], ['Football', 'Full season counts toward PE', true],
      ['Flag Football', 'Full season counts toward PE', true], ['Volleyball (Girls)', 'Full season counts toward PE', true],
      ['Softball (Girls)', 'Full season counts toward PE', true], ['Riflery', 'Co-ed; full season counts toward PE', true],
      ['Clay Target Team', 'Co-ed; full season counts toward PE', true]
    ]),
    G('Athletics — Winter', [
      ['Boys Basketball', 'Full season counts toward PE', true], ['Girls Basketball', 'Full season counts toward PE', true],
      ['Basketball Cheerleading', 'Full season counts toward PE', true], ['Swimming & Diving (Boys & Girls)', 'No-cut; counts toward PE', true],
      ['Boys Wrestling', 'Full season counts toward PE', true], ['Girls Wrestling', 'Full season counts toward PE', true],
      ['Wrestlerettes', 'Full season counts toward PE', true]
    ]),
    G('Athletics — Spring', [
      ['Boys Soccer', 'Full season counts toward PE', true], ['Girls Soccer', 'Full season counts toward PE', true],
      ['Boys Golf', 'Full season counts toward PE', true], ['Girls Golf', 'Full season counts toward PE', true],
      ['Boys Tennis', 'Full season counts toward PE', true], ['Girls Tennis', 'Full season counts toward PE', true],
      ['Track & Field (Boys & Girls)', 'Full season counts toward PE', true], ['Baseball', 'Full season counts toward PE', true],
      ['Boys Lacrosse', 'Full season counts toward PE', true], ['Girls Lacrosse', 'Full season counts toward PE', true],
      ['Boys Ultimate Frisbee', 'Full season counts toward PE', true], ['Girls Ultimate Frisbee', 'Full season counts toward PE', true],
      ['Esports', 'Full season counts toward PE', true]
    ])
  );
  const STATUS = [
    { v: 'active', label: 'Currently participating' },
    { v: 'interest', label: 'Interested in exploring' }
  ];
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['cocurriculars.js'] = '1';
  WA.cocurr = { list: LIST, STATUS };
  if (typeof module !== 'undefined') module.exports = WA.cocurr;
})(typeof globalThis !== 'undefined' ? globalThis : this);
