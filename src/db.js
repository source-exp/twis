const DB_KEY = 'twis-db-v2'
const SESSION_KEY = 'twis-session-v2'

const demoUsers = [
  { id: 'u-maya', name: 'Maya Chen', handle: 'mayachen', email: 'maya@example.com', passwordHash: 'AAAAAAAAAAAAAAAAAAAAAA==:UfYvpOhE+sKYT+kndq81CTHnGtCsrM/CYxg3JLxLrVg=', avatar: 'MC', bio: 'Product designer making tools for thoughtful teams.' },
  { id: 'u-jon', name: 'Jon Bell', handle: 'jonbell', avatar: 'JB', bio: 'Writer, builder, and occasional espresso critic.' },
  { id: 'u-priya', name: 'Priya Shah', handle: 'priyashah', avatar: 'PS', bio: 'Indie hacker learning in public.' },
  { id: 'u-lena', name: 'Lena Ortiz', handle: 'lenaortiz', avatar: 'LO', bio: 'Frontend engineer. CSS is my favorite puzzle.' },
  { id: 'u-theo', name: 'Theo Grant', handle: 'theogrant', avatar: 'TG', bio: 'Photographer and weekend cyclist.' },
  { id: 'u-sam', name: 'Sam Rivera', handle: 'samrivera', avatar: 'SR', bio: 'Community, coffee, and good questions.' },
]

const demoPosts = [
  { id: 'p-1', userId: 'u-maya', body: 'The best ideas usually start as tiny experiments. Ship the first version, learn from it, and keep going. ✨', createdAt: Date.now() - 18 * 60000, replies: 12, reposts: 28, likes: 184 },
  { id: 'p-2', userId: 'u-jon', body: 'A reminder that a clear desk is not the same thing as a clear mind. Take the walk, make the coffee, start again.', createdAt: Date.now() - 42 * 60000, replies: 7, reposts: 14, likes: 96 },
  { id: 'p-3', userId: 'u-priya', body: 'What are you building this weekend?', createdAt: Date.now() - 60 * 60000, replies: 24, reposts: 5, likes: 61 },
  { id: 'p-4', userId: 'u-lena', body: 'A small interface with a strong point of view is better than a huge interface trying to please everyone.', createdAt: Date.now() - 2 * 3600000, replies: 9, reposts: 19, likes: 122 },
]

const demoMessages = [
  { id: 'm-1', from: 'u-lena', to: 'u-maya', body: 'Did you see the new prototype?', createdAt: Date.now() - 2 * 60000, seen: false },
  { id: 'm-2', from: 'u-jon', to: 'u-maya', body: 'Coffee and a walk this weekend?', createdAt: Date.now() - 3600000, seen: true },
  { id: 'm-3', from: 'u-sam', to: 'u-maya', body: 'Welcome to twis!', createdAt: Date.now() - 3 * 3600000, seen: true },
]

const demoAlerts = [
  { id: 'a-1', actorId: 'u-maya', recipientId: 'u-maya', type: 'like', text: 'liked your post', createdAt: Date.now() - 600000, seen: false },
  { id: 'a-2', actorId: 'u-priya', recipientId: 'u-maya', type: 'follow', text: 'followed you', createdAt: Date.now() - 3600000, seen: false },
  { id: 'a-3', actorId: 'u-jon', recipientId: 'u-maya', type: 'repost', text: 'reposted your update', createdAt: Date.now() - 3 * 3600000, seen: true },
]

function readDb() {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY))
    return stored ? { bookmarks: [], messages: demoMessages, alerts: demoAlerts, ...stored } : { users: demoUsers, posts: demoPosts, likes: [], follows: [], bookmarks: [], messages: demoMessages, alerts: demoAlerts }
  } catch {
    return { users: demoUsers, posts: demoPosts, likes: [], follows: [], bookmarks: [], messages: demoMessages, alerts: demoAlerts }
  }
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

export function seedDatabase() {
  if (!localStorage.getItem(DB_KEY)) writeDb({ users: demoUsers, posts: demoPosts, likes: [], follows: [], bookmarks: [], messages: demoMessages, alerts: demoAlerts })
}

export function getDatabase() {
  return readDb()
}

export function createUser(user) {
  const db = readDb()
  db.users.push(user)
  writeDb(db)
  return user
}

export function updateUser(userId, changes) {
  const db = readDb()
  const user = db.users.find((item) => item.id === userId)
  if (!user) return null
  Object.assign(user, changes)
  writeDb(db)
  return user
}

export function findUserByEmail(email) {
  return readDb().users.find((user) => user.email === email.toLowerCase())
}

export function findUserByHandle(handle) {
  return readDb().users.find((user) => user.handle === handle.toLowerCase())
}

export function getSessionUser() {
  const sessionId = localStorage.getItem(SESSION_KEY)
  return sessionId ? readDb().users.find((user) => user.id === sessionId) || null : null
}

export function saveSession(userId) {
  localStorage.setItem(SESSION_KEY, userId)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function addPost(post) {
  const db = readDb()
  db.posts.unshift(post)
  writeDb(db)
}

export function toggleLike(postId, userId) {
  const db = readDb()
  const likeIndex = db.likes.findIndex((like) => like.postId === postId && like.userId === userId)
  const post = db.posts.find((item) => item.id === postId)
  if (!post) return
  if (likeIndex >= 0) {
    db.likes.splice(likeIndex, 1)
    post.likes = Math.max(0, post.likes - 1)
  } else {
    db.likes.push({ postId, userId })
    post.likes += 1
  }
  writeDb(db)
}

export function deletePost(postId, userId) {
  const db = readDb()
  const post = db.posts.find((item) => item.id === postId)
  if (!post || post.userId !== userId) return false
  db.posts = db.posts.filter((item) => item.id !== postId)
  db.likes = db.likes.filter((like) => like.postId !== postId)
  writeDb(db)
  return true
}

export function toggleFollow(targetId, userId) {
  const db = readDb()
  const index = db.follows.findIndex((follow) => follow.targetId === targetId && follow.userId === userId)
  if (index >= 0) db.follows.splice(index, 1)
  else db.follows.push({ targetId, userId })
  writeDb(db)
}

export function isFollowing(targetId, userId) {
  return readDb().follows.some((follow) => follow.targetId === targetId && follow.userId === userId)
}

export function toggleBookmark(postId, userId) {
  const db = readDb()
  const index = db.bookmarks.findIndex((bookmark) => bookmark.postId === postId && bookmark.userId === userId)
  if (index >= 0) db.bookmarks.splice(index, 1)
  else db.bookmarks.push({ postId, userId })
  writeDb(db)
}

export function isBookmarked(postId, userId) {
  return readDb().bookmarks.some((bookmark) => bookmark.postId === postId && bookmark.userId === userId)
}

export function markMessageSeen(messageId, userId) {
  const db = readDb()
  const message = db.messages.find((item) => item.id === messageId && item.to === userId)
  if (message) message.seen = true
  writeDb(db)
}

export function markAlertSeen(alertId, userId) {
  const db = readDb()
  const alert = db.alerts.find((item) => item.id === alertId && item.recipientId === userId)
  if (alert) alert.seen = true
  writeDb(db)
}

export function markAllAlertsSeen(userId) {
  const db = readDb()
  db.alerts.forEach((alert) => { if (alert.recipientId === userId) alert.seen = true })
  writeDb(db)
}
