// Pictures and short clips shown behind the Sign In page, in this order.
//
// HOW TO ADD YOUR OWN
// 1. Put the files in  frontend/public/media/signin/
//    - Photos: .jpg or .webp, about 1600 px wide, under ~400 KB each
//    - Clips:  .mp4 (H.264), 5–15 seconds, no sound needed, under ~5 MB each
// 2. Add a line below, e.g.
//      { type: "image", src: "/media/signin/grading-2025.jpg" },
//      { type: "video", src: "/media/signin/randori.mp4" },
// Only use media ASK has allowed you to use. A missing file is simply skipped.
export const signinMedia = [
  { type: "video", src: "/media/signin/dojo-practice.mp4" },       // HQ dojo, pair practice (8 s)
  { type: "image", src: "/media/signin/dojo-seminar.jpg" },        // Shihan teaching a full dojo
  { type: "video", src: "/media/signin/shihan-stay-relaxed.mp4" }, // Shihan demonstrating (8 s)
  { type: "image", src: "/media/signin/practice-throw.jpg" },      // student throw
  { type: "video", src: "/media/signin/aikido-event-demo.mp4" },   // public demo with bokken (8 s)
  { type: "image", src: "/images/hero.jpg" },
];

// How long each photo stays before the next one. Clips play to the end instead.
export const PHOTO_SECONDS = 6;
