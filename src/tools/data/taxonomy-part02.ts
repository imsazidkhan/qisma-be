import type { LastbenchCategoryInput } from './lastbench-taxonomy.types';

import { mkCategory } from './taxonomy-build.helpers';

/** Categories **11–20**. */
export const PART02: readonly LastbenchCategoryInput[] = [
  mkCategory(
    11,
    'Personal Care',
    '💆',
    '#FBE9E7',
    `
Haircut - Men
Haircut - Women
Beard Trim / Shave
Hair Colour / Highlights
Hair Straightening / Keratin
Hair Spa
Hair Extensions
Facial
Cleanup
Bleach
Waxing
Threading
Eyebrow Shaping
Manicure
Pedicure
Nail Art
Body Massage
Head Massage
Spa Package
Steam / Sauna
De-Tan Treatment
Skin Treatment
Acne Treatment
Laser Hair Removal
Botox / Filler
Tattoo
Piercing
Skincare Products
Sunscreen
Moisturiser
Face Wash
Serum / Toner
Lip Care
Eye Cream
Perfume / Deo
Hair Oil
Shampoo & Conditioner
Dry Shampoo
Body Lotion
Body Scrub
Bath Salts / Bombs
Makeup - Foundation
Makeup - Lipstick
Makeup - Kajal / Eyeliner
Makeup - Blush / Contour
Makeup - Eyeshadow
Makeup Brushes
Nail Polish
Wigs & Hair Pieces
Laundry / Dry Cleaning
`.trim(),
  ),
  mkCategory(
    12,
    'Festivals & Celebrations',
    '🎉',
    '#FFF3E0',
    `
Diwali - Gifts & Hampers
Diwali - Crackers
Diwali - Decoration
Diwali - Sweets Distribution
Diwali - Puja Samagri
Holi - Colours & Gulal
Holi - Water Guns / Pichkari
Holi - Food & Bhang
Navratri - Dandiya Sticks
Navratri - Garba Outfit
Ganesh Chaturthi - Idol
Ganesh Chaturthi - Decoration
Eid - Clothes
Eid - Seviyan & Sweets
Eid - Gifts
Christmas - Tree & Decorations
Christmas - Gifts
Christmas - Cake
New Year Party
New Year Gifts
Raksha Bandhan - Rakhi
Raksha Bandhan - Gifts
Bhai Dooj - Gifts
Karwa Chauth
Teej Celebration
Onam - Sadya
Pongal - Celebration
Baisakhi - Celebration
Lohri - Wood & Peanuts
Makar Sankranti - Kites
Durga Puja - Pandal & Decoration
Independence Day Event
Republic Day Event
Birthday Party - Venue
Birthday Party - Cake
Birthday Party - Decoration
Birthday Party - Gifts
Birthday Party - Return Gifts
Anniversary - Dinner
Anniversary - Gifts
Baby Shower - Venue & Decor
Baby Naming Ceremony
1st Birthday - Grand Celebration
Retirement Party
Farewell Party
`.trim(),
  ),
  mkCategory(
    13,
    'Weddings',
    '💍',
    '#FCE4EC',
    `
Wedding Venue Booking
Wedding Hall Deposit
Wedding Catering
Halwai / Cook
Wedding Decoration - Flowers
Wedding Decoration - Lights
Wedding Photography
Wedding Videography
Drone Shoot
Pre-Wedding Shoot
Honeymoon Package
Bridal Lehenga / Saree
Groom Sherwani
Jewellery - Bride
Jewellery - Groom
Mehndi Artist
Makeup - Bridal
Makeup - Groom
Baraat Band / DJ
Horse / Doli / Car Rental
Wedding Invitation Cards
Digital Invites
Return Gifts / Favours
Wedding Sweets / Mithai
Wedding Catering Advance
Hotel Booking for Guests
Guest Transport
Sangeet Outfit
Haldi Ceremony
Ring Ceremony
Mehendi Ceremony
Reception Function
Bidaai Gifts
Pandit / Priest Fees
Mangalsutra
Wedding Bangles
Gifts for In-laws
Gifts for Family Members
Wedding Jewellery Rental
Trousseau / Dahej
Wedding Planner
Wedding Tent / Shamiyana
Lighting & Electrical
Sound System
Flower Garlands (Jaimala)
Kalash & Puja Items
Wedding Anniversary Celebration
Varmala Ceremony
`.trim(),
  ),
  mkCategory(
    14,
    'Finance & Investments',
    '💰',
    '#E8F5E9',
    `
Mutual Fund - SIP
Mutual Fund - Lump Sum
Stock Market - Zerodha
Stock Market - Groww
Stock Market - Upstox
Stock Market - Angel One
IPO Application
Fixed Deposit
Recurring Deposit
PPF Contribution
NPS Contribution
ELSS Investment
Sukanya Samriddhi
Sovereign Gold Bond
Gold ETF
Digital Gold
Physical Gold Purchase
Silver Purchase
Real Estate Investment
REITs
Chit Fund
LIC Premium
Term Insurance
Health Insurance
Motor Insurance
Home Insurance
Travel Insurance
Crop Insurance
EMI - Home Loan
EMI - Car Loan
EMI - Personal Loan
EMI - Education Loan
EMI - Gold Loan
EMI - Business Loan
EMI - Two Wheeler Loan
Credit Card Payment
Credit Card Annual Fee
Loan Prepayment
Loan Processing Fee
Demat Account AMC
Trading Account Charges
Brokerage Fees
STT / Taxes on Trading
Tax Planning Consultation
Income Tax Payment
Advance Tax
Cryptocurrency - Bitcoin
Cryptocurrency - Ethereum
Cryptocurrency - Altcoins
`.trim(),
  ),
  mkCategory(
    15,
    'Charity & Donations',
    '🤝',
    '#EDE7F6',
    `
Temple Donation
Mosque Donation
Church Donation
Gurudwara Donation
Mandir Renovation Fund
Cow Shelter / Gaushala
NGO Donation
PM Relief Fund
CM Relief Fund
Flood Relief
Earthquake Relief
Cyclone Relief
COVID Relief
Education NGO
Child Welfare
Elderly Care
Disability Support
Animal Shelter
Dog / Cat Rescue
Street Animal Feeding
Bird Feeding
Tree Plantation Drive
Environment NGO
Cancer Foundation
Blind School Donation
Deaf School Donation
Tribal Welfare
Farmer Support
Crowdfunding - Milaap
Crowdfunding - Ketto
Crowdfunding - ImpactGuru
Feed the Poor
Langar Donation
Food Bank
Blood Donation Camp
Eye Donation Awareness
Organ Donation
Cloth / Book Donation
Toy Donation Drive
Political Party Donation
Social Club Membership
Alumni Donation
Religious Trust
Scholarship Fund
Beti Bachao Campaign
Swachh Bharat Contribution
Art / Culture Preservation
Heritage Site Fund
Sports Promotion Fund
Local Festival Sponsorship
`.trim(),
  ),
  mkCategory(
    16,
    'Children & Kids',
    '👶',
    '#E0F7FA',
    `
School Fees
Tuition / Home Tutor
Coaching Classes
Books & Stationery
School Bag
School Uniform
School Shoes
Sports Kit for School
School Trip
Science Exhibition Entry
Art Competition
Swimming Class
Cricket Academy
Football Academy
Basketball
Badminton Classes
Tennis Classes
Karate / Martial Arts
Dance Class
Music Class
Art & Craft Class
Hobby Classes
Baby Food
Baby Formula / Milk
Diapers / Nappies
Baby Wipes
Baby Clothing
Baby Shoes
Baby Toys
Building Blocks
Educational Toys
Board Games
Story Books
Comics
Puzzles
Gaming Console
Mobile Games Top-up
Theme Park Entry
Birthday Party
Kids Salon
Vaccination
Paediatrician Visit
Child Medicines
Eye Checkup (Kids)
Dental Care (Kids)
Speech Therapy
Behavioural Therapy
Gifted Program
Summer Camp
Winter Camp
Coding Classes for Kids
`.trim(),
  ),
  mkCategory(
    17,
    'Pets & Animals',
    '🐾',
    '#F9FBE7',
    `
Pet Food - Dog
Pet Food - Cat
Pet Food - Fish
Pet Food - Bird
Pet Food - Rabbit
Pet Food - Hamster
Vet Consultation
Vet Emergency
Pet Surgery
Pet Medicines
Pet Vaccination
Pet Deworming
Pet Grooming - Bath
Pet Grooming - Haircut
Pet Nail Trimming
Pet Ear Cleaning
Dog Walking Service
Pet Boarding
Pet Daycare
Pet Sitting
Pet Training
Dog Collar & Leash
Pet Carrier / Cage
Pet Bed / Mat
Pet Toys
Fish Tank / Aquarium
Aquarium Accessories
Bird Cage
Bird Accessories
Pet Clothes
Pet Identification Tag
Microchipping
Pet Insurance
Puppy / Kitten Purchase
Adoption Fees
Pet Registration
Cattle Feed
Poultry Feed
Animal Fodder
Cow / Buffalo Milk Costs
Horse Stable Fees
Farm Animal Vet
Livestock Insurance
Beekeeping Supplies
Fishery Expenses
Dairy Equipment
Animal Transport
`.trim(),
  ),
  mkCategory(
    18,
    'Business & Work',
    '💼',
    '#ECEFF1',
    `
Office Rent
Coworking Space
Office Supplies - Paper
Office Supplies - Printer Ink
Office Supplies - Stationery
Office Furniture
Office Renovation
Laptop / Computer (Business)
Printer / Scanner
Business Phone
CCTV (Office)
Business Internet
Business Mobile Plan
Business Software - Tally
Business Software - Zoho
Business Software - GST Tool
Business Software - Slack
Business Software - Zoom
Business Software - MS Office
Domain & Web Hosting
E-commerce Platform Fees
Marketplace Fees - Amazon
Marketplace Fees - Flipkart
Marketplace Fees - Meesho
Payment Gateway Charges
Business Banking Charges
Business Loan EMI
Staff Salary
Freelancer Payment
Contractor Payment
Business Travel
Client Entertainment
Client Gifting
Marketing - Google Ads
Marketing - Meta Ads
Marketing - Influencer
Marketing - Pamphlets
Marketing - Hoardings
Marketing - Newspaper Ad
Courier & Logistics
Packaging Material
Raw Material Purchase
Inventory Purchase
Business Insurance
GST Payment
Professional Tax
TDS Filing
ROC / MCA Fees
Business Lawyer Fees
Business Accountant Fees
Trademark / Patent Fees
FSSAI / License Fees
Shop Act Renewal
`.trim(),
  ),
  mkCategory(
    19,
    'Sports & Fitness',
    '🏋️',
    '#E8F5E9',
    `
Gym Membership
Personal Trainer
Yoga Class
Zumba Class
Aerobics Class
Pilates Class
CrossFit
Functional Training
Boxing Class
MMA / BJJ Class
Swimming Pool Membership
Swimming Coaching
Cricket Kit
Cricket Academy Fees
Football Coaching
Football Kit
Badminton Court Booking
Badminton Racket & Shuttles
Tennis Court Fees
Tennis Racket
Table Tennis
Squash Court
Basketball Fees
Volleyball
Kabaddi Practice
Kho Kho Practice
Athletics Track Access
Cycling - Cycle Purchase
Cycling - Accessories
Trekking Gear
Camping Gear
Adventure Sports Fees
Rock Climbing
Bouldering
Skating Rink
Roller Skates
Horse Riding
Archery Class
Shooting Range
Snooker / Billiards Club
Golf Club Membership
Golf Equipment
Sports Nutrition
Energy Drinks
Protein Powder
Creatine / BCAA
Sports Shoes
Sports Jersey
Fitness Tracker / Band
Home Gym Equipment
Foam Roller / Bands
`.trim(),
  ),
  mkCategory(
    20,
    'Hobbies & Interests',
    '🎨',
    '#FBE9E7',
    `
Painting Supplies
Canvas & Brushes
Watercolour / Acrylic
Sketch Pads
Digital Drawing Tablet
Photography Equipment
Camera Lenses
Tripod & Accessories
Photo Printing
Photo Albums
Music Instrument - Guitar
Music Instrument - Keyboard
Music Instrument - Tabla
Music Instrument - Flute
Music Instrument - Violin
Music Instrument - Harmonium
Music Recording Equipment
DJ Equipment
Music Streaming - Spotify
Music Streaming - Apple Music
Gardening Tools
Seeds & Saplings
Fertiliser & Compost
Pots & Planters
Book Purchase - Fiction
Book Purchase - Non-Fiction
Book Subscription
Kindle / E-Reader
Writing - Journal / Diary
Writing - Fiction
Blogging / Podcasting Setup
Video Editing Software
Drone
RC Cars / Planes
Model Making
Stamp Collection
Coin Collection
Antique Buying
Lego / Building Blocks
Puzzles
Knitting / Crochet
Embroidery
Pottery / Clay
Candle Making
Soap Making
Origami Supplies
Calligraphy
Cooking as Hobby
Baking Supplies
Home Brewing
`.trim(),
  ),
];
