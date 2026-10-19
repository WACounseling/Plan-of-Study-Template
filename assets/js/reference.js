/* Page-2 / reference content. Sources: WA Upper School Scheduling & Curriculum Guide 2026-2027,
 * Georgia DOE / GAfutures (state graduation + HOPE / Zell Miller), NCAA Eligibility Center (checked Oct 2026).
 * Each section: { title, col: 0|1, rows: [[label, value]]  OR  items: [text] }  — shared by the web page and the Google Doc. */
(function (root) {
  const R = {
    updated: 'October 2026',
    disclaimer: {
      title: 'Projected Schedule — Subject to Change',
      text: 'This plan is a projection only and does not guarantee placement in any course or course availability. It may change based on student interests, academic performance, prerequisites and approvals, course availability and enrollment, scheduling, and course changes or sequence restructuring. The current Scheduling & Curriculum Guide governs. Please review this plan with your counselor each year.'
    },
    sections: [
      {
        title: 'Woodward Academy Graduation Requirements', col: 0,
        rows: [['English', '4 units — English 1, 2, 3, 4 (or AP)'], ['Mathematics', '4 units — Algebra 1 or higher; four consecutive years'],
          ['Social Studies', '3 units — U.S. Gov/Econ, Modern World History, U.S. History'], ['Science', '4 units — Biology, Chemistry + 2 more'],
          ['World Language', '2 units — two consecutive years of the same language'], ['Physical Education', '½ unit — complete by end of semester 6'],
          ['Fine Arts', '½ unit — visual or performing art'], ['Compassion Capstone', '½ unit — senior course (see capstone list in the guide)'],
          ['Electives', '3.5 units — core or non-core'], ['TOTAL', '22 units minimum']],
        items: ['One unit = two semesters. Seven-period rotating schedule; at least 6 graded subjects and 4 core-discipline subjects every semester.',
          'Middle School math, social studies and language do not earn U.S. credit; WA 8th-grade Physical Science earns ½ unit per semester. Students who completed HP Civics in 8th grade skip Gov/Econ but still need 3 SS units.',
          'PE can be met with Physical Conditioning, Dance Fitness, year-long dance, one full Marching Band season, or one full WA sports season.',
          'R period (grades 11–12) requires PE and Fine Arts to be complete.']
      },
      {
        title: 'State of Georgia Graduation Requirements', col: 0,
        rows: [['English / Language Arts', '4'], ['Mathematics', '4'], ['Science', '4'], ['Social Studies', '3'],
          ['CTAE and/or Modern Language and/or Fine Arts', '3'], ['Health & Physical Education', '1'], ['Electives', '4'], ['TOTAL', '23 units']],
        items: ['Georgia DOE minimums for public high schools; the 4th science unit may also count as an elective. WA\'s core requirements meet or exceed the state core areas.',
          'University System of Georgia admission expects 4 English, 4 math, 4 science, 3 social science and 2 years of the same world language.']
      },
      {
        title: 'GHSA / GISA Athletic Eligibility', col: 0,
        items: ['Passing 2.5 Carnegie units the semester before the season.', 'Units earned by end of grade 9: 5 · grade 10: 11 · grade 11: 17 · graduation: 22.']
      },
      {
        title: 'GPA, Honors & Distinctions', col: 0,
        rows: [['Weighting (A / B / C)', 'AP 5.0 / 4.0 / 3.0 · HP 4.8 / 3.8 / 2.8 · EP 4.4 / 3.4 / 2.4 · CP 4.3 / 3.3 / 2.3 (D = 1.0)'],
          ['Summa Cum Laude', '11 semesters HP/AP core (grade 11 fall–grade 12 fall) · 4.10 Core GPA'], ['Magna Cum Laude', '8 semesters · 3.80'], ['Cum Laude', '5 semesters · 3.50'],
          ['National Honor Society', 'Grades 11–12 · 3.80 Core GPA + scholarship, leadership, service, character'], ['Eagle Roll', 'Gold 4.0 · Silver 3.5 (no grade below D)']],
        items: ['Graduation Distinctions — Global Studies, Service Learning, Sustainability, Media: apply by Feb 1 of 10th grade (Sustainability: Nov 1, 3.3 Core GPA).',
          'Core GPA includes English, math, science, social studies, world language and AP courses in any department. Academic hold if semester Core GPA is below 2.30.']
      },
      {
        title: 'Course-Load Rules (Grades 9–12)', col: 0,
        items: ['Grade 9: no AP; no more than 5 core classes. Grade 10: no more than 2 AP. Grades 11–12: no more than 5 AP.',
          'No student may take 6–7 AP courses or 7 core classes. 5 AP, or a mix of 6 AP/HP, needs all department chairs and the Academic Dean.',
          'Summer forward credit: one year of credit per year (max 3 credits, max 2 away from WA per discipline); pre-approval required.',
          'Drop/add closes after the first full 7-day rotation of the semester. AP students sit the AP exam in May.']
      },
      {
        title: 'Georgia HOPE & Zell Miller Scholarships', col: 1,
        rows: [['HOPE', 'Georgia resident · 3.0 HOPE GPA · 4 rigor courses'],
          ['Zell Miller', '3.7 HOPE GPA · 4 rigor courses · SAT 1200 (one sitting) or ACT 25 (re-set each January) — or Valedictorian/Salutatorian'],
          ['HOPE GPA', 'Calculated only by GSFC from core academic courses on a 4.0 scale: A 4.0 · B 3.0 · C 2.0 · D 1.0 (CP/EP/HP). AP: B 3.5 · C 2.5 · D 1.5; an A in AP stays 4.0.']],
        items: ['Rigor credits come from advanced math, advanced science, world language and AP core courses on the Academic Rigor Course List (gafutures.org). Dropping rigor courses can cost eligibility.',
          'Create a GAfutures account; WA sends transcripts to GSFC each February (juniors/seniors) and June. Apply with the GSFAPP or FAFSA. College GPA checkpoints apply (3.0 HOPE · 3.3 Zell).',
          'WA cannot calculate a "potential" HOPE GPA — check My High School HOPE GPA on GAfutures.']
      },
      {
        title: 'NCAA Eligibility (Division I & II)', col: 1,
        rows: [['Division I', '16 core: 4 English · 3 math · 2 science · 1 more E/M/S · 2 social science · 4 more. Core GPA 2.3. 10 courses (7 in E/M/S) locked in before semester 7.'],
          ['Division II', '16 core: 3 English · 2 math · 2 science · 3 more E/M/S · 2 social science · 4 more. Core GPA 2.2.'], ['Division III', 'Sets its own academic standards.']],
        items: ['Register with the NCAA Eligibility Center (web3.ncaa.org/ecwr3) — no later than April of junior year; earlier is better. Standardized-test scores are not currently required for NCAA eligibility.',
          'Only courses marked NCAA Approved in the WA Guide count; the NCAA GPA differs from the WA transcript GPA. Not every online course is accepted.',
          'Tell your counselor in 9th grade if you hope to play in college; request a transcript release form from the Counseling Office (Room 114). Coursework from any other school must also be sent to the NCAA.']
      },
      {
        title: 'College Planning & Key Dates', col: 1,
        items: ['College counseling begins fall of junior year; pre-graduation check with your school counselor in junior year (GPA, honors, senior schedule).',
          'Many colleges want 4 years of social studies and science and 3–4 of the same language — use electives accordingly.',
          'Spring scheduling: course requests due in the portal in late April; draft schedules arrive in early July.',
          'Failing math or English in any semester requires summer school; two Ds in math or English requires 20 hours of summer tutoring.']
      },
      {
        title: 'Helpful Links & Contacts', col: 1,
        items: ['Academic Dean: Stephanie Stephens · stephanie.stephens@woodward.edu · Registrar: Kechia Minter',
          'Student Activities: Chris Myers · chris.myers@woodward.edu',
          'ghsa.net · web3.ncaa.org/ecwr3 · ncaa.org · gafutures.org · usg.edu · gadoe.org',
          'This plan is a planning tool. The WA Scheduling & Curriculum Guide and the Academic Dean\'s office govern. Requirements can change.']
      }
    ]
  };
  const WA = root.WA = root.WA || {};
  WA.reference = R;
  if (typeof module !== 'undefined') module.exports = R;
})(typeof globalThis !== 'undefined' ? globalThis : this);
