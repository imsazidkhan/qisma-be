import type { LastbenchCategoryInput } from './lastbench-taxonomy.types';

import { mkCategory } from './taxonomy-build.helpers';

/** Categories **21–30**. */
export const PART03: readonly LastbenchCategoryInput[] = [
  mkCategory(
    21,
    'Clothing Alterations & Tailoring',
    '🧵',
    '#FCE4EC',
    `
Stitching - Blouse
Stitching - Salwar
Stitching - Kurta
Stitching - Suit
Stitching - Sherwani
Stitching - Dress
Stitching - Trousers
Stitching - Shirt
Alteration - Shortening
Alteration - Taking In / Letting Out
Alteration - Hem
Alteration - Waist
Button Replacement
Zip Repair
Lining Work
Embroidery Work
Zari & Gota Work
Sequin Work
Patch Work
Fabric Purchase - Cotton
Fabric Purchase - Silk
Fabric Purchase - Linen
Fabric Purchase - Chiffon
Fabric Purchase - Georgette
Fabric Purchase - Khadi
Lace & Trim
Threads & Needles
Ironing
Steaming
Dry Clean - Saree
Dry Clean - Sherwani
Dry Clean - Suit
Dry Clean - Heavy Garments
Uniform Stitching
School Uniform
Sports Kit Alteration
Costume Making
Fancy Dress
Renting Outfit
Renting Jewellery
Renting Bridal Outfit
Buying Second-Hand Clothes
Donating Old Clothes
`.trim(),
  ),
  mkCategory(
    22,
    'Technology & Gadgets',
    '💻',
    '#E3F2FD',
    `
Mobile Phone Purchase
Mobile Accessories - Cover
Mobile Accessories - Screen Guard
Mobile Accessories - Charger
Mobile Accessories - Earphones
Mobile Accessories - Power Bank
Laptop Purchase
Laptop Bag
Laptop Stand
Laptop Accessories
Tablet Purchase
Tablet Cover
Smart Watch
Fitness Band
Bluetooth Speaker
Smart TV
Smart Bulbs / IoT
Router / WiFi Extender
External Hard Drive
Pen Drive / SSD
Keyboard & Mouse
Gaming Mouse
Gaming Chair
Monitor
Webcam
Headphones / Headset
Smart Door Lock
Smart Camera
Video Doorbell
Air Quality Monitor
Smart AC Controller
Computer Repair
Mobile Repair
Screen Replacement
Data Recovery
Tech Subscription - iCloud
Tech Subscription - Google One
Tech Subscription - OneDrive
Tech Subscription - Dropbox
App Purchase
In-App Purchase
Game Purchase
E-Book Purchase
Software Licence
Antivirus
VPN Subscription
Cloud Hosting
Programming Tools
Tech Course
Coding Competition Fee
`.trim(),
  ),
  mkCategory(
    23,
    'Food Ingredients & Cooking',
    '🍳',
    '#FFF8E1',
    `
Vegetables - Leafy
Vegetables - Root
Vegetables - Seasonal
Exotic Vegetables
Organic Produce
Pulses - Moong
Pulses - Masoor
Pulses - Chana
Pulses - Rajma
Pulses - Urad Dal
Rice - Basmati
Rice - Non-Basmati
Wheat Atta
Maida / Suji
Besan
Poha / Flattened Rice
Quinoa / Oats
Mustard Oil
Sunflower Oil
Olive Oil
Coconut Oil
Groundnut Oil
Vanaspati / Dalda
Pure Ghee
White Butter
Paneer (Homemade)
Milk
Yogurt / Curd
Cheese
Cream
Eggs (Farm Fresh)
Chicken
Mutton
Fish
Prawns
Egg from Market
Dry Spices - Cumin
Dry Spices - Coriander
Dry Spices - Turmeric
Dry Spices - Chilli Powder
Garam Masala
Biryani Masala
Chaat Masala
Kitchen King Masala
Tamarind
Dried Mango Powder
Bay Leaves
Cardamom
Cloves
Cinnamon
Pepper
Star Anise
`.trim(),
  ),
  mkCategory(
    24,
    'Government & Legal',
    '🏛️',
    '#ECEFF1',
    `
Income Tax Payment
Advance Tax
GST Payment
GST Registration
GST Filing Agent Fees
TDS Filing
Professional Tax
Property Tax
Road Tax
Vehicle Registration
Vehicle RC Transfer
Driving Licence Fee
Learner's Licence Fee
Passport Application
Passport Renewal
OCI / PIO Card
Aadhaar Update
PAN Card Application
Voter ID Application
Birth Certificate
Death Certificate
Caste Certificate
Domicile Certificate
Income Certificate
Land Record Fee
Mutation Charges
Stamp Duty
Registration Charges
Notary Fees
Affidavit Fees
Court Fee Stamp
Lawyer Fees
Legal Consultation
RTI Application Fee
Police Verification Charges
Bail Application
Arbitration Fees
Consumer Forum Filing
Labour Court Fees
Trademark Registration
Patent Filing
Copyright Registration
MSME Registration
Shop & Establishment License
FSSAI Registration
Pollution NOC
Building Plan Approval
Occupancy Certificate
Marriage Registration
Divorce Legal Fees
Will / Testament Drafting
`.trim(),
  ),
  mkCategory(
    25,
    'Agriculture & Farming',
    '🌾',
    '#F9FBE7',
    `
Seeds Purchase
Fertiliser - Urea
Fertiliser - DAP
Fertiliser - Potash
Organic Manure
Pesticide
Herbicide
Fungicide
Irrigation Charges
Pump Set Fuel
Bore Well Drilling
Drip Irrigation Setup
Sprinkler Setup
Tractor Hire
Tractor Fuel
Tractor Maintenance
Harvester Hire
Farm Labour Wages
Ploughing Charges
Sowing Charges
Transplanting Charges
Weeding Labour
Harvesting Labour
Threshing Labour
Storage - Godown Rent
Cold Storage
Transportation of Produce
Market / Mandi Commission
Crop Insurance Premium
PM Kisan Related
Soil Testing
Krishi Vigyan Kendra
Poly House / Greenhouse
Net House
Farm Equipment Purchase
Pump Repair
Irrigation Pipe
Land Lease Rent
Fence / Boundary Wall
Cattle Purchase
Cattle Feed
Veterinary for Cattle
Poultry Setup
Fish Farming Equipment
Sericulture Supplies
Apiculture / Beekeeping
Agri Input Subsidy (Deduction)
Agri Loan EMI
KCC / Kisan Credit Card
Farmers' Market Stall
Agri Training Course
`.trim(),
  ),
  mkCategory(
    26,
    'Religious & Spiritual',
    '🙏',
    '#FFF8E1',
    `
Temple Visit Offering
Mandir Dakshina
Pandit / Purohit Fees
Pooja Samagri
Havan Items
Agarbatti / Dhoop
Diya / Lamp Oil
Flowers for Pooja
Prasad Distribution
Mata Ki Chowki
Ramayan / Sunder Kand Path
Kirtan / Bhajan Event
Pilgrimage - Char Dham
Pilgrimage - Shirdi
Pilgrimage - Tirupati
Pilgrimage - Amarnath
Pilgrimage - Vaishno Devi
Pilgrimage - Kashi / Varanasi
Pilgrimage - Mathura / Vrindavan
Pilgrimage - Puri
Mosque Visit Donation
Eid Celebration Expenses
Qurbani / Bakrid
Namaz Mat / Items
Madrasa Donation
Church Visit Offering
Christmas Mass
Easter Celebration
Gurudwara Langar Donation
Gurudwara Donation
Waheguru Simran Items
Jain Temple Donation
Paryushana Celebration
Mahavir Jayanti
Buddhist Temple Donation
Buddha Purnima Celebration
Astrology / Jyotish Consultation
Vastu Shastra Consultation
Numerology Consultation
Religious Books Purchase
Gita / Quran / Bible Purchase
Religious Idol / Murti
Janmashtami Celebration
Ram Navami Celebration
Hanuman Jayanti
Navratri Garba Event
Chhath Puja Items
Guru Purnima Event
Spiritual Retreat
`.trim(),
  ),
  mkCategory(
    27,
    'Subscriptions & Memberships',
    '🔔',
    '#EDE7F6',
    `
Netflix
Amazon Prime
Disney+ Hotstar
SonyLIV
ZEE5
JioCinema
MX Player
Aha
Apple TV+
YouTube Premium
Spotify
Apple Music
Wynk Music
Gaana
JioSaavn
Audible
Kindle Unlimited
News App - TOI
News App - HT
News App - The Hindu
News App - Dainik Bhaskar
Magazine Subscription
Newspaper (Physical)
LinkedIn Premium
Naukri.com Premium
Matrimonial Site Premium
Dating App Subscription
Gym Membership
Yoga App
Meditation App - Headspace
Meditation App - Calm
Fitness App - HealthifyMe
Duolingo / Language App
Canva Pro
Adobe Express
Notion Pro
Slack Paid
Zoom Pro
Google Workspace
Microsoft 365
Dropbox
iCloud Storage
Google One
OneDrive
Antivirus Premium
VPN Premium
Gaming Subscription
Game Pass / PS Plus
Club / Association Membership
Professional Body Membership
Library Membership
`.trim(),
  ),
  mkCategory(
    28,
    'Photography & Videography',
    '📷',
    '#FBE9E7',
    `
Camera Purchase
DSLR Camera
Mirrorless Camera
Action Camera (GoPro)
Drone Purchase
360 Camera
Lens Purchase
Wide Angle Lens
Telephoto Lens
Macro Lens
Prime Lens
Zoom Lens
Camera Bag
Camera Strap
Memory Card
Extra Battery
Battery Charger
Tripod
Gimbal / Stabiliser
Ring Light
Softbox Lighting
Reflector
Backdrop / Green Screen
Camera Cleaning Kit
ND Filters
Polarising Filter
Studio Rental
Photo Shoot (Professional)
Video Shoot (Professional)
Event Photography
Wedding Photography
Pre-Wedding Shoot
Newborn Photography
Product Photography
Food Photography
Real Estate Photography
Drone Shoot Hire
Video Editing Software
Photo Editing Software
Lightroom Subscription
Capture One Licence
Stock Photo Purchase
Printing & Albums
Canvas Print
Framing
Photo Book
YouTube / Reel Setup
Podcast Equipment
Microphone
Audio Interface
Live Streaming Setup
Content Creator Course
`.trim(),
  ),
  mkCategory(
    29,
    'Home Appliances & Electronics',
    '🏠',
    '#E8EAF6',
    `
Television Purchase
Smart TV Upgrade
TV Wall Mount
Set-Top Box
Soundbar
Home Theatre
Air Conditioner Purchase
AC Installation
AC Service & Gas Refill
Air Cooler
Air Purifier
Humidifier
Fan Purchase
Ceiling Fan
Table Fan
Exhaust Fan
Refrigerator Purchase
Washing Machine - Front Load
Washing Machine - Top Load
Dryer
Dishwasher
Microwave Oven
OTG Oven
Air Fryer
Induction Cooktop
Gas Stove Purchase
Gas Stove Repair
Chimney Purchase
Chimney Service
Mixer / Grinder
Juicer / Blender
Food Processor
Coffee Machine
Electric Kettle
Toaster / Sandwich Maker
Water Purifier Purchase
Water Purifier Service
Geyser / Water Heater
Inverter Purchase
Battery for Inverter
UPS
Vacuum Cleaner
Robot Vacuum
Wet & Dry Vacuum
Iron Box
Dry Iron
Steam Iron
Sewing Machine
Generator / DG Set
Solar Panel Purchase
Smart Home Hub
`.trim(),
  ),
  mkCategory(
    30,
    'Safety & Security',
    '🔒',
    '#ECEFF1',
    `
CCTV Camera Setup
CCTV Maintenance
Smart Door Lock
Deadbolt Lock Change
Door Chain
Video Doorbell
Alarm System
Motion Sensor
Smart Security System
Fire Extinguisher
Smoke Detector
Carbon Monoxide Detector
Security Guard Service
Private Security Agency
Watchman Salary
Gated Community Charges
Home Safe Purchase
Locker Service (Bank)
Fingerprint Device
Access Control System
Pepper Spray
Self-Defence Class
Anti-Theft Device (Vehicle)
Vehicle Tracker / GPS
Dashcam
Cyber Security Software
Password Manager
Identity Protection Service
Child Safety GPS Tracker
School Security Fees
Safe Locker Repair
Insurance Claim Processing
`.trim(),
  ),
];
