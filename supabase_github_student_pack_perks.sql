-- GitHub Student Developer Pack offers
-- Run once in the Supabase SQL editor.
-- Skips JetBrains because that student license is already listed,
-- and skips any provider name that is already in student_perks.
-- No offer codes are stored. Students claim on the provider's page.

INSERT INTO public.student_perks (
  provider_name,
  category,
  summary,
  eligibility,
  claim_steps,
  official_url,
  availability,
  last_verified_on,
  is_active,
  sort_order
)
SELECT
  v.provider_name,
  v.category,
  v.summary,
  v.eligibility,
  v.claim_steps,
  v.official_url,
  v.availability,
  v.last_verified_on,
  v.is_active,
  v.sort_order
FROM (
  VALUES
  ('Namecheap', 'Other', 'One year on a .me domain, plus one SSL certificate for a year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#namecheap', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 9),
  ('Name.com', 'Other', 'One free year on a selected domain, including extensions such as .live, .studio, .app, and .dev, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#namecom', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 10),
  ('Microsoft Azure', 'Cloud', 'Free Azure services and $100 in credit for students aged 18 or older. No credit card is required.', 'Students aged 18 or older. Microsoft checks a school email. If that email is not accepted, an approved GitHub Education account can be used as the other proof.', 'Open Azure for Students and sign in with a Microsoft account.
Verify with your school email and complete signup. No credit card is required.
If the school email is rejected, get approved at GitHub Education first, then open the Azure offer on the Student Developer Pack and continue.
Renew each year while you are still a student.', 'https://azure.microsoft.com/en-us/free/students', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 11),
  ('.TECH', 'Other', 'One standard .tech domain free for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#tech', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 12),
  ('Microsoft 365', 'Other', 'A student offer for Microsoft 365, including the apps, cloud storage, and Copilot features Microsoft is currently giving students.', 'Students who can prove enrolment to Microsoft with a school email, student ID, or another document they accept. The free period can renew into a paid plan unless you cancel.', 'Open Microsoft''s student offer and sign in with a Microsoft account.
Verify with your school email or the document Microsoft asks for.
Read the renewal price before you confirm. Cancel in your Microsoft account if you do not want it to continue at the normal price.', 'https://www.microsoft.com/en-us/microsoft-365/college-student-pricing', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 13),
  ('GitHub Pro', 'Software', 'GitHub Pro stays free while GitHub Education still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open GitHub Education benefits and sign in.
Apply with a school email or dated proof of enrollment if you are not approved yet.
After approval, GitHub Pro is on that same benefits page.
Reapply when GitHub asks you to renew student status.', 'https://github.com/settings/education/benefits', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 14),
  ('Notion for GitHub students', 'Other', 'Notion''s Education Plus plan, including extra AI responses, for students GitHub has approved.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Open Notion''s GitHub student page and sign up for Education Plus.
Use it on one unpaid workspace with a single member.
The separate Notion Education plan, which only needs a school email, is already listed on its own.', 'https://www.notion.so/githubstudentpack', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 15),
  ('DataCamp', 'Learning', 'Three months of DataCamp when you subscribe with an approved GitHub student account.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#datacamp', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 16),
  ('GitHub Copilot', 'AI', 'Copilot Student for approved students: unlimited completions, a monthly AI credit allowance, and limited chat on auto model selection.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open GitHub Education benefits and sign in.
Apply with a school email or dated proof of enrollment if you are not approved yet.
After approval, open Copilot from that benefits page and turn it on in your editor.
Copilot Student is limited to the models GitHub includes on the student plan.', 'https://github.com/settings/education/benefits', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 17),
  ('Heroku', 'Cloud', '$13 of Heroku credit each month for 24 months, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#heroku', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 18),
  ('Boot.dev', 'Learning', 'Three months of Boot.dev membership for approved GitHub students, covering backend, DevOps, and data lessons.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#boot-dev', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 19),
  ('Codedex', 'Learning', 'Six months of Codédex Club for students GitHub has approved.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#codedex', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 20),
  ('Testmail', 'Software', 'Testmail''s Essential plan while GitHub still counts you as a student. Use it for test inboxes, not personal mail.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#testmail', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 21),
  ('Educative', 'Learning', 'Six months of Educative courses for approved GitHub students, plus 30% off a later subscription.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#educative', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 22),
  ('Termius', 'Software', 'Termius Pro and Team features while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#termius', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 23),
  ('MongoDB', 'Cloud', '$50 in MongoDB Atlas credits, plus Compass and a MongoDB University certification voucher, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Open MongoDB''s student page and verify with that GitHub account.
Add the Atlas credits to your MongoDB account. Atlas may ask for a card or PayPal even though the credits cover the usage.
Complete the matching MongoDB University path if you want the certification voucher.', 'https://www.mongodb.com/students', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 24),
  ('Camber', 'AI', 'Camber''s student plan while you are enrolled: monthly CPU hours, GPU hours, storage, and agent messages.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#cambercloud', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 25),
  ('Microsoft Azure (ages 13-17)', 'Cloud', 'A smaller Azure set for students aged 13 to 17: App Service, Functions, Notification Hubs, and a few related services. No credit card.', 'Students aged 13 to 17. GitHub has to approve the student account first. This is separate from Azure for Students, which is for ages 18 and older.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#microsoft-azure-13-17', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 26),
  ('Datadog', 'Software', 'A Datadog Pro account for up to 10 servers, free for two years, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#datadog', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 27),
  ('GitHub Codespaces', 'Software', 'Pro-level GitHub Codespaces usage while GitHub Education still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://github.com/settings/education/benefits', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 28),
  ('1Password', 'Other', '1Password free for one year, including the developer tools, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Open 1Password''s student page and redeem with that GitHub account.
The free year can be claimed once. After it ends, 1Password may offer a separate student discount.', 'https://1password.com/developers/students', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 29),
  ('GitHub Pages', 'Software', 'Host a site from a GitHub repository. One user site and unlimited project sites.', 'Anyone with a GitHub account. This is free for every account, not only students.', 'Open GitHub Pages.
Create a repository and turn Pages on in the repository settings.
Push the site. GitHub publishes it from that repository.', 'https://pages.github.com/', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 30),
  ('Visual Studio Dev Essentials', 'Software', 'Microsoft''s free Dev Essentials bundle: Visual Studio Community and related learning and cloud credits.', 'A Microsoft account. This program is free to join and is not limited to the GitHub student pack.', 'Open Visual Studio Dev Essentials and sign in with a Microsoft account.
Join the program and download Visual Studio Community from that page.
Read which cloud credits are included before you activate them.', 'https://visualstudio.microsoft.com/dev-essentials/', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 31),
  ('Visual Studio Code', 'Software', 'Free downloads and coding packs for Java, Python, and .NET.', 'Anyone. Visual Studio Code is free, not a student-only discount.', 'Open the Visual Studio Code download page.
Download the installer for your computer.
Add the language pack you need, such as Python, Java, or .NET, from the extensions view.', 'https://code.visualstudio.com/download', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 32),
  ('Stripe', 'Other', '$25 in Stripe credits for approved GitHub students, applied to fees on Stripe products.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#stripe', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 33),
  ('Frontend Masters', 'Learning', 'Six months of Frontend Masters courses and workshops for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#frontendmasters', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 34),
  ('Clerk', 'Software', 'Clerk''s Pro plan while GitHub still counts you as a student. SMS authentication is not included.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Open Clerk''s student page and connect the same GitHub account.
Claim it on one workspace. Keep that GitHub account connected.
When GitHub student access ends, Clerk moves the workspace off the student plan.', 'https://clerk.com/github-student-developer-pack', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 35),
  ('PomoDone', 'Other', 'PomoDone Lite free for two years, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#pomodone', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 36),
  ('Notion Template Collection', 'Learning', 'Notion templates for course dashboards, hackathons, and portfolios, shared for GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#notion-templates', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 37),
  ('Bootstrap Studio', 'Design', 'A Bootstrap Studio license while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#bootstrapstudio', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 38),
  ('Arduino', 'Other', 'Six months of Arduino Cloud, plus discounts on selected hardware, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#arduino', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 39),
  ('New Relic', 'Software', 'New Relic free while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#newrelic', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 40),
  ('GitHub Campus Experts', 'Other', 'Apply to be a GitHub Campus Expert and build a technical community at your school.', 'Current students. GitHub selects applicants. This is a program, not an automatic discount.', 'Open the Campus Experts page.
Sign in with GitHub and submit the application.
Wait for GitHub to accept or decline it.', 'https://education.github.com/experts', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 41),
  ('Appwrite', 'Cloud', 'Six months of Appwrite''s Education plan, with Pro-level resources on a limited number of projects, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Open Appwrite''s education page and create an account through that offer.
The Education plan lasts six months, then you pick a regular Appwrite plan.', 'https://appwrite.io/education', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 42),
  ('Zyte', 'Software', 'One Scrapy Cloud unit that stays free, with unlimited crawl time and 120 days of data retention, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#scrapinghub', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 43),
  ('Icons8', 'Design', 'Three months of Icons8 icons, photos, illustrations, and music for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#icons8', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 44),
  ('Sentry', 'Software', 'A Sentry team plan for one year for approved GitHub students, with set limits on errors, transactions, and replays.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#sentry', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 45),
  ('Deepnote', 'AI', 'Deepnote''s education plan for students. A school email is enough. GitHub approval is only the other way in.', 'Students, teachers, and researchers with a school email. Deepnote does not accept a student ID photo.', 'Open Deepnote''s education instructions.
Sign up with your school email and confirm the message they send.
If you already use a personal email, upgrade from Settings, then Education plan, or ask Deepnote to check the school email.', 'https://deepnote.com/docs/edu-verification', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 46),
  ('LocalStack', 'Cloud', 'A LocalStack license for the AWS emulator, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#localstack', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 47),
  ('Scrimba', 'Learning', 'One month of Scrimba Pro courses and projects for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#scrimba', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 48),
  ('Polypane', 'Design', 'Polypane''s individual plan free for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#polypane', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 49),
  ('LambdaTest', 'Software', 'LambdaTest Live for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#lambdatest', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 50),
  ('GitLens', 'Software', 'GitLens Pro through the GitKraken student plan: six months free, then a student discount, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Create the GitKraken account with GitHub sign-in. Another sign-in method will not attach the student plan.
Open gitkraken.dev/student and start the trial.
The six months start from the account and cannot be restarted by deleting it.', 'https://gitkraken.dev/student', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 51),
  ('IconScout', 'Design', '60 premium icons a month for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#iconscout', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 52),
  ('Visme', 'Design', 'Three months of Visme''s Starter plan for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#visme', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 53),
  ('CodeScene', 'Software', 'A CodeScene student account that can analyze private GitHub repositories, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#codescene', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 54),
  ('BrowserStack', 'Software', 'BrowserStack Automate Mobile for one user and one parallel test, for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#browserstack', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 55),
  ('Doppler', 'Software', 'Doppler Team while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#doppler', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 56),
  ('Adafruit', 'Other', 'One year of Adafruit IO+, plus discounts on selected hardware, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#adafruit', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 57),
  ('HazeOver', 'Other', 'A HazeOver for Mac license, including minor updates, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#hazeover', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 58),
  ('AlgoExpert', 'Learning', '20 AlgoExpert practice questions, plus 10% off AlgoExpert products, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Open AlgoExpert''s GitHub student page and press Claim Offer.
If you already bought AlgoExpert, the free questions will not apply, but the 10% discount still can.', 'https://www.algoexpert.io/github-students', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 59),
  ('Travis CI', 'Software', 'Free private Travis CI builds while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#travis', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 60),
  ('Pageclip', 'Software', 'Pageclip''s basic plan while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#pageclip', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 61),
  ('Xojo', 'Software', 'A Xojo Pro license while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#xojo', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 62),
  ('Octicons', 'Design', 'The Octicons icon set and its Figma source. It is free and open to everyone.', 'Anyone. This is a free icon library, not a student discount.', 'Open the Octicons site.
Use the icons in a design or copy them into a project.
Follow the license on that page.', 'https://primer.style/octicons', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 63),
  ('Blackfire', 'Software', 'Blackfire''s developer subscription for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#blackfire', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 64),
  ('ToDiagram', 'Design', 'ToDiagram Pro for approved GitHub students: full editor, no data limit, and up to 10 cloud documents. The AI assistant is not included.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#todiagram', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 65),
  ('Interview Cake', 'Learning', 'One week of Interview Cake''s full interview course for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#interviewcake', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 66),
  ('Working Copy', 'Software', 'Working Copy Pro on iPhone and iPad while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#workingcopy', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 67),
  ('Astra Security', 'Other', 'Six months of Astra''s website firewall and malware scanner for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#astra', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 68),
  ('GitKraken', 'Software', 'GitKraken Student: six months free, then a student discount, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Get approved for the GitHub Student Developer Pack first.
Create the GitKraken account with GitHub sign-in.
Open gitkraken.dev/student and start the trial.
The six months cannot be restarted by deleting the account.', 'https://gitkraken.dev/student', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 69),
  ('Imgbot', 'Software', 'Imgbot image optimization on public and private repositories while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#imgbot', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 70),
  ('GitHub Desktop', 'Software', 'GitHub''s desktop app for commits, branches, and pull requests. It is free for everyone.', 'Anyone. GitHub Desktop is free, not a student-only offer.', 'Open the GitHub Desktop download page.
Install it and sign in to GitHub.
Clone a repository and commit from the app.', 'https://desktop.github.com/', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 71),
  ('CARTO', 'Other', 'A CARTO upgrade for two years, with more storage and location credits, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#cartodb', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 72),
  ('Requestly', 'Software', 'Requestly Professional free for one year for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#requestly', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 73),
  ('Tower', 'Software', 'Tower Pro while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#tower', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 74),
  ('Simple Analytics', 'Software', 'Simple Analytics Starter for one year, including 100,000 page views a month, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#simpleanalytics', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 75),
  ('GoRails', 'Learning', 'Twelve months of GoRails videos for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#gorails', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 76),
  ('Codecov', 'Software', 'Codecov on public and private repositories for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#codecov', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 77),
  ('SQLGate', 'Software', 'SQLGate standard features for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#sqlgate', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 78),
  ('PopSQL', 'Software', 'PopSQL Premium while GitHub still counts you as a student.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#popsql', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 79),
  ('DeepScan', 'Software', 'A six-month DeepScan trial for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#deepscan', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 80),
  ('Honeybadger', 'Software', 'Honeybadger''s Small account for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#honeybadger', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 81),
  ('POEditor', 'Software', 'POEditor Plus for one year, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#poeditor', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 82),
  ('ConfigCat', 'Software', 'ConfigCat with 1,000 feature flags and unlimited users, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#configcat', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 83),
  ('Blockchair', 'Other', '100,000 Blockchair API requests for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#blockchair', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 84),
  ('DevCycle', 'Software', 'One year of DevCycle Starter, with unlimited seats and flags, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#devcycle', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 85),
  ('Vaadin', 'Software', 'A Vaadin Pro license for the commercial components, for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#vaadin', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 86),
  ('Appfigures', 'Other', 'One year of Appfigures reports for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#appfigures', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 87),
  ('Themeisle', 'Design', 'One year of the Neve Agency WordPress theme for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#themeisle', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 88),
  ('Dashlane', 'Other', 'Six months of Dashlane Premium for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#dashlane', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 89),
  ('SymfonyCasts', 'Learning', 'Three months of SymfonyCasts for approved GitHub students.', 'Students aged 13 or older in a degree- or diploma-granting program. GitHub has to approve you with a school email or dated proof of enrollment. Uni Deals does not approve this or give you a code.', 'Open this page and sign in to GitHub.
If GitHub has not approved you yet, choose Sign up for the Student Developer Pack and apply with a school email or dated proof of enrollment.
After approval, come back to this offer. The Get access button appears only while you are signed in.
Finish on the provider''s site and read their terms.', 'https://education.github.com/pack#symfonycasts', 'Worldwide. The provider can still limit this by age or country.', DATE '2026-10-12', true, 90)
) AS v(
  provider_name,
  category,
  summary,
  eligibility,
  claim_steps,
  official_url,
  availability,
  last_verified_on,
  is_active,
  sort_order
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.student_perks existing
  WHERE existing.provider_name = v.provider_name
);
