-- Seed the 18 B&I members
-- Edit names, roles, companies, and fun_facts to match your actual group
-- fun_facts is what the AI uses to generate personalized questions

insert into members (name, role, company, fun_facts, display_order) values
  ('Alex B',     'Financial Advisor',     'Wealth Partners',      'Loves golf, always talking about market trends, has a coffee mug collection', 1),
  ('Brittany C', 'Real Estate Agent',     'Prime Realty',         'Sold 40+ homes last year, drives a red convertible, obsessed with staging', 2),
  ('Carlos D',   'Insurance Broker',      'Shield Insurance',     'Youth soccer coach, can quote any insurance policy from memory, always prepared', 3),
  ('Diane E',    'Marketing Consultant',  'Brand Boost Co',       'Uses buzzwords constantly, runs a food blog, claims to know every influencer', 4),
  ('Eric F',     'CPA / Accountant',      'Eric F & Associates',  'Works 80hr weeks in April, collects vintage calculators, very literal sense of humor', 5),
  ('Fatima G',   'Attorney',              'Garza Law Group',      'Never off the clock, gives legal advice at every party, drives a Tesla', 6),
  ('Gilbert H',  'Web Developer',         'Freelance',            'Builds full-stack apps, always has a side project, knows every JavaScript framework', 7),
  ('Hannah I',   'HR Consultant',         'People First HR',      'Has read every HR policy ever written, mediates family disputes on vacation', 8),
  ('Ivan J',     'Financial Planner',     'Future Wealth Mgmt',   'Talks about compound interest at dinner, has a spreadsheet for everything', 9),
  ('Jennifer K', 'Business Coach',        'Thrive Coaching',      'Posts morning motivation quotes daily, has done every personality test known to man', 10),
  ('Kevin L',    'Mortgage Lender',       'Home Loan Pros',       'Can calculate a monthly payment in his head, has a handshake for every occasion', 11),
  ('Laura M',    'Nutritionist',          'Nourish Wellness',     'Brings kale chips to every event, judges your lunch order, runs half-marathons', 12),
  ('Marcus N',   'IT Solutions',          'NetFix IT',            'Fixes everyones computer at holiday parties, always on call, loves Star Trek', 13),
  ('Nicole O',   'Event Planner',         'Perfect Events Co',    'Organizes everything including her friends weddings, has backup plans for backup plans', 14),
  ('Oscar P',    'Commercial Realtor',    'Metro Commercial RE',   'Never met a strip mall he didnt like, knows the zoning laws of every suburb', 15),
  ('Priya Q',    'Healthcare Consultant', 'Health Strategy Group', 'Self-diagnoses everything on WebMD, knows every medical acronym, very organized', 16),
  ('Rachel R',   'Social Media Manager',  'Click & Engage',       'Always filming content, uses hashtags in real conversation, checks analytics hourly', 17),
  ('Sam T',      'Business Attorney',     'Turner Legal Group',   'Gets called at 11pm by clients, has a contract for everything, very dry humor', 18);
