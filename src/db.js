const DB_KEY = 'twis-db-v3'
const SESSION_KEY = 'twis-session-v2'

const emptyDatabase = { users: [], posts: [], likes: [], follows: [], bookmarks: [], messages: [], alerts: [] }

function readDb() {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY))
    return stored ? { ...emptyDatabase, ...stored } : { ...emptyDatabase }
  } catch {
    return { ...emptyDatabase }
  }
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

export function seedDatabase() {
  if (!localStorage.getItem(DB_KEY)) writeDb({ ...emptyDatabase })
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
