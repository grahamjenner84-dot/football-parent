# SEO opportunities - 2026-07-17

## Before touching any of these pages

- One change at a time. Pick a single lever (title, one section, one internal
  link) per page per edit - not a combined rewrite. If something moves,
  ranking or CTR, you need to know which change did it.
- Commit before you edit, on its own commit, so a bad change is a single
  `git revert` away. Don't bundle an SEO tweak into an unrelated commit.
- Don't touch the URL/slug of a page that's already ranking or getting
  clicks, ever, unless that's explicitly the point of the change.
- Don't remove existing headings, internal links, or content sections.
  Additive and targeted beats restructuring.
- After publishing, that page goes on a watch list for 10-14 days before any
  further changes. If clicks or position drop, revert immediately rather
  than trying to fix forward.
- Pages with zero or near-zero current clicks (most striking_distance and
  cannibalisation entries) carry less risk since there's little to lose -
  low_ctr and decay entries on pages with real existing clicks carry more,
  treat those more conservatively.

## striking distance

- **https://www.footballparent.co.uk/parent-guides/what-is-grassroots-football**
  - query: grassroots football, position: 14.1
  - impressions: 173, clicks: 1
  - file: `app\parent-guides\what-is-grassroots-football\page.tsx`
  - content: `content\parent-guides\what-is-grassroots-football.mdx`
- **https://www.footballparent.co.uk/parent-guides/what-is-grassroots-football**
  - query: what does grassroots football mean, position: 17.5
  - impressions: 36, clicks: 0
  - file: `app\parent-guides\what-is-grassroots-football\page.tsx`
  - content: `content\parent-guides\what-is-grassroots-football.mdx`

## low ctr

- **https://www.footballparent.co.uk/football-gear/best-footballs-by-age**
  - impressions: 1907, clicks: 15
  - file: `app\football-gear\best-footballs-by-age\page.tsx`
  - content: `content\football-gear\best-footballs-by-age.mdx`
  - current title: "Football Sizes by Age: Best Footballs For Kids"
  - current meta description: "Find out what size football your child needs by age group, including UK guidance for mini soccer, youth football and older players."
- **https://www.footballparent.co.uk/academy-pathway/what-is-eppp**
  - impressions: 1510, clicks: 8
  - file: `app\academy-pathway\what-is-eppp\page.tsx`
  - content: `content\academy-pathway\what-is-eppp.mdx`
  - current title: "What Is EPPP in Football?"
  - current meta description: "EPPP stands for Elite Player Performance Plan. Here is what it means in academy football, including categories, coaching hours, player movement and what parents need to know."
- **https://www.footballparent.co.uk/academy-pathway/academy-categories-explained**
  - impressions: 1434, clicks: 23
  - file: `app\academy-pathway\academy-categories-explained\page.tsx`
  - content: `content\academy-pathway\academy-categories-explained.mdx`
  - current title: "Category 1, 2, 3 and 4 Football Academies Explained"
  - current meta description: "What's the difference between a Category 1 and Category 4 football academy? Here's what each level means for training hours, facilities, travel demands and your child's development."
- **https://www.footballparent.co.uk/parent-guides/what-is-the-junior-premier-league**
  - impressions: 1361, clicks: 16
  - file: `app\parent-guides\what-is-the-junior-premier-league\page.tsx`
  - content: `content\parent-guides\what-is-the-junior-premier-league.mdx`
  - current title: "What Is the Junior Premier League (JPL)?"
  - current meta description: "An independent guide to the Junior Premier League: who runs it, how it works, age groups, costs, travel, and what standard of football your child can expect."
- **https://www.footballparent.co.uk/parent-guides/what-is-grassroots-football**
  - impressions: 1225, clicks: 7
  - file: `app\parent-guides\what-is-grassroots-football\page.tsx`
  - content: `content\parent-guides\what-is-grassroots-football.mdx`
  - current title: "What Is Grassroots Football?"
  - current meta description: "What grassroots football actually means, what ages it covers, who runs it and how it differs from academy football. A clear guide for UK parents."
- **https://www.footballparent.co.uk/academy-pathway/how-academy-football-works**
  - impressions: 782, clicks: 10
  - file: `app\academy-pathway\how-academy-football-works\page.tsx`
  - content: `content\academy-pathway\how-academy-football-works.mdx`
  - current title: "How Academy Football Works in the UK"
  - current meta description: "Learn what a football academy is, how football academies work in England, how children progress through the academy pathway, and what parents should expect at every stage."
- **https://www.footballparent.co.uk/academy-pathway/how-much-does-academy-football-cost**
  - impressions: 676, clicks: 12
  - file: `app\academy-pathway\how-much-does-academy-football-cost\page.tsx`
  - content: `content\academy-pathway\how-much-does-academy-football-cost.mdx`
  - current title: "How Much Does Academy Football Cost?"
  - current meta description: "Are football academies free? Learn how much football academy really costs, what parents pay for, and the hidden expenses most families don't expect."
