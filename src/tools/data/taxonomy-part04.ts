import type { LastbenchCategoryInput } from './lastbench-taxonomy.types';

import { mkCategory } from './taxonomy-build.helpers';

/** Categories **31–40** (**Miscellaneous** is the classifier fallback when title matches nothing). */
export const PART04: readonly LastbenchCategoryInput[] = [
  mkCategory(
    31,
    'Stationery & Office Supplies',
    '📝',
    '#E0F2F1',
    `
Notebooks
Registers
Loose Sheets / A4 Paper
Sticky Notes
Notepads
Pens - Ball Point
Pens - Gel
Pens - Fountain
Pencils
Sketch Pens / Markers
Highlighters
Eraser
Sharpener
Ruler
Scale
Geometry Box
Calculator
Stapler & Pins
Hole Punch
Scissors
Glue & Adhesives
Tape - Cello
Tape - Double-Sided
Envelopes
Files & Folders
Document Cover
Plastic Bags
Box Files
Binder Clips
Rubber Bands
Correction Fluid
Index Cards
Business Cards Printing
Letterhead Printing
Visiting Cards
ID Cards / Badge Holder
Label Maker
Stamp & Ink Pad
Paper Clips
Drawing Pins
Whiteboard & Markers
Flipchart Paper
Presentation Board
Spiral Binding
Lamination
Photocopying
Scanning Charges
Courier Envelope
Packing Tape
Bubble Wrap
`.trim(),
  ),
  mkCategory(
    32,
    'Automobile Maintenance',
    '🔧',
    '#FFF3E0',
    `
Petrol Fill-up
Diesel Fill-up
CNG Refill
EV Charging
Engine Oil Change
Oil Filter
Air Filter
Fuel Filter
Spark Plugs
Car Battery Replacement
Battery Terminals
Brake Pad Replacement
Brake Disc Replacement
Brake Fluid
Clutch Plate Replacement
Clutch Wire
Gear Box Service
Suspension Repair
Wheel Alignment
Wheel Balancing
Tyre Purchase
Tyre Puncture Repair
Tyre Rotation
Rim Repair
Car Wash - Manual
Car Wash - Automatic
Interior Cleaning
Car Polishing
Ceramic Coating
Windshield Repair
Wiper Replacement
Headlight Replacement
Tail Light Replacement
Indicator Bulb
Side Mirror Replacement
Body Dent Repair
Car Painting (Partial)
Car Painting (Full)
AC Compressor
AC Gas Refill
Radiator Service
Coolant Refill
Power Steering Fluid
Gearbox Oil
Differential Oil
Chain & Sprocket (Bike)
Bike Tyre
Bike Insurance Renewal
Car Insurance Renewal
Vehicle Fitness Certificate
Pollution Certificate
`.trim(),
  ),
  mkCategory(
    33,
    'Rent & Lease (Non-Residential)',
    '🏢',
    '#F3E5F5',
    `
Shop Rent
Office Space Rent
Warehouse Rent
Godown Rent
Commercial Kitchen Rent
Studio Rent
Event Space Rent
Party Plot Rent
Marriage Garden Rent
Banquet Hall Rent
Conference Room Rent
Coworking Desk
Coworking Cabin
Virtual Office
Parking Space (Commercial)
Open Land Lease
Agricultural Land Lease
Flat on Lease
Shop Deposit / Advance
Commercial Lease Agreement
Lease Renewal Charges
Brokerage (Commercial)
Security Deposit (Commercial)
NOC / Permission Fees
Fire NOC Charges
Municipal Approval
Signage Permission
Billboard Rent
Kiosk Rent
Market Stall Rent
Flea Market Stall
Online Marketplace Subscription
Exhibition Stall
Trade Fair Stall
Delivery Hub Space
Dark Kitchen Rent
Food Court Stall
Hotel Room Block Booking
Service Apartment
PG Accommodation
Boys Hostel
Girls Hostel
Paying Guest Fees
Student Housing
Dharamshala
Ashram Stay
Resort Membership
Club House Charges
Timeshare
`.trim(),
  ),
  mkCategory(
    34,
    'Gifts & Presents',
    '🎁',
    '#FCE4EC',
    `
Gift - Sweets Box
Gift - Dry Fruit Box
Gift - Chocolate Box
Gift - Hamper
Gift - Flowers
Gift - Bouquet
Gift - Cake
Gift - Perfume
Gift - Wallet
Gift - Watch
Gift - Jewellery
Gift - Gold Coin
Gift - Silver Coin
Gift - Idol / Murti
Gift - Religious Item
Gift - Book
Gift - Gadget
Gift - Clothing
Gift - Voucher / Gift Card
Gift - Amazon Gift Card
Gift - Flipkart Gift Card
Gift - Experience (Spa Day)
Gift - Movie Tickets
Gift - Restaurant Voucher
Gift Wrapping
Gift Box Purchase
Gift Courier
Corporate Gift
Diwali Gift to Staff
Holi Gift
Eid Gift
Christmas Gift
Teacher's Day Gift
Nurse's Day Gift
Doctor's Day Gift
Valentine's Day Gift
Mother's Day Gift
Father's Day Gift
Children's Day Gift
Grandparents Gift
Retirement Gift
Farewell Gift
Wedding Gift
Engagement Gift
Baby Shower Gift
New Born Gift
Housewarming Gift
New Car Gift
Graduation Gift
`.trim(),
  ),
  mkCategory(
    35,
    'Food Delivery & Takeaway',
    '🛵',
    '#FFF8E1',
    `
Zomato Order
Swiggy Order
Blinkit Groceries
Zepto Order
Dunzo Order
Magicpin Order
Restaurant Direct Order
Pizza Hut Order
Domino's Order
McDonald's Order
KFC Order
Burger King Order
Subway Order
Faaso's
Biryani By Kilo
Box8
Freshmenu
Lunchbox
Rebel Foods
Behrouz Biryani
Oven Story Pizza
Mojo Pizza
Faasos Wraps
Haldiram's Online
Bikanervala Online
Bikaner Sweets
Sweet Truth
Theobroma Delivery
Kala Ghoda Cafe
Social Delivery
Starbucks Delivery
CCD Delivery
Chai Point Delivery
Tea Post Order
Chaayos Order
Amul Ice Cream Delivery
Baskin-Robbins Delivery
Kwality Wall's
Natural Ice Cream Order
Giani's Ice Cream
Milk Delivery - Milkbasket
Milk Delivery - Country Delight
Dairy Delivery - Subscription
Vegetable Box - Subscription
Organic Box Delivery
Tiffin Subscription
Corporate Meal Plan
Office Lunch Order
Party Catering Order
`.trim(),
  ),
  mkCategory(
    36,
    'Loans & Debts',
    '🏦',
    '#ECEFF1',
    `
Home Loan EMI
Home Loan Prepayment
Car Loan EMI
Two-Wheeler Loan EMI
Personal Loan EMI
Education Loan EMI
Business Loan EMI
Gold Loan EMI
Loan Against Property EMI
Consumer Durable Loan
BNPL - LazyPay
BNPL - ZestMoney
BNPL - Simpl
BNPL - Slice
BNPL - OneCard
Credit Card Bill Full
Credit Card Minimum Due
Credit Card EMI
Credit Card Annual Fee
Credit Card Late Fee
Overdraft Interest
Cash Credit Account
Working Capital Loan
Chit Fund Payment
Sahukaar / Private Lender
Family / Friend Loan Repayment
Advance Salary Repayment
Vehicle EMI
Appliance EMI (No Cost)
Mobile EMI
Loan Processing Fee
Prepayment Penalty
Foreclosure Charges
Mortgage Fees
Guarantor Fees
Co-applicant Expenses
Debt Consolidation Fee
Loan Transfer Charges
CIBIL Score Check
Credit Report
Financial Advisor Fee (Loan)
Balance Transfer Fee
Interest on Delayed Payment
Penalty on Bounced Cheque
Bank Overdraft Fee
Hypothecation Removal Charges
RC Transfer after Loan Closure
Insurance Linked to Loan
`.trim(),
  ),
  mkCategory(
    37,
    'Social Life',
    '🍻',
    '#FBE9E7',
    `
Friend's Birthday Treat
Group Dinner
Group Outing
Office Party Contribution
Team Lunch
Club Membership
Association Fee
Reunion Event
Alumni Meet
College Fest
Cultural Event
Networking Event
Conference / Summit
Workshop
Seminar
Speaker Series
Hackathon Entry
Community Event
Local Festival Contribution
Mohalla Event
RWA Event
Cultural Performance
Flash Mob Event
Social Club Dinner
Annual Day Event
Sports Day Event
Farewell Dinner
Welcome Party
Kitty Party Contribution
Potluck Contribution
Game Night Expense
Movie Night Group
Road Trip Contribution
Beach Party
Camping Trip Group
Picnic Contribution
Day Trip Group
Weekend Trip
Party Supplies
Cake for Group
Decoration for Group Party
Photography for Event
Photobooth at Party
Return Gifts Purchase
Secret Santa Gift
Yankee Swap Gift
Online Group Gifting
Crowd-funded Gift
Collecting for Shared Gift
Group Ticket Purchase
Event Costume
`.trim(),
  ),
  mkCategory(
    38,
    'Freelancing & Side Income Related',
    '🖥️',
    '#E8F5E9',
    `
Fiverr Service Fees
Upwork Fees
Freelancer.com Fees
Toptal Fees
99designs Fees
Task Rabbit
Urban Company Service
Internshala Fees
Equipment for Freelancing
Portfolio Website
Business Cards
Marketing Materials
Client Meeting Expenses
Home Office Setup
Desk & Chair (Home Office)
Second Monitor
Noise-Cancelling Headphones
Freelance Accounting Software
Invoice Generator
Time Tracking Tool
Project Management Tool
Client CRM
Professional Email
Zoom / Google Meet Pro
E-Signature Tool
Contract Drafting
Legal Review of Contracts
Professional Indemnity Insurance
Health Insurance (Self-employed)
Retirement Plan (Self-employed)
Tax Consultation
Professional Development
Skill Upgrade Course
Certification Exam
Networking Event Ticket
Conference Ticket
Mentorship Fee
Coaching (Professional)
Referral Fees Paid
Subcontractor Payment
Platform Subscription (Design)
Stock Photos
Stock Videos
Stock Music Licence
Font Licence
Plugin / Add-on Purchase
API Access Fee
Third-Party Integration Costs
Data Plan (Business Use)
Travel for Client Meeting
Client Gift
`.trim(),
  ),
  mkCategory(
    39,
    'Art, Culture & Learning',
    '🎭',
    '#EDE7F6',
    `
Museum Entry
Art Gallery Entry
Science Museum
Heritage Site Visit
Historical Monument Entry
Fort / Palace Entry
Cave / Rock Art Site
Folk Art Purchase
Handicraft Purchase
Handloom Fabric
Pottery / Clay Art
Tribal Art
Madhubani Painting
Warli Art
Tanjore Painting
Kalamkari Art
Block Printing Workshop
Pottery Class
Sculpting Class
Jewellery Making Class
Embroidery Workshop
Weaving Workshop
Photography Workshop
Film Making Workshop
Acting Workshop
Stand-up Comedy Workshop
Creative Writing Workshop
Novel Writing Course
Poetry Slam Entry
Open Mic Entry
Storytelling Event
Book Club Membership
Literary Festival
Jaipur Literature Fest
Hay Festival
Dance Workshop
Classical Dance Training - Bharatanatyam
Classical Dance Training - Kathak
Classical Dance Training - Odissi
Folk Dance Training
Salsa / Ballroom Dancing
Zumba Event
Theatre Group Membership
Play Ticket
Documentary Film Festival
Short Film Festival
Poster / Print Purchase
Art Book Purchase
Craft Supply for Art
Origami Supplies
Calligraphy Workshop
`.trim(),
  ),
  mkCategory(
    40,
    'Miscellaneous',
    '📦',
    '#F1F8E9',
    `
Cash Withdrawal Charges
ATM Fees
Bank Charges
Cheque Book Request
Demand Draft Fees
NEFT / RTGS Fee
UPI Cashback Reversal
Postage & Speed Post
Registered Post
Courier - Blue Dart
Courier - DTDC
Courier - Delhivery
Courier - FedEx
Courier - DHL
Courier - India Post
Legal Documentation
Notary Fees
Affidavit Stamp
Agreement Printing
Photocopy of Documents
Lamination of Document
Passport Size Photos
Document Attestation
Translation Service
Lost Item Replacement
Stolen Item Claim
Emergency Purchase
Impulse Buy
Mystery / Untracked Spend
Petty Cash
Random Convenience Purchase
Last-Minute Purchase
Forgotten Subscription
Accidental Damage
Fine / Penalty
Library Fine
Traffic Challan
Parking Fine
Late Fee Payment
Penalty for Contract Breach
Reimbursement Given
Cash Lent to Friend
Personal Advance
Miscellaneous Repair
Odd Job Labour
Emergency Plumbing
Emergency Electrical
Emergency Locksmith
Handyman Services
Other Unclassified
`.trim(),
  ),
];
