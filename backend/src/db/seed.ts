import { db } from "./index";
import {
  userTable,
  postTable,
  topicTable,
  replyTable,
  likeTable,
} from "./schema";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { mkdir } from "fs/promises";

const seedImageUrls = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800",
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800",
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800",
  "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800",
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800",
];

const mockUsers = [
  { name: "小明", email: "ming@example.com", password: "pass1234", description: "愛好登山和攝影" },
  { name: "美琳", email: "meiling@example.com", password: "pass1234", description: "嗜歡大自然和旅行" },
  { name: "志明", email: "zhiming@example.com", password: "pass1234", description: "戶外運動愛好者" },
  { name: "雅婷", email: "yating@example.com", password: "pass1234", description: "嗜歡賞鳥和生態旅遊" },
  { name: "建宏", email: "jianhong@example.com", password: "pass1234", description: "露營愛好者" },
  { name: "曉春", email: "xiaochun@example.com", password: "pass1234", description: "喜歡記錄大自然之美" },
];

const mockTopics = [
  { name: "山岳" },
  { name: "海洋" },
  { name: "森林" },
  { name: "河流" },
  { name: "星空" },
  { name: "日出日落" },
  { name: "野生動物" },
];

let postImages: (string | null)[] = [];

const getPostsData = () => [
  {
    creator: 1,
    title: "玉山主峰日出太震撞了",
    topics: "山岳",
    content: "凌晨三點出發，終於在山頂看到了日出！金色的陽光穿過雲海，整個天空都被染成了橙紅色。雖然爬得很辛苦，但這個景色讓一切都值得了 ✨",
    images: postImages[0] ? [postImages[0]] : null,
  },
  {
    creator: 2,
    title: "墾丁的海邊真的很美",
    topics: "海洋",
    content: "今天去了墾丁浮潛，水超級清澹！看到了很多熱帶魚和珊瑩，還有海龜游過去。大海的世界真的很神奇 🐢",
    images: postImages[1] ? [postImages[1]] : null,
  },
  {
    creator: 3,
    title: "阿里山的神木好壯觀",
    topics: "森林",
    content: "終於去了阿里山看神木！那些千年古樹真的讓人感受到大自然的力量。森林裡的空氣好清新，走在樹林間心情都變好了 🌲",
    images: postImages[2] ? [postImages[2]] : null,
  },
  {
    creator: 4,
    title: "溪頭發現了藍腹鷹",
    topics: "野生動物",
    content: "今天在溪邊拍到了藍腹鷹！等了兩個小時終於看到它信水捕魚，動作超快！賞鳥真的需要耐心，但看到的那一刻都值得了 🐦",
    images: postImages[3] ? [postImages[3]] : null,
  },
  {
    creator: 5,
    title: "合歡山露營看星星",
    topics: "星空",
    content: "週末去合歡山露營，晚上的星空太驚艷了！銀河清晰可見，還看到了好幾顆流星。在城市裡真的看不到這麼美的星空 ⭐",
    images: postImages[4] ? [postImages[4]] : null,
  },
  {
    creator: 6,
    title: "日月潭的日出倒影",
    topics: "日出日落",
    content: "早起到日月潭看日出，湖面平靜得像鏡子一樣，山和雲的倒影美得不真實。難怪大家都說日月潭是台灣最美的湖 🌄",
    images: postImages[5] ? [postImages[5]] : null,
  },
  {
    creator: 4,
    title: "淡水河邊的黑面琵鷷",
    topics: "野生動物",
    content: "今天在淡水河邊看到一群黑面琵鷷！它們的嘴巴好特別，扁扁的像湯匙。冬天是賞鳥的好季節，有人知道還有哪裡可以看到它們嗎？",
    images: postImages[6] ? [postImages[6]] : null,
  },
  {
    creator: 1,
    title: "太魯閣的雲海好奇幻",
    topics: "山岳",
    content: "第一次去太魯閣，運氣很好看到了雲海！整片雲就在腳下，感覺像在仙境一樣。難怪那麼多人愛爬山，這種景色真的會讓人上癰 ☁️",
    images: postImages[7] ? [postImages[7]] : null,
  },
];

const mockReplies = [
  { postId: 1, userId: 2, content: "太美了！我也想去看玉山日出 ✨" },
  { postId: 1, userId: 4, content: "爬玉山是我的夢想清單！" },
  { postId: 2, userId: 3, content: "墾丁的海真的超美，下次也想去浮潛" },
  { postId: 2, userId: 6, content: "海龜好可愛！在哪個海灣看到的？" },
  { postId: 3, userId: 1, content: "阿里山的空氣真的很棒，走在森林裡很舒服" },
  { postId: 4, userId: 2, content: "藍腹鷹好難拍到！你太幸運了 🐦" },
  { postId: 4, userId: 5, content: "我也想學賞鳥，有推薦的地點嗎？" },
  { postId: 5, userId: 3, content: "合歡山的星空真的很讚！" },
  { postId: 5, userId: 1, content: "好美的星空！我也想去露營看星星 ⛺" },
  { postId: 6, userId: 4, content: "日月潭真的很美，我上次去也是看日出" },
  { postId: 7, userId: 5, content: "黑面琵鷷好可愛！它們的嘴巴很特別" },
  { postId: 8, userId: 2, content: "雲海太奇幻了！網美照怎麼拍的？" },
  { postId: 8, userId: 3, content: "太魯閣我也很想去，要事先預約嗎？" },
];

const mockLikes = [
  { userId: 2, postId: 1 },
  { userId: 3, postId: 1 },
  { userId: 4, postId: 1 },
  { userId: 1, postId: 2 },
  { userId: 3, postId: 2 },
  { userId: 5, postId: 2 },
  { userId: 1, postId: 3 },
  { userId: 2, postId: 3 },
  { userId: 6, postId: 3 },
  { userId: 2, postId: 4 },
  { userId: 5, postId: 4 },
  { userId: 6, postId: 4 },
  { userId: 1, postId: 5 },
  { userId: 3, postId: 5 },
  { userId: 4, postId: 5 },
  { userId: 1, postId: 6 },
  { userId: 3, postId: 6 },
  { userId: 4, postId: 6 },
  { userId: 5, postId: 6 },
  { userId: 1, postId: 7 },
  { userId: 2, postId: 7 },
  { userId: 5, postId: 7 },
  { userId: 2, postId: 8 },
  { userId: 3, postId: 8 },
  { userId: 4, postId: 8 },
  { userId: 5, postId: 8 },
  { userId: 6, postId: 8 },
];

async function downloadImages() {
  const postsDir = "./data/posts";
  await mkdir(postsDir, { recursive: true });

  const imagePaths: string[] = [];

  for (const url of seedImageUrls) {
    const fileName = `${nanoid()}.jpg`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}`);
    await Bun.write(`${postsDir}/${fileName}`, response);
    imagePaths.push(`/s3/posts/${fileName}`);
  }

  return imagePaths;
}

async function seed() {
  postImages = await downloadImages();

  await db.delete(likeTable);
  await db.delete(replyTable);
  await db.delete(postTable);
  await db.delete(topicTable);
  await db.delete(userTable);
  await db.run(
    sql`DELETE FROM sqlite_sequence WHERE name IN ('users', 'posts', 'post_replies')`,
  );

  await db.insert(userTable).values(mockUsers);
  await db.insert(topicTable).values(mockTopics);
  await db.insert(postTable).values(getPostsData());
  await db.insert(replyTable).values(mockReplies);
  await db.insert(likeTable).values(mockLikes);

  console.log("Done");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SeedError", err);
    process.exit(1);
  });