- **https://www.footballparent.co.uk/parent-guides/jpl-vs-grassroots-football**
  - impressions: 653, clicks: 17
  - file: `app\parent-guides\jpl-vs-grassroots-football\page.tsx`
  - content: `content\parent-guides\jpl-vs-grassroots-football.mdx`
  - current title: "JPL vs Grassroots Football: Which Is Right for Your Child?"
  - current meta description: "Is JPL better than grassroots football? A practical parent comparison covering coaching, match standard, playing time, costs, travel, development and family commitment."
- **https://www.footballparent.co.uk/parent-guides/how-to-get-into-the-jpl**
  - impressions: 637, clicks: 10
  - file: `app\parent-guides\how-to-get-into-the-jpl\page.tsx`
  - content: `content\parent-guides\how-to-get-into-the-jpl.mdx`
  - current title: "JPL Trials: How Do You Get Into the Junior Premier League?"
  - current meta description: "Learn how JPL trials work, how to join a Junior Premier League club, what coaches look for, typical costs and what parents should expect from the recruitment process."
- **https://www.footballparent.co.uk/girls-football/emerging-talent-centres-explained**
  - impressions: 594, clicks: 15
  - file: `app\girls-football\emerging-talent-centres-explained\page.tsx`
  - content: `content\girls-football\emerging-talent-centres-explained.mdx`
  - current title: "Emerging Talent Centres (ETCs) Explained"
  - current meta description: "What are Emerging Talent Centres in girls' football? A clear guide to how ETCs work, how recruitment happens, where they fit in the current FA girls' pathway, and what replaced RTCs."
- **https://www.footballparent.co.uk/academy-pathway/understanding-academy-release**
  - impressions: 314, clicks: 6
  - file: `app\academy-pathway\understanding-academy-release\page.tsx`
  - content: `content\academy-pathway\understanding-academy-release.mdx`
  - current title: "Understanding Academy Release In Football"
  - current meta description: "A parent guide to being released from a football academy, including what happens at a release meeting, emotional support and practical next steps."
- **https://www.footballparent.co.uk/parent-guides/leave-grassroots-football-for-an-academy**
  - impressions: 292, clicks: 3
  - file: `app\parent-guides\leave-grassroots-football-for-an-academy\page.tsx`
  - content: `content\parent-guides\leave-grassroots-football-for-an-academy.mdx`
  - current title: "Should My Child Leave Grassroots Football For An Academy?"
  - current meta description: "Should your child leave grassroots football for an academy? Compare the coaching, commitment, pressure, travel and development benefits before deciding."
- **https://www.footballparent.co.uk/academy-pathway/can-academy-players-play-grassroots-football**
  - impressions: 278, clicks: 8
  - file: `app\academy-pathway\can-academy-players-play-grassroots-football\page.tsx`
  - content: `content\academy-pathway\can-academy-players-play-grassroots-football.mdx`
  - current title: "Can Academy Players Play Grassroots Football?"
  - current meta description: "Parents often ask whether academy players can continue playing grassroots football. Here's what the rules say, how clubs approach it, and what actually happens in practice."
- **https://www.footballparent.co.uk/parent-guides/jpl-and-academy-football**
  - impressions: 204, clicks: 4
  - file: `app\parent-guides\jpl-and-academy-football\page.tsx`
  - content: `content\parent-guides\jpl-and-academy-football.mdx`
  - current title: "Does the Junior Premier League Lead to Academy Football?"
  - current meta description: "A realistic guide for parents on whether JPL football helps children get scouted, how academy recruitment works, and what actually matters."
- **https://www.footballparent.co.uk/girls-football/what-age-do-girls-football-academies-recruit**
  - impressions: 165, clicks: 5
  - file: `app\girls-football\what-age-do-girls-football-academies-recruit\page.tsx`
  - content: `content\girls-football\what-age-do-girls-football-academies-recruit.mdx`
  - current title: "What Age Do Girls Football Academies Recruit?"
  - current meta description: "Understanding the recruitment ages and pathway stages within girls academy football in the UK."
- **https://www.footballparent.co.uk/football-development/improve-football-decision-making**
  - impressions: 162, clicks: 1
  - file: `app\football-development\improve-football-decision-making\page.tsx`
  - content: `content\football-development\improve-football-decision-making.mdx`
  - current title: "How To Improve Football Decision Making In Young Players"
  - current meta description: "Decision making is one of the most important skills in youth football - and one of the hardest to coach. Here's how parents and coaches can help young players think faster and clearer on the pitch."
