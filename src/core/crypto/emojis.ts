import type { SafetyEmoji } from './types.ts';

// 256 emojis for safety codes, so one byte picks one. Chosen to look different from each other, to be easy to
// name aloud, and to show as a picture on every system (Unicode 12 or older, no skin tones, flags or look-alike
// faces). The order is part of every code: both sides must use the same list in the same order.
const LIST = `
🐶 dog|🐱 cat|🐭 mouse|🐹 hamster|🐰 rabbit|🦊 fox|🐻 bear|🐼 panda|🐨 koala|🐯 tiger|🦁 lion|🐮 cow|🐷 pig
🐸 frog|🐵 monkey|🐔 chicken|🐧 penguin|🐦 bird|🦆 duck|🦅 eagle|🦉 owl|🦇 bat|🐺 wolf|🐴 horse|🦄 unicorn
🐝 bee|🦋 butterfly|🐌 snail|🐞 ladybug|🐜 ant|🦂 scorpion|🐢 turtle|🐍 snake|🦎 lizard|🦖 dinosaur|🐙 octopus
🦐 shrimp|🦀 crab|🐠 fish|🐬 dolphin|🐳 whale|🦈 shark|🐊 crocodile|🦓 zebra|🦒 giraffe|🐘 elephant|🦏 rhino
🐪 camel|🦘 kangaroo|🐑 sheep|🐐 goat|🦌 deer|🦚 peacock|🦜 parrot|🦢 swan|🦩 flamingo|🦔 hedgehog|🐲 dragon
🦛 hippo|🌵 cactus|🌳 tree|🌴 palm|🌱 sprout|🍀 clover|🍁 leaf|🍄 mushroom|🌷 tulip|🌹 rose|🌻 sunflower
🌸 blossom|🌍 earth|🌙 moon|⭐ star|⚡ lightning|🔥 fire|🌈 rainbow|⛄ snowman|💧 drop|🌊 wave|🌋 volcano|🌞 sun
🪐 planet|🗻 mountain|🍎 apple|🍐 pear|🍊 orange|🍋 lemon|🍌 banana|🍉 watermelon|🍇 grapes|🍓 strawberry
🍒 cherries|🍑 peach|🍍 pineapple|🥥 coconut|🥝 kiwi|🍅 tomato|🍆 eggplant|🥑 avocado|🥦 broccoli|🥕 carrot
🌽 corn|🥔 potato|🧅 onion|🥜 peanut|🍞 bread|🥐 croissant|🧀 cheese|🥚 egg|🍔 burger|🍟 fries|🍕 pizza
🌭 hotdog|🥪 sandwich|🌮 taco|🍝 spaghetti|🍣 sushi|🍦 icecream|🍩 donut|🍪 cookie|🎂 cake|🍫 chocolate|🍬 candy
🍯 honey|🍼 milk|☕ coffee|🍺 beer|🍷 wine|🥞 pancakes|🍿 popcorn|⌚ watch|📱 phone|💻 laptop|📷 camera
📺 television|📻 radio|⏰ clock|⌛ hourglass|💡 bulb|🔋 battery|🔌 plug|💰 money|💎 diamond|🔧 wrench|🔨 hammer
🧲 magnet|🔑 key|🚪 door|🧸 teddy|🎁 gift|🎈 balloon|🎀 ribbon|🎉 party|📦 package|📌 pin|📎 paperclip|📚 books
🔒 lock|🔔 bell|🎤 microphone|🎧 headphones|🎸 guitar|🎹 piano|🎺 trumpet|🎻 violin|🥁 drum|🎨 paint|🧶 yarn
👑 crown|👓 glasses|👕 shirt|👖 jeans|🧦 socks|🧤 gloves|🧣 scarf|👗 dress|👟 sneaker|🎒 backpack|🌂 umbrella
💼 briefcase|🔭 telescope|🔬 microscope|💊 pill|🧭 compass|🛒 cart|🧹 broom|🧺 basket|🧼 soap|🪁 kite|⚓ anchor
🏆 trophy|🏅 medal|🎯 target|🎲 dice|🧩 puzzle|🎮 gamepad|🃏 joker|🎳 bowling|🎪 circus|🎭 masks|🏠 house
🏰 castle|⛺ tent|🗼 tower|⛲ fountain|🛸 ufo|🚀 rocket|🚁 helicopter|⛵ sailboat|🚢 ship|🚂 train|🚌 bus
🚒 firetruck|🚕 taxi|🚗 car|🚜 tractor|🚲 bicycle|🛴 scooter|🛹 skateboard|🚦 traffic|⛽ fuel|⚽ football
🏀 basketball|⚾ baseball|🎾 tennis|🏐 volleyball|🏓 pingpong|🏸 badminton|🥊 boxing|⛳ golf|🎣 fishing|🛷 sled
🎿 ski|🏹 archery|👻 ghost|👽 alien|🤖 robot|🎃 pumpkin|👀 eyes|👂 ear|👃 nose|👍 thumbsup|✋ hand|💪 muscle
👣 footprints|🦷 tooth|🧠 brain|🦴 bone|🎄 christmas|🧊 ice|🔮 crystal|🧿 amulet|💌 letter|🏁 checkered
🔍 magnifier|🧯 extinguisher
`;

export const EMOJIS: SafetyEmoji[] = LIST.trim().split(/[|\n]/).map((entry) => {
  const [emoji, name] = entry.split(' ');

  return { emoji, name };
});
