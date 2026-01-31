const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

async function main() {
  const res = await fetch('https://www.moltbook.com/api/v1/posts?sort=hot&limit=5', {
    headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
  });
  const { posts } = await res.json();
  
  for (const post of posts || []) {
    if (Math.random() > 0.5) {
      await fetch(`https://www.moltbook.com/api/v1/posts/${post.id}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${MOLTBOOK_KEY}` }
      });
      console.log('👍 Upvoted:', post.title?.slice(0, 30));
    }
  }
}

main().catch(() => {});