- **https://www.footballparent.co.uk/academy-pathway/how-to-join-a-football-academy**
  - impressions: 132, clicks: 0
  - file: `app\academy-pathway\how-to-join-a-football-academy\page.tsx`
  - content: `content\academy-pathway\how-to-join-a-football-academy.mdx`
  - current title: "How to Join a Football Academy: A Realistic Guide for Parents"
  - current meta description: "Learn how to join a football academy, how to get into academy football, how clubs recruit young players and what parents can realistically do to improve their child's chances."
- **https://www.footballparent.co.uk/academy-trials/what-do-academy-coaches-look-for**
  - impressions: 130, clicks: 0
  - file: `app\academy-trials\what-do-academy-coaches-look-for\page.tsx`
  - content: `content\academy-trials\what-do-academy-coaches-look-for.mdx`
  - current title: "What Do Academy Coaches Look For?"
  - current meta description: "A breakdown of the technical, physical and behavioural traits academy coaches assess in young players."
- **https://www.footballparent.co.uk/academy-pathway/football-scholarships-uk**
  - impressions: 126, clicks: 3
  - file: `app\academy-pathway\football-scholarships-uk\page.tsx`
  - content: `content\academy-pathway\football-scholarships-uk.mdx`
  - current title: "Football Scholarships UK: What Parents Need to Know"
  - current meta description: "A clear guide to football scholarships in the UK. Understand the difference between academy scholarships, college programmes and education pathways for young footballers aged 16 to 18."
- **https://www.footballparent.co.uk/football-development/is-private-football-coaching-worth-it**
  - impressions: 90, clicks: 1
  - file: `app\football-development\is-private-football-coaching-worth-it\page.tsx`
  - content: `content\football-development\is-private-football-coaching-worth-it.mdx`
  - current title: "Private Football Coaching: Is 1-to-1 Football Coaching Worth It?"
  - current meta description: "Thinking about private football coaching or 1-to-1 football coaching? Learn when it helps, what it costs, how to choose a coach and whether it's worth it for young players."
- **https://www.footballparent.co.uk/parent-guides**
  - impressions: 77, clicks: 0
  - file: `app\parent-guides\page.tsx`
  - current title: "Parent Guides | Football Parent"
  - current meta description: "Independent football parenting advice covering academy decisions, the Junior Premier League, player development, confidence, matchday behaviour and supporting young players."
- **https://www.footballparent.co.uk/academy-pathway/arsenal-development-centre-guide**
  - impressions: 76, clicks: 0
  - file: `app\academy-pathway\arsenal-development-centre-guide\page.tsx`
  - content: `content\academy-pathway\arsenal-development-centre-guide.mdx`
  - current title: "Arsenal FC Development Centre: A Parent's Guide"
  - current meta description: "What parents should know about Arsenal's youth development pathway - how the programme is structured, the academy's reputation, and what families should realistically expect."
- **https://www.footballparent.co.uk/girls-football**
  - impressions: 67, clicks: 0
  - file: `app\girls-football\page.tsx`
  - current title: "Girls Football | Football Parent"
  - current meta description: "Guidance for parents navigating girls football, academy pathways, trials and long-term player development in the UK."
- **https://www.footballparent.co.uk/football-development/playing-up-an-age-group-football**
  - impressions: 65, clicks: 1
  - file: `app\football-development\playing-up-an-age-group-football\page.tsx`
  - content: `content\football-development\playing-up-an-age-group-football.mdx`
  - current title: "Should My Child Play Up an Age Group in Football?"
  - current meta description: "A balanced guide for parents weighing up whether to let their child play up an age group, covering the genuine benefits, the risks, and the questions worth asking first."
- **https://www.footballparent.co.uk/academy-pathway/football-development-centres-in-london**
  - impressions: 65, clicks: 0
  - file: `app\academy-pathway\football-development-centres-in-london\page.tsx`
  - content: `content\academy-pathway\football-development-centres-in-london.mdx`
  - current title: "Football Development Centres in London: A Parent's Guide"
  - current meta description: "London has more youth football development pathways than anywhere else in England. This guide helps parents understand the options - for both boys and girls - across the capital."
- **https://www.footballparent.co.uk/football-development/build-confidence-young-footballers**
  - impressions: 52, clicks: 0
  - file: `app\football-development\build-confidence-young-footballers\page.tsx`
  - content: `content\football-development\build-confidence-young-footballers.mdx`
  - current title: "How To Build Confidence In Young Footballers"
  - current meta description: "Practical ways parents can help young footballers build football confidence without adding pressure or unrealistic expectations."
- **https://www.footballparent.co.uk/girls-football/girls-rtcs-explained**
  - impressions: 50, clicks: 0
  - file: `app\girls-football\girls-rtcs-explained\page.tsx`
  - content: `content\girls-football\girls-rtcs-explained.mdx`
  - current title: "Girls RTCs Explained: What They Were and What Replaced Them"
  - current meta description: "RTCs in girls football no longer exist. This guide explains what Regional Talent Centres were, why they changed, and what the current pathway looks like for talented girls today."
