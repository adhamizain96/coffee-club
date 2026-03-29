import "dotenv/config";
import { PrismaClient, TagType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma Dev uses a proxy URL (prisma+postgres://...) for migrations/push,
// but PrismaPg adapter needs the raw PostgreSQL connection string.
// SEED_DATABASE_URL allows overriding for direct PG connections.
const connectionString = process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Real cafe images
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
        imageUrl: CAFE_IMAGES[i] ?? CAFE_IMAGES[0],
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
