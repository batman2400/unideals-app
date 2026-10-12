-- Group global student perks into categories students can filter.
-- Run once in the Supabase SQL editor after the pack offers are inserted.

UPDATE public.student_perks SET category = 'Software'
WHERE provider_name IN (
  'GitHub Student Developer Pack',
  'JetBrains educational licenses',
  'GitHub Pro',
  'GitHub Codespaces',
  'GitHub Pages',
  'GitHub Desktop',
  'Testmail',
  'Termius',
  'Visual Studio Dev Essentials',
  'Visual Studio Code',
  'Stripe',
  'Clerk',
  'Arduino',
  'Zyte',
  'LambdaTest',
  'GitLens',
  'CodeScene',
  'BrowserStack',
  'Adafruit',
  'Travis CI',
  'Pageclip',
  'Xojo',
  'Blackfire',
  'Working Copy',
  'GitKraken',
  'Imgbot',
  'CARTO',
  'Requestly',
  'Tower',
  'Simple Analytics',
  'Codecov',
  'SQLGate',
  'PopSQL',
  'DeepScan',
  'POEditor',
  'ConfigCat',
  'Blockchair',
  'DevCycle',
  'Vaadin',
  'Appfigures'
);

UPDATE public.student_perks SET category = 'AI'
WHERE provider_name IN (
  'Google Gemini for students',
  'GitHub Copilot',
  'Camber',
  'Deepnote'
);

UPDATE public.student_perks SET category = 'Learning'
WHERE provider_name IN (
  'DataCamp',
  'Boot.dev',
  'Codedex',
  'Educative',
  'Frontend Masters',
  'GitHub Campus Experts',
  'Scrimba',
  'AlgoExpert',
  'Interview Cake',
  'GoRails',
  'SymfonyCasts'
);

UPDATE public.student_perks SET category = 'Design'
WHERE provider_name IN (
  'Autodesk Education',
  'Canva Education',
  'Bootstrap Studio',
  'Icons8',
  'Polypane',
  'IconScout',
  'Visme',
  'Octicons',
  'ToDiagram',
  'Themeisle'
);

UPDATE public.student_perks SET category = 'Cloud'
WHERE provider_name IN (
  'Microsoft Azure',
  'Microsoft Azure (ages 13-17)',
  'Heroku',
  'MongoDB',
  'Appwrite',
  'LocalStack'
);

UPDATE public.student_perks SET category = 'Domains'
WHERE provider_name IN (
  'Namecheap',
  'Name.com',
  '.TECH'
);

UPDATE public.student_perks SET category = 'Security'
WHERE provider_name IN (
  'Datadog',
  '1Password',
  'New Relic',
  'Sentry',
  'Doppler',
  'Astra Security',
  'Honeybadger',
  'Dashlane'
);

UPDATE public.student_perks SET category = 'Productivity'
WHERE provider_name IN (
  'Notion Education Plan',
  'Microsoft 365',
  'Notion for GitHub students',
  'PomoDone',
  'Notion Template Collection',
  'HazeOver'
);

UPDATE public.student_perks SET category = 'Music'
WHERE provider_name = 'Spotify Premium Student';

UPDATE public.student_perks SET category = 'Video'
WHERE provider_name = 'YouTube Premium Student';
