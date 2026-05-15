import type { LastbenchCategoryInput } from './lastbench-taxonomy.types';

/** Aligns with **`import-lastbench-taxonomy`** slug rules for subcategories. */
export function slugify(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base.length > 0 ? base : 'item';
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Sub-name hints for richer subcategory icons; falls back to category **`icon`**. */
function inferSubIcon(subName: string, categoryFallback: string): string {
  const n = subName.toLowerCase().normalize('NFKD');
  const rules: ReadonlyArray<[RegExp, string]> = [
    [/pizza/, '🍕'],
    [/burger/, '🍔'],
    [/biryani/, '🍛'],
    [/sushi|ramen|japanese/, '🍣'],
    [/ice\s*cream|lassi|kulfi|gelato/, '🍦'],
    [/sweet|mithai|dessert/, '🍨'],
    [/bakery|bread|croissant/, '🥐'],
    [/coffee|chai|cafe|latte|espresso|tea\b/, '☕'],
    [/juice\b/, '🧃'],
    [/wine|beer|vodka|whiskey|bar\b|pub/, '🍺'],
    [/flight|airline|indigo|spicejet|vistara/, '✈️'],
    [/train|irctc|shatabdi|vande|rail/, '🚆'],
    [/metro\b/, '🚇'],
    [/bus\b/, '🚌'],
    [/taxi|uber|ola|rapido|cab\b/, '🚕'],
    [/auto\s*rickshaw|e-rickshaw/, '🛺'],
    [/petrol|diesel|fuel|cng\b/, '⛽'],
    [/ev\b|charging|electric\b/, '🔋'],
    [/parking|toll|fastag/, '🅿️'],
    [/movie|cinema|imax|inox|cinepolis|pvr/, '🎬'],
    [/netflix|prime|hotstar|disney|ott|spotify|music stream/, '📺'],
    [/game|playstation|xbox|gaming/, '🎮'],
    [/gym|fitness|workout|crossfit/, '🏋️'],
    [/yoga|zumba|pilates|meditat/, '🧘'],
    [/swim/, '🏊'],
    [/doctor|clinic|hospital|opd/, '🏥'],
    [/dent|tooth/, '🦷'],
    [/pharma|medicine|tablet|prescription/, '💊'],
    [/lab\b|pathology|x-ray|mri|scan\b/, '🧪'],
    [/vegetable/, '🥕'],
    [/fruit/, '🍎'],
    [/milk|curd|paneer|dairy|yogurt/, '🥛'],
    [/rice\b|atta|flour|dal|lentil|pulse/, '🍚'],
    [/egg\b/, '🥚'],
    [/chicken|mutton|meat|halal|non-veg/, '🍖'],
    [/fish|prawn|seafood/, '🐟'],
    [/water\b|mineral/, '💧'],
    [/pet\b|dog|cat\b|vet\b|aquarium/, '🐾'],
    [/school|tuition|college|university|course/, '📚'],
    [/wedding|bridal|mehendi|sangeet|baraat/, '💒'],
    [/rent\b|lease|landlord|tenant/, '🏠'],
    [/electricity|power bill|mseb|bescom/, '💡'],
    [/mobile recharge|postpaid|jio|airtel|\bvi\b|bsnl/, '📱'],
    [/broadband|wifi|fiber|dth/, '🌐'],
    [/subscription|membership|saas\b/, '📋'],
    [/gift|present|hamper/, '🎁'],
    [/loan\b|emi\b|credit card/, '💳'],
    [/insurance|premium\b/, '🛡️'],
    [/tax\b|gst\b|itr\b/, '📑'],
    [/legal|lawyer|court|notary/, '⚖️'],
    [/photo|camera|lens\b/, '📷'],
    [/laptop|computer|monitor|phone purchase/, '💻'],
  ];
  for (const [re, em] of rules) {
    if (re.test(n)) return em;
  }
  return categoryFallback;
}

/**
 * **`subsBlock`** — one subcategory per line:
 * - **`Subcategory name`** only → sub **`icon`** defaults to the **category** **`icon`**
 * - **`Name<TAB>emoji`** → explicit sub emoji (after import / API)
 */
export function mkCategory(
  id: number,
  name: string,
  icon: string,
  color: string,
  subsBlock: string,
): LastbenchCategoryInput {
  const slug = slugify(name);
  const keywords = uniq([slug, ...tokenize(name)]);
  const lines = subsBlock
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    slug,
    name,
    icon,
    color,
    sortOrder: id * 10,
    keywords,
    subcategories: lines.map((line) => {
      const tabIdx = line.indexOf('\t');
      const subName = tabIdx === -1 ? line : line.slice(0, tabIdx).trim();
      const explicitIcon = tabIdx === -1 ? '' : line.slice(tabIdx + 1).trim();
      const subIcon =
        explicitIcon.length > 0 ? explicitIcon : inferSubIcon(subName, icon);
      return {
        name: subName,
        icon: subIcon,
        keywords: uniq([slugify(subName), ...tokenize(subName)]),
      };
    }),
  };
}
