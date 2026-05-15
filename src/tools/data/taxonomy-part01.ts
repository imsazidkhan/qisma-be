import type { LastbenchCategoryInput } from './lastbench-taxonomy.types';

import { mkCategory } from './taxonomy-build.helpers';

/** Categories **1–10** (user-provided extended taxonomy). */
export const PART01: readonly LastbenchCategoryInput[] = [
  mkCategory(
    1,
    'Food & Dining',
    '🍽️',
    '#FFF3E0',
    `
Restaurant
Fine Dining
Dhaba
Tapri / Tea Stall
Street Food
Thela / Cart Food
Fast Food
Cafe / Coffee Shop
Chai Shop
Juice Bar
Lassi Shop
Ice Cream Parlour
Sweet Shop / Mithai
Bakery
Food Delivery - Zomato
Food Delivery - Swiggy
Food Delivery - Blinkit
Biryani House
South Indian Restaurant
North Indian Restaurant
Chinese Restaurant
Pizza
Burger Joint
Sushi / Japanese
Pav Bhaji Stall
Vada Pav Stall
Chaat Corner
Pan / Paan Shop
Sandwich Shop
Paratha Shop
Tiffin Service
Mess / Canteen
Hotel Breakfast
Hotel Buffet
Bar & Kitchen
Night Canteen
Office Cafeteria
Airport Food
Railway Pantry
Sea Food Restaurant
Dhosai Centre
Idli Stall
Poha / Jalebi Corner
Samosa Shop
Kachori Stall
Chole Bhature
Puri Sabzi Stall
Egg Corner
Non-Veg Stall
Halal Meat Shop
`.trim(),
  ),
  mkCategory(
    2,
    'Groceries',
    '🛒',
    '#E8F5E9',
    `
Vegetables
Fruits
Dairy - Milk
Dairy - Curd / Yogurt
Dairy - Paneer
Dairy - Butter / Ghee
Eggs
Atta / Flour
Rice
Dal / Lentils
Spices & Masala
Cooking Oil
Salt & Sugar
Tea / Coffee
Packaged Snacks
Biscuits
Namkeen
Noodles / Pasta
Ready-to-Cook
Frozen Food
Bread & Bakery Items
Corn Flakes / Muesli
Dry Fruits
Nuts & Seeds
Jaggery / Khand
Pickle & Chutney
Papad / Fryums
Sauces & Ketchup
Vinegar / Soya Sauce
Cleaning Liquid
Dishwash Bar
Washing Powder
Floor Cleaner
Toilet Cleaner
Pooja / Puja Items
Agarbatti / Diya
Soap & Body Wash
Shampoo
Toothpaste / Brush
Sanitary Products
Baby Products
Pet Food
Mineral Water
Cold Drinks
Juices (Packaged)
Health Drinks
Protein Supplements
Online Grocery - BigBasket
Online Grocery - JioMart
Local Kirana Store
`.trim(),
  ),
  mkCategory(
    3,
    'Transportation',
    '🚗',
    '#E3F2FD',
    `
Auto Rickshaw
Cycle Rickshaw
E-Rickshaw
Taxi - Ola
Taxi - Uber
Taxi - Rapido Car
Bike Taxi - Rapido
Bike Taxi - Ola Moto
City Bus
BEST / DTC / BMTC Bus
AC Bus
Metro Rail
Local Train
MEMU / Passenger Train
Rajdhani / Shatabdi
Vande Bharat
Sleeper Train
AC Train
Flight - IndiGo
Flight - Air India
Flight - SpiceJet
Flight - Akasa
Flight - Vistara
Ferry / Boat
Petrol
Diesel
CNG
EV Charging
Parking Charges
Toll Tax
Fastag Recharge
Car Wash
Vehicle Service
Vehicle Repair
Tyre Change
Bike Service
Insurance - Vehicle
Driving Lesson
State Bus (KSRTC/MSRTC etc.)
Volvo Bus
Inter-city Cab
Cab Pool
School Bus
Office Cab
Ambulance
Helicopter
Cruise Ship
Pony / Horse Ride (Hill Station)
`.trim(),
  ),
  mkCategory(
    4,
    'Housing & Rent',
    '🏠',
    '#F3E5F5',
    `
Monthly Rent
Advance / Security Deposit
Society Maintenance
Parking Slot Rent
Electricity Bill
Water Bill
Gas - Piped
Gas - Cylinder (LPG)
Broadband Bill
Maid / Bai
Cook Salary
Security Guard
Driver Salary
Gardener
Plumber Visit
Electrician Visit
Carpenter Visit
Painter Visit
AC Service
Geyser / Water Heater Repair
Washing Machine Repair
Refrigerator Repair
Property Tax
House Insurance
Rent Agreement / Stamp Duty
Pest Control
Home Cleaning Service
Packers & Movers
Furniture Purchase
Mattress / Pillow
Curtains & Blinds
Kitchen Appliances
Interior Design
False Ceiling
Tiles & Flooring
Renovation
Whitewash
Door / Window Repair
CCTV Installation
Inverter / Battery
Water Purifier
Chimney / Exhaust Fan
Wall Paint
Wallpaper
Home Decor Items
Smart Home Devices
Solar Panel
Garden Maintenance
Swimming Pool Maintenance
Lift Maintenance
`.trim(),
  ),
  mkCategory(
    5,
    'Entertainment',
    '🎬',
    '#FCE4EC',
    `
Movie - PVR
Movie - INOX
Movie - Cinepolis
Movie - BookMyShow
OTT - Netflix
OTT - Amazon Prime
OTT - Disney+ Hotstar
OTT - SonyLIV
OTT - ZEE5
OTT - Jio Cinema
OTT - MX Player
OTT - Apple TV+
OTT - Aha
Concert Tickets
Stand-up Comedy Show
Theatre / Drama
Circus
Magic Show
Puppet Show
Amusement Park
Water Park
Theme Park
Bowling Alley
Billiards / Snooker
VR Gaming
Arcade Games
Escape Room
Laser Tag
Trampoline Park
Gaming - Mobile Top-up
Gaming - PS/Xbox
Board Games / Card Games
Karaoke
Nightclub / Lounge
DJ Night
Disc / Party
Sports Match Ticket (IPL/ISL)
Kabaddi Match
Wrestling / Kushti Event
Kite Flying Event
Petting Zoo
Aquarium
Museum / Science Center
Art Gallery
Book Fair
Comic Con
Cultural Festival
Dance Performance
Magic Festival
`.trim(),
  ),
  mkCategory(
    6,
    'Health & Medical',
    '🏥',
    '#FFEBEE',
    `
Doctor Consultation
Specialist Consultation
AYUSH Doctor
General OPD
Emergency Visit
Hospitalisation
Day Care Procedure
ICU Charges
Surgery
Pathology Tests
Blood Tests
X-Ray
MRI / CT Scan
Ultrasound
ECG
Urine Test
Stool Test
COVID Test
Medicine - Allopathy
Medicine - Ayurveda
Medicine - Homeopathy
Medicine - Unani
Pharmacy Bill
Dental Consultation
Dental Treatment
Tooth Extraction
Braces / Invisalign
Dental X-Ray
Eye Checkup
Spectacles / Lenses
LASIK Surgery
Hearing Aid
Physiotherapy
Occupational Therapy
Speech Therapy
Mental Health / Therapy
Psychiatrist
Counselling
De-addiction
Health Insurance Premium
Ambulance
Blood Bank
Vaccination
Child Immunisation
Vitamin / Supplements
Protein Powder
Protein Bar
Yoga Session
Meditation App
Fitness Equipment
Dietitian / Nutritionist
`.trim(),
  ),
  mkCategory(
    7,
    'Shopping',
    '🛍️',
    '#FFF8E1',
    `
Clothing - Casual
Clothing - Formal
Ethnic Wear
Saree
Lehenga
Kurta / Kurti
Salwar Kameez
Sherwanis
Dhoti / Lungi
T-Shirt / Jeans
Sportswear
Innerwear / Lingerie
Socks / Stockings
Sleepwear
Rainwear
Footwear - Casual
Footwear - Formal
Footwear - Sports
Footwear - Ethnic (Juttis)
Slippers / Chappals
Bags - Handbag
Bags - Backpack
Bags - Laptop Bag
Bags - School Bag
Accessories - Watch
Accessories - Sunglasses
Accessories - Belt
Accessories - Jewellery (Gold)
Accessories - Jewellery (Silver)
Accessories - Artificial Jewellery
Accessories - Hair Accessories
Electronics - Mobile
Electronics - Laptop
Electronics - Tablet
Electronics - Headphones
Electronics - Smart Watch
Electronics - Camera
Electronics - TV
Electronics - AC
Electronics - Refrigerator
Electronics - Washing Machine
Electronics - Mixer / Grinder
Electronics - Microwave
Electronics - Air Purifier
Stationery
Toys
Games
Sports Equipment
Hobby Items
Online - Amazon
Online - Flipkart
Online - Myntra
Online - Ajio
Online - Meesho
Online - Nykaa
`.trim(),
  ),
  mkCategory(
    8,
    'Education',
    '📚',
    '#E0F2F1',
    `
School Fees
College Tuition Fees
University Fees
Hostel Fees
Mess Fees
Books - School
Books - College
Books - Competitive Exam
Books - Self-Help
Books - Fiction / Non-Fiction
Stationery - Notebooks
Stationery - Pens / Pencils
Stationery - Geometry Box
Stationery - Art Supplies
Uniform
School Bag
School Shoes
Coaching - JEE
Coaching - NEET
Coaching - UPSC / IAS
Coaching - CA / CMA
Coaching - GATE
Coaching - Banking / SSC
Coaching - CLAT
Online Course - Udemy
Online Course - Coursera
Online Course - Unacademy
Online Course - BYJU's
Online Course - Vedantu
Online Course - PhysicsWallah
Skill Development
Language Classes
Music Classes
Dance Classes
Art / Drawing Classes
Craft Classes
Yoga Teacher Training
Certification Exam Fee
Entrance Exam Fee
Board Exam Fee
University Exam Fee
Photocopy / Printing
Educational Trips
Science Exhibition
Tuition / Home Tutor
Library Membership
Internship Fees
Study Abroad Consultancy
Visa for Study
IELTS / TOEFL / GRE Fees
`.trim(),
  ),
  mkCategory(
    9,
    'Travel & Trips',
    '✈️',
    '#E8EAF6',
    `
Flight Booking
Train Booking - IRCTC
Bus Booking - RedBus
Bus Booking - AbhiBus
Hotel Booking - OYO
Hotel Booking - MakeMyTrip
Hotel Booking - Goibibo
Hotel Booking - Booking.com
Hotel Booking - Airbnb
Resort Stay
Homestay
Hostel / Dorm
Dharamshala / Ashram
Camping Stay
Houseboat
Holiday Package
Adventure Package
Honeymoon Package
Family Package
Group Tour
Solo Travel
Sightseeing & Tickets
Cable Car / Ropeway
Boat Ride / River Cruise
Safari
Zoo / National Park Entry
Pilgrimage / Yatra - Char Dham
Pilgrimage / Yatra - Amarnath
Pilgrimage - Shirdi
Pilgrimage - Vaishno Devi
Pilgrimage - Tirupati
Pilgrimage - Haridwar / Rishikesh
Weekend Getaway
Hill Station Trip
Beach Trip
Desert Trip
Wildlife Trip
Backpacking
International Travel
Visa Fees
Travel Insurance
Foreign Exchange / Forex
Luggage & Travel Bags
Travel Accessories
Snorkeling / Diving
Paragliding
Bungee Jumping
Trekking / Hiking
Ski / Snow Activities
Travel SIM Card
Roaming Charges
`.trim(),
  ),
  mkCategory(
    10,
    'Utilities & Bills',
    '📱',
    '#ECEFF1',
    `
Mobile Recharge - Jio
Mobile Recharge - Airtel
Mobile Recharge - Vi
Mobile Recharge - BSNL
Postpaid Bill - Jio
Postpaid Bill - Airtel
Postpaid Bill - Vi
Broadband - Jio Fiber
Broadband - Airtel Xstream
Broadband - ACT
Broadband - BSNL
DTH - Tata Sky / Tata Play
DTH - Dish TV
DTH - Sun Direct
DTH - Videocon
Cable TV
OTT Bundle
Electricity - State Board
Electricity - MSEDCL
Electricity - BESCOM
Electricity - BSES
Water Board Bill
Piped Gas (IGL/MGL)
LPG Cylinder Booking
Landline Bill
Toll / FASTag
E-stamp / E-court Fees
Aadhaar / PAN Services
Passport Fees
Driving Licence Fees
Vehicle RC Renewal
Pollution Check
Netflix Subscription
Spotify / Wynk
YouTube Premium
iCloud / Google One Storage
Microsoft 365
Adobe Creative Cloud
Antivirus Subscription
VPN Subscription
Domain Renewal
Web Hosting
GST Filing Fees
TDS Compliance
Income Tax E-filing
ROC Filing
`.trim(),
  ),
];
