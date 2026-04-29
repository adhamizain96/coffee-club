import "dotenv/config";
import { PrismaClient, TagType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma Dev uses a proxy URL (prisma+postgres://...) for migrations/push,
// but PrismaPg adapter needs the raw PostgreSQL connection string.
// SEED_DATABASE_URL allows overriding for direct PG connections.
const connectionString = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Real cafe images. The first 10 are cafe-specific (matching the original 10 cafes by index).
// Cafes beyond index 9 reuse these 10 URLs in rotation via modulo — real URLs we know are
// stable, but not matched to the cafe. Per-cafe images for the new entries should be sourced
// as a follow-up.
const CAFE_IMAGES = [
  "https://sprudge.com/wp-content/uploads/2017/03/Sprudge-Metric_Coffee_Exterior_Michael_Light_05.jpg", // Metric
  "https://images.squarespace-cdn.com/content/v1/668bf6b529c84b0af3f577c5/dc0053c3-e872-41de-8bde-1aeb92506092/Sawada-Coffee-10DEC2015-006.jpg", // Sawada
  "https://www.darkmattercoffee.com/cdn/shop/files/Osmium_Exterior-Drone-1x1-2.jpg?v=1749497017&width=2160", // Osmium
  "https://www.brian-coffee-spot.com/wp-content/uploads/2017/09/Header-Wormhole-DSC_7791h.jpg", // Wormhole
  "https://www.darkmattercoffee.com/cdn/shop/files/Star_Lounge-Exterior-Drone_Photo-1x1.jpg?v=1739553051&width=2160", // Dark Matter
  "https://colectivo.com/cdn/shop/files/cafe-header-evanston.webp?v=1706127098", // Colectivo
  "https://bridgeportcoffee.net/wp-content/uploads/2022/04/FarmersWeKnow.jpg", // Bridgeport
  "https://groundswellcoffeeroasters.com/cdn/shop/files/iStock-864181792_1400x.jpg?v=1645114069", // Groundswell
  "https://www.dollopcoffee.com/wp-content/uploads/2025/12/Dollop-coffee-coffee-cup.png", // Dollop
  "https://images.squarespace-cdn.com/content/v1/5af1dd693917ee9e7860760b/1651855133030-YSMYVQ4WP6V12D5ABMSB/Sip+Latte+Art+BK.jpg", // Sip of Hope
];

const amenityTags = [
  // Core amenities
  "wifi", "outlets", "outdoor_seating", "pet_friendly", "parking",
  // Seating
  "bar_seating", "communal_tables", "couch_seating",
  // Work Friendliness
  "laptop_friendly", "meeting_space", "no_laptops",
  // Food Options
  "full_menu", "pastries_only", "vegan_options",
  // Noise Level
  "whisper_quiet", "moderate_noise", "bustling",
  // Hours
  "early_bird", "late_night", "weekend_brunch",
] as const;
const vibeTags = ["cozy", "study-friendly", "quiet", "lively", "bright", "date-spot"] as const;

interface CafeSeed {
  name: string;
  description: string;
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  ownerReview: string;
  amenities: (typeof amenityTags)[number][];
  vibes: (typeof vibeTags)[number][];
  notes: { content: string; authorName: string | null }[];
}

const cafes: CafeSeed[] = [
  {
    name: "Metric Coffee",
    description:
      "A spacious roastery and cafe in Fulton Market with industrial charm and exceptional single-origin pour-overs.",
    address: "2021 W Fulton St, Chicago, IL 60612",
    neighborhood: "Fulton Market",
    latitude: 41.8867,
    longitude: -87.6791,
    ownerReview:
      "Metric is the real deal for coffee nerds. The space is huge and airy with exposed brick and concrete floors. Their rotating single-origins are always interesting, and the baristas actually know their stuff. Not the coziest spot, but the quality speaks for itself.",
    amenities: ["wifi", "outlets", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["lively", "bright"],
    notes: [
      {
        content:
          "The cortado here is perfect every time. I come at least three times a week.",
        authorName: "Jake",
      },
      {
        content:
          "Great space for working in the morning before it gets crowded around noon. The pastries from their partner bakery are solid too.",
        authorName: null,
      },
      {
        content:
          "Parking is tough in Fulton Market but worth the trip. Their Ethiopian beans are incredible.",
        authorName: "Priya",
      },
    ],
  },
  {
    name: "Sawada Coffee",
    description:
      "A sleek West Loop spot known for its military latte — a matcha-espresso hybrid that's become a Chicago icon.",
    address: "112 N Green St, Chicago, IL 60607",
    neighborhood: "West Loop",
    latitude: 41.8838,
    longitude: -87.6489,
    ownerReview:
      "Sawada is where coffee meets creativity. The military latte is a must-try even if you're skeptical about matcha-espresso combos. The space is compact but beautifully designed, tucked inside the Green Street Smoked Meats building. Go for the experience.",
    amenities: ["wifi", "bar_seating", "no_laptops", "pastries_only", "bustling"],
    vibes: ["lively", "date-spot"],
    notes: [
      {
        content:
          "The military latte lives up to the hype. Sweet, creamy, and somehow the matcha and espresso just work together.",
        authorName: "Lena",
      },
      {
        content:
          "Small seating area so don't plan on camping here for hours. But the drinks are top-notch.",
        authorName: null,
      },
    ],
  },
  {
    name: "Osmium Coffee Bar",
    description:
      "A tiny, immaculate coffee bar in Wicker Park with a serious dedication to precision brewing and seasonal menus.",
    address: "1117 N Damen Ave, Chicago, IL 60622",
    neighborhood: "Wicker Park",
    latitude: 41.9018,
    longitude: -87.6777,
    ownerReview:
      "Osmium is for people who take coffee seriously without being pretentious about it. The baristas are meticulous, the seasonal menu rotates thoughtfully, and the space — though small — is beautifully curated. My favorite pour-over in the city.",
    amenities: ["wifi", "outlets", "bar_seating", "laptop_friendly", "pastries_only", "whisper_quiet"],
    vibes: ["quiet", "cozy"],
    notes: [
      {
        content:
          "Genuinely the best pour-over I've had in Chicago. They take their time and it shows.",
        authorName: "Marcus",
      },
      {
        content:
          "Tiny spot, maybe 10 seats. Come early on weekends or you'll be standing.",
        authorName: "Sam",
      },
      {
        content:
          "Their seasonal drinks are always creative. Had a lavender honey latte last spring that I still think about.",
        authorName: null,
      },
    ],
  },
  {
    name: "The Wormhole Coffee",
    description:
      "A retro 80s-themed cafe in Wicker Park with a DeLorean parked inside and solid espresso drinks in a fun atmosphere.",
    address: "1462 N Milwaukee Ave, Chicago, IL 60622",
    neighborhood: "Wicker Park",
    latitude: 41.9082,
    longitude: -87.6744,
    ownerReview:
      "Wormhole nails the balance between novelty and quality. Yes, there's a DeLorean inside. Yes, the walls are covered in 80s nostalgia. But the coffee is legitimately good — Intelligensia beans, well-pulled shots. It's fun without being gimmicky.",
    amenities: ["wifi", "outlets", "pet_friendly", "couch_seating", "laptop_friendly", "vegan_options", "moderate_noise", "weekend_brunch"],
    vibes: ["lively", "cozy"],
    notes: [
      {
        content:
          "Love the vibe here. Great for casual hangouts. The iced coffee is super smooth.",
        authorName: "Diana",
      },
      {
        content:
          "My go-to work spot when I need a change of scenery. The DeLorean never gets old honestly.",
        authorName: null,
      },
    ],
  },
  {
    name: "Dark Matter Coffee — Star Lounge",
    description:
      "The flagship cafe of Chicago's beloved punk-rock roaster, with bold blends and an unapologetically loud aesthetic.",
    address: "738 N Western Ave, Chicago, IL 60612",
    neighborhood: "Ukrainian Village",
    latitude: 41.8957,
    longitude: -87.6872,
    ownerReview:
      "Dark Matter doesn't play it safe, and that's exactly why I love it. The UniverSoul blend is my daily driver. Star Lounge has that perfectly chaotic energy — art everywhere, loud music sometimes, but the coffee is always dialed in.",
    amenities: ["wifi", "outdoor_seating", "pet_friendly", "communal_tables", "full_menu", "bustling", "early_bird"],
    vibes: ["lively", "bright"],
    notes: [
      {
        content:
          "UniverSoul blend is dangerously good. I've been buying bags of it for home too.",
        authorName: "Chris",
      },
      {
        content:
          "The patio is great in summer. They're dog-friendly which is a huge plus for me.",
        authorName: "Alex",
      },
      {
        content:
          "Not the quietest spot for focused work but the energy is amazing if you want a creative buzz.",
        authorName: null,
      },
    ],
  },
  {
    name: "Colectivo Coffee — Evanston",
    description:
      "A warm, welcoming cafe in downtown Evanston popular with Northwestern students for its generous space and reliable coffee.",
    address: "1631 Sherman Ave, Evanston, IL 60201",
    neighborhood: "Evanston",
    latitude: 41.8955,
    longitude: -87.6836,
    ownerReview:
      "Colectivo Evanston is the quintessential college-town cafe. Plenty of tables, fast wifi, and a menu that goes beyond just coffee — their bakery items are baked in-house and genuinely good. Perfect for a long study session or catching up with friends.",
    amenities: ["wifi", "outlets", "outdoor_seating", "parking", "communal_tables", "laptop_friendly", "full_menu", "moderate_noise", "weekend_brunch"],
    vibes: ["study-friendly", "bright", "lively"],
    notes: [
      {
        content:
          "Best study spot near Northwestern. I basically lived here during finals week.",
        authorName: "Taylor",
      },
      {
        content:
          "The berry scone is incredible. Coffee is consistent — nothing groundbreaking but always solid.",
        authorName: null,
      },
    ],
  },
  {
    name: "Bridgeport Coffeehouse",
    description:
      "A neighborhood staple in Bridgeport with a living-room feel, local art on the walls, and a loyal community of regulars.",
    address: "3101 S Morgan St, Chicago, IL 60608",
    neighborhood: "Bridgeport",
    latitude: 41.8378,
    longitude: -87.6512,
    ownerReview:
      "Bridgeport Coffeehouse feels like someone's cool aunt's living room. Mismatched furniture, local art everywhere, and a crowd that ranges from artists to retirees to WFH folks. The coffee is good, the pastries are great, and the vibe is unmatched.",
    amenities: ["wifi", "outlets", "pet_friendly", "couch_seating", "laptop_friendly", "pastries_only", "whisper_quiet", "late_night"],
    vibes: ["cozy", "quiet", "study-friendly"],
    notes: [
      {
        content:
          "This place has soul. I moved out of Bridgeport and still come back here for the vibes.",
        authorName: "Maria",
      },
      {
        content:
          "Great for reading or writing. Never too loud, never too empty. The chai is excellent.",
        authorName: null,
      },
      {
        content:
          "They host local art shows and open mic nights. Really embedded in the community.",
        authorName: "Jordan",
      },
    ],
  },
  {
    name: "Groundswell Coffee — Oak Park",
    description:
      "A bright, airy suburban cafe in Oak Park with a focus on direct-trade coffee and community gathering.",
    address: "7228 Madison St, Forest Park, IL 60130",
    neighborhood: "Oak Park",
    latitude: 41.8806,
    longitude: -87.8134,
    ownerReview:
      "Groundswell is what every suburb deserves — a thoughtful, quality-focused cafe that also functions as a community hub. Their direct-trade sourcing is legit, the space is beautiful, and the staff remembers your name after two visits.",
    amenities: ["wifi", "outlets", "parking", "outdoor_seating", "communal_tables", "laptop_friendly", "vegan_options", "moderate_noise", "early_bird"],
    vibes: ["bright", "quiet", "study-friendly"],
    notes: [
      {
        content:
          "Best coffee in the western suburbs, hands down. The cold brew concentrate is addictive.",
        authorName: "Ryan",
      },
      {
        content:
          "Love that they have real parking. The space is gorgeous — tons of natural light.",
        authorName: null,
      },
    ],
  },
  {
    name: "Dollop Coffee — Streeterville",
    description:
      "A polished downtown cafe near the Magnificent Mile with strong drinks and a sleek modern interior perfect for a quick meeting.",
    address: "345 E Ohio St, Chicago, IL 60611",
    neighborhood: "Streeterville",
    latitude: 41.8927,
    longitude: -87.6178,
    ownerReview:
      "Dollop Streeterville is the most refined cafe on this list. Clean lines, great lighting, and espresso drinks that are consistently excellent. It's a popular spot for quick meetings and laptop work. Not cheap, but the quality justifies it.",
    amenities: ["wifi", "outlets", "bar_seating", "meeting_space", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["bright", "quiet", "date-spot"],
    notes: [
      {
        content:
          "My go-to for coffee meetings downtown. Professional atmosphere without feeling stuffy.",
        authorName: "Nicole",
      },
      {
        content:
          "The oat milk latte is perfect here. They don't charge extra for alt milk which is a nice touch.",
        authorName: "Ben",
      },
      {
        content:
          "Can get crowded midday with the tourist traffic from nearby Michigan Ave. Morning is best.",
        authorName: null,
      },
    ],
  },
  {
    name: "Sip of Hope",
    description:
      "A cafe in Logan Square where 100% of profits support mental health education and suicide prevention. Great coffee, greater cause.",
    address: "3039 W Fullerton Ave, Chicago, IL 60647",
    neighborhood: "Logan Square",
    latitude: 41.9249,
    longitude: -87.7046,
    ownerReview:
      "Sip of Hope proves that a cafe can be both mission-driven and genuinely excellent. The coffee is sourced from Dark Matter, the space is warm and inviting, and every dollar you spend goes toward mental health resources. It's feel-good in the best way.",
    amenities: ["wifi", "outlets", "outdoor_seating", "pet_friendly", "parking", "couch_seating", "laptop_friendly", "vegan_options", "whisper_quiet", "weekend_brunch"],
    vibes: ["cozy", "quiet", "study-friendly", "bright"],
    notes: [
      {
        content:
          "Love what this place stands for. The fact that the coffee is also excellent makes it even better.",
        authorName: "Emi",
      },
      {
        content:
          "Great patio in summer. The baristas are some of the friendliest in the city.",
        authorName: null,
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // Suburban additions (verified via web search; addresses confirmed open in 2026).
  // Coordinates are best-knowledge estimates from street addresses — accurate to
  // the block but should be re-geocoded against Google Maps as a follow-up.
  // ---------------------------------------------------------------------------
  {
    name: "Backlot Coffee",
    description:
      "An independent neighborhood coffeehouse and roastery on Central Street in north Evanston, serving locally roasted beans, pastries, breakfast, and lunch.",
    address: "2006 Central St, Evanston, IL 60201",
    neighborhood: "Evanston",
    latitude: 42.0658,
    longitude: -87.7090,
    ownerReview:
      "Backlot is the model for what a neighborhood roaster should be. They roast in-house, the staff knows regulars by name, and the Central Street strip around them has a small-town feel. Solid pour-overs and a tight breakfast/lunch menu that rotates seasonally.",
    amenities: ["wifi", "outlets", "parking", "outdoor_seating", "laptop_friendly", "full_menu", "moderate_noise", "early_bird"],
    vibes: ["cozy", "bright", "study-friendly"],
    notes: [
      {
        content: "Their house roast is consistently great. Worth the trip up to Central Street.",
        authorName: "Sasha",
      },
      {
        content: "Gets busy on weekends but seating turnover is decent. Free street parking nearby.",
        authorName: null,
      },
    ],
  },
  {
    name: "Brothers K Coffeehouse",
    description:
      "A south Evanston staple on Main Street with a deep-rooted community feel, named for the Dostoevsky novel and beloved by NU students and locals alike.",
    address: "500 Main St, Evanston, IL 60202",
    neighborhood: "Evanston",
    latitude: 42.0277,
    longitude: -87.6830,
    ownerReview:
      "Brothers K has the lived-in soul of a true neighborhood coffeehouse. Wood-paneled walls, mismatched tables, and a steady mix of students hammering on laptops alongside retirees reading the paper. Coffee is reliable, atmosphere is the draw.",
    amenities: ["wifi", "outlets", "communal_tables", "couch_seating", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["cozy", "study-friendly", "lively"],
    notes: [
      {
        content: "Studied for the bar exam here for three months. Outlets everywhere, and they don't kick you out.",
        authorName: "Daniel",
      },
      {
        content: "New ownership since late 2024 has kept the vibe intact. Glad they didn't change anything.",
        authorName: null,
      },
    ],
  },
  {
    name: "Newport Coffee House",
    description:
      "A downtown Evanston classic on Davis Street, serving Chicago's North Shore since 1992 with single-origin coffees from around the world.",
    address: "622 Davis St, Evanston, IL 60201",
    neighborhood: "Evanston",
    latitude: 42.0461,
    longitude: -87.6803,
    ownerReview:
      "Newport has been on Davis since 1992 and earns it. The bean selection runs deep — they'll grind for whatever brew method you mention — and the room itself feels like a piece of pre-Starbucks coffee history. Easy walking distance from the Davis CTA stop.",
    amenities: ["wifi", "outlets", "bar_seating", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["cozy", "quiet", "bright"],
    notes: [
      {
        content: "The fact that this place has been here since '92 says everything. Coffee is excellent.",
        authorName: "Margaret",
      },
    ],
  },
  {
    name: "Reprise Coffee Roasters",
    description:
      "A specialty roaster's flagship cafe on Main Street in south Evanston, with carefully sourced single-origins and a clean, modern aesthetic.",
    address: "710 Main St, Evanston, IL 60202",
    neighborhood: "Evanston",
    latitude: 42.0277,
    longitude: -87.6794,
    ownerReview:
      "Reprise takes the technical side of coffee seriously without making customers feel like they need a wiki tab open to order. Espresso is dialed in daily, the pour-over menu rotates often, and the room is calm enough to actually focus.",
    amenities: ["wifi", "outlets", "bar_seating", "laptop_friendly", "pastries_only", "whisper_quiet", "early_bird"],
    vibes: ["quiet", "bright", "study-friendly"],
    notes: [
      {
        content: "Best espresso in Evanston, full stop. Their decaf is also unusually good.",
        authorName: "Iris",
      },
      {
        content: "Limited seating but the coffee bar is a great place to chat with the baristas.",
        authorName: null,
      },
    ],
  },
  {
    name: "Central Station Coffee & Tea",
    description:
      "A downtown Wilmette cafe on Central Avenue offering espresso, tea, made-from-scratch sandwiches, salads, and quiches near the Metra station.",
    address: "1150 Central Ave, Wilmette, IL 60091",
    neighborhood: "Wilmette",
    latitude: 42.0727,
    longitude: -87.7233,
    ownerReview:
      "Central Station is the village square cafe Wilmette deserves. Coffee, tea, and a real lunch menu — quiches and sandwiches that go beyond the usual pastry case. Steps from the Metra, so it doubles as a commuter pit stop.",
    amenities: ["wifi", "outlets", "outdoor_seating", "parking", "laptop_friendly", "full_menu", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["bright", "cozy", "study-friendly"],
    notes: [
      {
        content: "Their quiche is the move. Excellent lunch spot, not just coffee.",
        authorName: "Patrick",
      },
    ],
  },
  {
    name: "Glenview Grind",
    description:
      "An independent downtown Glenview shop with a drive-thru, private-label roasted coffee, smoothies, and pastries. Family-owned, not a chain.",
    address: "1837 Glenview Rd, Glenview, IL 60025",
    neighborhood: "Glenview",
    latitude: 42.0795,
    longitude: -87.8260,
    ownerReview:
      "The drive-thru alone makes Glenview Grind a Glenview essential, but the coffee holds up if you stop in. Private-label roasts, gourmet teas, and a bench out front that's the unofficial neighborhood meeting spot on weekend mornings.",
    amenities: ["wifi", "outlets", "parking", "outdoor_seating", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["cozy", "bright"],
    notes: [
      {
        content: "The drive-thru saves my mornings. Coffee is genuinely good, not just convenient.",
        authorName: "Rachel",
      },
    ],
  },
  {
    name: "Bean Bar",
    description:
      "A Northbrook coffee bar on Cherry Lane with a warm interior and a focused menu of espresso drinks and pastries.",
    address: "1901 Cherry Ln, Northbrook, IL 60062",
    neighborhood: "Northbrook",
    latitude: 42.1226,
    longitude: -87.8270,
    ownerReview:
      "Bean Bar is the kind of small, well-run shop you wish every suburb had. Espresso is dialed, the room is bright, and the staff treats every drink like it matters. A welcome alternative to the chains that dominate the Edens corridor.",
    amenities: ["wifi", "outlets", "parking", "bar_seating", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["bright", "cozy", "study-friendly"],
    notes: [
      {
        content: "Finally, a real coffee shop near me. The cortado is excellent.",
        authorName: "Eli",
      },
    ],
  },
  {
    name: "Complimentary Cafe & Co",
    description:
      "A Highland Park spot on St Johns Avenue serving thoughtfully prepared coffee and matcha lattes alongside fresh pastries and savory empanadas.",
    address: "1700 St Johns Ave, Highland Park, IL 60035",
    neighborhood: "Highland Park",
    latitude: 42.1849,
    longitude: -87.8023,
    ownerReview:
      "Complimentary nails the Highland Park brief — polished, generous service, and a menu that goes well past coffee. The empanadas are legitimately a meal, and the matcha is among the better ones on the North Shore.",
    amenities: ["wifi", "outdoor_seating", "parking", "laptop_friendly", "full_menu", "vegan_options", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["bright", "date-spot", "cozy"],
    notes: [
      {
        content: "The empanadas are the surprise hit here. Coffee is great too.",
        authorName: "Noor",
      },
    ],
  },
  {
    name: "Harmony Coffee Bar",
    description:
      "A modern Highland Park coffee bar on Central Avenue with a clean, minimal aesthetic and carefully sourced espresso drinks.",
    address: "610 Central Ave Ste 155, Highland Park, IL 60035",
    neighborhood: "Highland Park",
    latitude: 42.1867,
    longitude: -87.8019,
    ownerReview:
      "Harmony is the polished, design-forward end of the Highland Park coffee scene. Bright space, attentive baristas, drinks that reward slowing down. Closed Sundays, which is a quirk you learn fast.",
    amenities: ["wifi", "outlets", "parking", "bar_seating", "laptop_friendly", "pastries_only", "whisper_quiet", "early_bird"],
    vibes: ["bright", "quiet", "date-spot"],
    notes: [
      {
        content: "Heads up: closed Sundays. Otherwise a perfect weekday morning stop.",
        authorName: null,
      },
    ],
  },
  {
    name: "Hometown Coffee & Juice",
    description:
      "A Lake Forest favorite on Wisconsin Avenue blending a coffee bar with a juice and smoothie program, in the heart of the downtown shopping district.",
    address: "231 E Wisconsin Ave, Lake Forest, IL 60045",
    neighborhood: "Lake Forest",
    latitude: 42.2569,
    longitude: -87.8398,
    ownerReview:
      "Hometown is what makes downtown Lake Forest feel alive on weekday mornings. Half coffee bar, half juice and smoothie counter — the dual menu means it works for whoever you bring with you, and the room is a constant low buzz of regulars.",
    amenities: ["wifi", "outdoor_seating", "parking", "communal_tables", "laptop_friendly", "vegan_options", "full_menu", "moderate_noise", "early_bird"],
    vibes: ["bright", "lively", "cozy"],
    notes: [
      {
        content: "The acai bowls are fantastic. Coffee is solid too. Best part of downtown LF.",
        authorName: "Whitney",
      },
    ],
  },
  {
    name: "Gerry's Café",
    description:
      "A mission-driven Arlington Heights coffee shop staffed by adults with intellectual and developmental disabilities. Excellent coffee with real social impact.",
    address: "1802 N Arlington Heights Rd, Arlington Heights, IL 60004",
    neighborhood: "Arlington Heights",
    latitude: 42.1153,
    longitude: -87.9803,
    ownerReview:
      "Gerry's is special. The staff is built around employing people with intellectual and developmental disabilities, and it shows in every interaction — the place runs on genuine care. The coffee program is no afterthought either: real espresso drinks, real attention to detail.",
    amenities: ["wifi", "outlets", "parking", "communal_tables", "laptop_friendly", "full_menu", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["bright", "lively", "cozy"],
    notes: [
      {
        content: "The mission alone would bring me back. The coffee is genuinely great too.",
        authorName: "Theo",
      },
      {
        content: "One of the warmest cafes I've been in. Bring friends.",
        authorName: null,
      },
    ],
  },
  {
    name: "Two Libras Cafe",
    description:
      "A small family-owned 'Euro-ish' cafe tucked in a downtown Palatine alleyway, with hot and cold drinks, smoothies, pastries, and French-style sandwiches.",
    address: "10 N Bothwell St, Palatine, IL 60067",
    neighborhood: "Palatine",
    latitude: 42.1110,
    longitude: -88.0339,
    ownerReview:
      "Two Libras feels like stumbling into a hidden cafe in a small European town — except it's a downtown Palatine alley. The 'French-ish' sandwiches are the move at lunch, and the space punches well above its size. Closed Mondays.",
    amenities: ["wifi", "outdoor_seating", "communal_tables", "laptop_friendly", "full_menu", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["cozy", "date-spot", "bright"],
    notes: [
      {
        content: "The alley location is a feature, not a bug. Loved finding this place.",
        authorName: "Mira",
      },
      {
        content: "Closed Mondays — learned the hard way. Otherwise outstanding.",
        authorName: null,
      },
    ],
  },
  {
    name: "Sayfani Coffee House",
    description:
      "A community-centered Schaumburg coffee house on Golf Road offering exceptional coffee and tea in a warm, locally-rooted setting.",
    address: "157 W Golf Rd, Schaumburg, IL 60195",
    neighborhood: "Schaumburg",
    latitude: 42.0566,
    longitude: -88.0828,
    ownerReview:
      "Sayfani is the Schaumburg coffee shop that proves you don't have to go to the city to find a real one. Warm room, attentive service, drinks that go beyond the usual suburban-strip-mall coffee. A genuine community spot in a part of the suburbs that doesn't have many.",
    amenities: ["wifi", "outlets", "parking", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["cozy", "bright", "study-friendly"],
    notes: [
      {
        content: "Easy parking and good coffee in Schaumburg is rare. This is my new go-to.",
        authorName: "Karim",
      },
    ],
  },
  {
    name: "Conscious Cup Coffee Roasters",
    description:
      "A family-owned Barrington roaster operating since 2006, with a focus on ethically sourced beans and a strong community-roaster identity.",
    address: "100 E Station St, Barrington, IL 60010",
    neighborhood: "Barrington",
    latitude: 42.1531,
    longitude: -88.1380,
    ownerReview:
      "Conscious Cup has been roasting in Barrington since 2006 and the depth shows. The sourcing story is real — they actually talk about the farms — and the Cook Street location is a comfortable place to spend an hour. The retail beans are worth taking home.",
    amenities: ["wifi", "outlets", "outdoor_seating", "parking", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["cozy", "quiet", "bright"],
    notes: [
      {
        content: "Bag of their Ethiopia natural beans is a permanent fixture in my kitchen.",
        authorName: "Helena",
      },
    ],
  },
  {
    name: "Kribi Coffee",
    description:
      "An Oak Park roaster sourcing green beans directly from farmers in Cameroon, where the owner is from. Air-roasted, single-origin, with a clear point of view.",
    address: "1033 South Blvd, Oak Park, IL 60302",
    neighborhood: "Oak Park",
    latitude: 41.8745,
    longitude: -87.7953,
    ownerReview:
      "Kribi has one of the clearest origin stories in the Chicago area — owner Jacques Shalo sources green beans directly from Cameroon, and the air-roasting setup gives the cups a distinct profile. Worth a trip even if you're not in Oak Park.",
    amenities: ["wifi", "outlets", "parking", "bar_seating", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["bright", "quiet", "study-friendly"],
    notes: [
      {
        content: "The Cameroon single-origin is something you won't find at most shops. Distinct in the best way.",
        authorName: "Claire",
      },
    ],
  },
  {
    name: "Five & Hoek Coffee",
    description:
      "A focused take-away coffee bar on Wheaton's Main Street (formerly River City Roasters), serving carefully prepared espresso and brew without any indoor seating distractions.",
    address: "112 N Main St Unit B, Wheaton, IL 60187",
    neighborhood: "Wheaton",
    latitude: 41.8689,
    longitude: -88.1064,
    ownerReview:
      "Five & Hoek (the rebranded River City Roasters) leans hard into the take-away coffee bar concept — no indoor seating, just a clean menu and very dialed-in drinks. If you're a 'order, walk, drink' person, this is the platonic ideal of that experience.",
    amenities: ["parking", "no_laptops", "pastries_only", "early_bird"],
    vibes: ["bright"],
    notes: [
      {
        content: "Take-away only, but that's the point. Espresso is consistently dialed.",
        authorName: null,
      },
    ],
  },
  {
    name: "Sparrow Coffee",
    description:
      "Sparrow's flagship cafe on the Naperville Riverwalk, a serious roaster's space with seasonal menus and a downtown-Naperville magnetism.",
    address: "120 Water St Ste 110, Naperville, IL 60540",
    neighborhood: "Naperville",
    latitude: 41.7711,
    longitude: -88.1530,
    ownerReview:
      "Sparrow is the cafe that put Naperville on the specialty coffee map. Riverwalk location, design-forward space, and a roasting program that holds up against anything in the city. Get a window seat and a pour-over and stay a while.",
    amenities: ["wifi", "outdoor_seating", "parking", "bar_seating", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["bright", "lively", "date-spot"],
    notes: [
      {
        content: "The Riverwalk location alone is worth the trip. Coffee program is genuinely top-tier.",
        authorName: "Audrey",
      },
      {
        content: "Crowded on weekend afternoons. Mornings are calmer and the light is great.",
        authorName: null,
      },
    ],
  },
  {
    name: "Café La Fortuna",
    description:
      "A Hinsdale coffee shop on Village Place, house-roasting since 2012 and serving as the village's de facto living room.",
    address: "46 Village Pl, Hinsdale, IL 60521",
    neighborhood: "Hinsdale",
    latitude: 41.8014,
    longitude: -87.9382,
    ownerReview:
      "La Fortuna has anchored Hinsdale's coffee scene since 2012 and earned its reputation as the village's living room. House-roasted, community-first, and the kind of place where the regulars greet each other by first name. Comfortable to settle in for an hour or three.",
    amenities: ["wifi", "outlets", "outdoor_seating", "parking", "couch_seating", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["cozy", "study-friendly", "bright"],
    notes: [
      {
        content: "House-roasted and it shows. My favorite stop in Hinsdale by a wide margin.",
        authorName: "Beatrice",
      },
    ],
  },
  {
    name: "Owl & Lark",
    description:
      "A La Grange juice and coffee bar with specialty espresso, fresh-squeezed juices, smoothie bowls, and gluten-free baked goods in a cozy downtown setting.",
    address: "41 S La Grange Rd, La Grange, IL 60525",
    neighborhood: "La Grange",
    latitude: 41.8106,
    longitude: -87.8703,
    ownerReview:
      "Owl & Lark hits the wellness-cafe sweet spot without losing the plot on coffee. Smoothie bowls, fresh juices, and a real espresso program — the kind of place where you can grab breakfast with someone who hates coffee and not feel like you compromised.",
    amenities: ["wifi", "outdoor_seating", "parking", "laptop_friendly", "full_menu", "vegan_options", "moderate_noise", "early_bird", "weekend_brunch"],
    vibes: ["bright", "cozy", "study-friendly"],
    notes: [
      {
        content: "Gluten-free options that aren't an afterthought. Coffee is a real bonus.",
        authorName: "Reece",
      },
    ],
  },
  {
    name: "Pekoe & Bean",
    description:
      "A Tinley Park cafe on Oak Park Avenue offering a strong tea program alongside coffee, in a comfortable south-suburban setting.",
    address: "17028 Oak Park Ave, Tinley Park, IL 60477",
    neighborhood: "Tinley Park",
    latitude: 41.5707,
    longitude: -87.7895,
    ownerReview:
      "Pekoe & Bean leans harder on tea than most cafes around, which makes it a destination for anyone tired of an afterthought tea menu. Coffee is solid too, the room is comfortable, and the south-suburban location fills a gap on the map.",
    amenities: ["wifi", "outlets", "parking", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["cozy", "quiet", "study-friendly"],
    notes: [
      {
        content: "The loose-leaf tea selection is unusually good. Worth the drive if you're a tea person.",
        authorName: "Janelle",
      },
    ],
  },
  {
    name: "Two Mile Coffee Bar",
    description:
      "A Beverly community coffee shop on Walden Parkway partnered with Intelligentsia, anchoring the south side coffee scene.",
    address: "9907 S Walden Pkwy, Chicago, IL 60643",
    neighborhood: "Beverly",
    latitude: 41.7115,
    longitude: -87.6779,
    ownerReview:
      "Two Mile is the south-side coffee bar Beverly deserves. Intelligentsia partnership means the espresso is sharp, but the soul of the place is the regulars — kids on the way to school, neighbors meeting up before work, the steady rhythm of a community shop.",
    amenities: ["wifi", "outdoor_seating", "parking", "communal_tables", "laptop_friendly", "pastries_only", "moderate_noise", "early_bird"],
    vibes: ["cozy", "lively", "bright"],
    notes: [
      {
        content: "Best coffee on the south side. The Walden Parkway location has so much character.",
        authorName: "Keisha",
      },
      {
        content: "Closed Sundays, but worth working around. The Intelligentsia partnership shows in every cup.",
        authorName: null,
      },
    ],
  },
  {
    name: "Beverly Bakery & Cafe",
    description:
      "A family-owned Beverly bakery and roaster on Western Avenue, billed as the only Chicago coffee roaster south of Bridgeport, with 22 coffees by the cup or pound.",
    address: "10528 S Western Ave, Chicago, IL 60643",
    neighborhood: "Beverly",
    latitude: 41.7038,
    longitude: -87.6829,
    ownerReview:
      "Beverly Bakery is two beloved south-side institutions in one — a from-scratch bakery and a small roaster that fills a real gap on the map. They say they're the only Chicago coffee roaster south of Bridgeport and that's not just marketing; the bag selection is genuinely deep.",
    amenities: ["parking", "communal_tables", "full_menu", "moderate_noise", "early_bird"],
    vibes: ["cozy", "lively"],
    notes: [
      {
        content: "Coffee AND donuts. They're a roaster too. South side gem.",
        authorName: "Dominic",
      },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data in correct order (respecting foreign keys)
  await prisma.cafeTag.deleteMany();
  await prisma.note.deleteMany();
  await prisma.cafe.deleteMany();
  await prisma.tag.deleteMany();

  // Create tags
  const tagRecords = new Map<string, string>();

  for (const name of amenityTags) {
    const tag = await prisma.tag.create({
      data: { name, type: TagType.AMENITY },
    });
    tagRecords.set(name, tag.id);
  }

  for (const name of vibeTags) {
    const tag = await prisma.tag.create({
      data: { name, type: TagType.VIBE },
    });
    tagRecords.set(name, tag.id);
  }

  console.log(`Created ${tagRecords.size} tags`);

  // Create cafes with tags and notes
  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const created = await prisma.cafe.create({
      data: {
        name: cafe.name,
        description: cafe.description,
        address: cafe.address,
        neighborhood: cafe.neighborhood,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
        imageUrl: CAFE_IMAGES[i % CAFE_IMAGES.length],
        ownerReview: cafe.ownerReview,
        tags: {
          create: [...cafe.amenities, ...cafe.vibes].map((tagName) => ({
            tagId: tagRecords.get(tagName)!,
          })),
        },
        notes: {
          create: cafe.notes.map((note) => ({
            content: note.content,
            authorName: note.authorName,
          })),
        },
      },
    });

    console.log(`Created cafe: ${created.name}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
