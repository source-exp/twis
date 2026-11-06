import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { clearSession, createUser, addPost, deletePost, findUserByEmail, findUserByHandle, getDatabase, getSessionUser, isBookmarked, isFollowing, markAlertSeen, markAllAlertsSeen, markMessageSeen, saveSession, seedDatabase, toggleBookmark, toggleFollow, toggleLike, updateUser } from './db'
import { hashPassword, validateRegistration, verifyPassword } from './auth'
import './styles.css'

const trends = [['#BuildInPublic', '8,420 posts'], ['Design systems', '5,104 posts'], ['Indie hackers', '3,892 posts']]
const icon = { home: '⌂', search: '⌕', bell: '♧', mail: '✉', bookmark: '▣', user: '☻', more: '•••', reply: '↩', repost: '↻', heart: '♥', share: '↗', image: '▧', video: '▶', audio: '♫', gif: 'GIF' }
const formatTime = (time) => { const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000)); return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h` }
const Avatar = ({ initials }) => <div className="avatar">{initials}</div>
const ButtonIcon = ({ name }) => <span className="button-icon" aria-hidden="true">{icon[name]}</span>
const postMatches = (post, db, query) => !query || post.body.toLowerCase().includes(query.toLowerCase()) || db.users.find((item) => item.id === post.userId)?.name.toLowerCase().includes(query.toLowerCase())

function PostCard({ post, db, user, refresh, onBookmark, onProfile }) {
  const author = db.users.find((item) => item.id === post.userId) || user
  const liked = db.likes.some((like) => like.postId === post.id && like.userId === user.id)
  const bookmarked = isBookmarked(post.id, user.id)
  const share = async () => { const url = `${location.origin}${location.pathname}#post-${post.id}`; try { await navigator.clipboard.writeText(url); window.alert('Post link copied.') } catch { window.prompt('Copy this post link:', url) } }
  return <article className="post" id={`post-${post.id}`}><button className="profile-link" onClick={() => onProfile?.(author)}><Avatar initials={author.avatar} /></button><div className="post-body"><div className="post-meta"><button className="profile-link-text" onClick={() => onProfile?.(author)}><b>{author.name}</b></button> @{author.handle} · {formatTime(post.createdAt)}{author.id === user.id && <button className="delete" onClick={() => { deletePost(post.id, user.id); refresh() }}>delete</button>}</div><p>{post.body}</p>{post.media && <MediaPreview media={post.media} />}{<div className="post-actions"><button><ButtonIcon name="reply" />{post.replies}</button><button><ButtonIcon name="repost" />{post.reposts}</button><button className={liked ? 'liked' : ''} onClick={() => { toggleLike(post.id, user.id); refresh() }}><ButtonIcon name="heart" />{post.likes}</button><button className={bookmarked ? 'liked' : ''} onClick={() => { toggleBookmark(post.id, user.id); onBookmark?.(); refresh() }}><ButtonIcon name="bookmark" /></button><button onClick={share}><ButtonIcon name="share" />share</button></div>}</div></article>
}

function MediaPreview({ media }) {
  if (media.type === 'image' || media.type === 'gif') return <img className="post-media" src={media.data} alt={media.name} />
  if (media.type === 'video') return <video className="post-media" controls src={media.data} />
  return <audio controls src={media.data} />
}

function MessagesPanel({ db, user, refresh }) {
  const [open, setOpen] = useState(null)
  const messages = db.messages.filter((message) => message.to === user.id || message.from === user.id)
  return <div className="panel-list">{messages.map((message) => { const person = db.users.find((item) => item.id === (message.from === user.id ? message.to : message.from)) || user; return <button className={`message-row ${message.seen ? '' : 'unseen'}`} key={message.id} onClick={() => { setOpen(message.id); markMessageSeen(message.id, user.id); refresh() }}><Avatar initials={person.avatar} /><span><b>{person.name}</b><small>{open === message.id ? message.body : message.body}</small></span><time>{formatTime(message.createdAt)}</time>{open === message.id && <em className="message-open">OPEN</em>}</button> })}</div>
}

function AlertsPanel({ db, user, refresh }) {
  const alerts = db.alerts.filter((alert) => alert.recipientId === user.id)
  return <div className="panel-list"><div className="panel-toolbar"><b>{alerts.filter((alert) => !alert.seen).length} unseen</b><button className="link-button" onClick={() => { markAllAlertsSeen(user.id); refresh() }}>Mark all seen</button></div>{alerts.map((alert) => { const actor = db.users.find((item) => item.id === alert.actorId) || user; return <button className={`alert-row ${alert.seen ? '' : 'unseen'}`} key={alert.id} onClick={() => { markAlertSeen(alert.id, user.id); refresh() }}><strong>{alert.type === 'like' ? '♥' : alert.type === 'follow' ? '+' : '↻'}</strong><span><b>{actor.name}</b> {alert.text}<small>{formatTime(alert.createdAt)}</small></span></button> })}</div>
}

function MediaPicker({ onChange }) {
  const [error, setError] = useState('')
  const accept = 'image/*,video/*,audio/*,.gif'
  const choose = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const max = file.type.startsWith('image/') ? 5 : file.type.startsWith('video/') ? 25 : file.type.startsWith('audio/') ? 10 : 5
    if (file.size > max * 1024 * 1024) return setError(`${file.name} is too large. Maximum: ${max} MB.`)
    const type = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif') ? 'gif' : file.type.split('/')[0]
    const reader = new FileReader()
    reader.onload = () => { onChange({ type, name: file.name, data: reader.result }); setError('') }
    reader.readAsDataURL(file)
  }
  return <div className="media-picker"><label className="xp-button">Attach media<input hidden type="file" accept={accept} onChange={choose} /></label>{error && <span className="error">{error}</span>}<small>Images/GIF 5 MB · audio 10 MB · video 25 MB</small></div>
}

function ProfilePanel({ user, db, refresh }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(user.bio || '')
  const userPosts = db.posts.filter((post) => post.userId === user.id)
  const save = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    updateUser(user.id, { name: name.trim(), bio: bio.trim(), avatar: name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() })
    setEditing(false)
    refresh()
  }
  return <section className="profile-view"><div className="profile-cover" /><div className="profile-heading"><Avatar initials={user.avatar} />{user.id === getSessionUser()?.id && <button className="xp-button" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit profile'}</button>}</div>{editing ? <form className="profile-form" onSubmit={save}><label>Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength="40" /></label><label>Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength="160" rows="3" /></label><button className="xp-button primary">Save changes</button></form> : <div className="profile-copy"><h2>{user.name}</h2><p>@{user.handle}</p><p>{user.bio}</p></div>}<div className="profile-stats"><b>{userPosts.length}<small>posts</small></b><b>{db.follows.filter((follow) => follow.userId === user.id).length}<small>following</small></b><b>{db.follows.filter((follow) => follow.targetId === user.id).length}<small>followers</small></b></div><h2 className="profile-posts-title">Posts</h2>{userPosts.map((post) => <PostCard post={post} db={db} user={getSessionUser()} refresh={refresh} key={post.id} />)}</section>
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', handle: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (mode === 'register') {
      const validationError = validateRegistration(form)
      if (validationError) return setError(validationError)
      if (findUserByEmail(form.email) || findUserByHandle(form.handle)) return setError('That email or handle is already in use.')
      setBusy(true)
      const user = { id: `u-${crypto.randomUUID()}`, name: form.name.trim(), handle: form.handle.toLowerCase(), email: form.email.toLowerCase(), passwordHash: await hashPassword(form.password), avatar: form.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), bio: 'New to twis.' }
      createUser(user); saveSession(user.id); onLogin(user); setBusy(false); return
    }
    const user = findUserByEmail(form.email)
    if (!user || !(await verifyPassword(form.password, user.passwordHash || ''))) return setError('Email or password is incorrect.')
    saveSession(user.id); onLogin(user)
  }
  return <main className="auth-window window">
    <div className="titlebar"><span>twis.exe — {mode === 'login' ? 'sign in' : 'create account'}</span><span>_ □ ×</span></div>
    <div className="auth-inner"><div className="auth-logo">tw<span>i</span>s</div><p className="muted">A tiny social network for real people.</p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'register' && <><label>Display name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required /></label><label>Handle<input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/^@/, '') })} placeholder="yourname" autoComplete="username" required /></label></>}
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="xp-button primary" disabled={busy}>{busy ? 'Creating…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      <button className="link-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create a new account' : 'Already have an account? Sign in'}</button>
      <p className="demo-note">Demo accounts: <b>maya@example.com</b> / <b>demo-password</b> or register your own.</p>
    </div>
  </main>
}

function App() {
  const [user, setUser] = useState(null)
  const [db, setDb] = useState({ users: [], posts: [], likes: [], follows: [] })
  const [draft, setDraft] = useState('')
  const [activeNav, setActiveNav] = useState('Home')
  const [tab, setTab] = useState('For you')
  const [query, setQuery] = useState('')
  const [media, setMedia] = useState(null)
  const [viewProfile, setViewProfile] = useState(null)
  useEffect(() => {
    seedDatabase()
    const database = getDatabase()
    const current = getSessionUser()
    // Development convenience only: production still requires an explicit login.
    const developmentUser = import.meta.env.DEV && !current
      ? database.users.find((item) => item.email === 'maya@example.com')
      : null
    if (developmentUser) saveSession(developmentUser.id)
    setDb(database)
    setUser(current || developmentUser)
  }, [])
  const refresh = () => setDb(getDatabase())
  const posts = useMemo(() => db.posts.filter((post) => postMatches(post, db, query)), [db, query])
  const add = (event) => { event.preventDefault(); const body = draft.trim(); if ((!body && !media) || !user) return; addPost({ id: `p-${crypto.randomUUID()}`, userId: user.id, body, media, createdAt: Date.now(), replies: 0, reposts: 0, likes: 0 }); setDraft(''); setMedia(null); refresh() }
  if (!user) return <AuthScreen onLogin={(nextUser) => { setUser(nextUser); refresh() }} />
  const suggestions = db.users.filter((item) => item.id !== user.id).slice(3, 6)
  return <div className="desktop">
    <aside className="start-menu"><div className="window-title"><span>twis</span><span>— □ ×</span></div><div className="brand">tw<span>i</span>s</div>
      <nav>{[['Home', 'home'], ['Explore', 'search'], ['Alerts', 'bell'], ['Messages', 'mail'], ['Bookmarks', 'bookmark'], ['Profile', 'user']].map(([label, name]) => <button className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); setViewProfile(label === 'Profile' ? user : null) }} key={label}><ButtonIcon name={name} />{label}{label === 'Alerts' && db.alerts.some((alert) => alert.recipientId === user.id && !alert.seen) && <i className="nav-badge">!</i>}</button>)}</nav>
      <div className="sidebar-bottom"><Avatar initials={user.avatar} /><span><b>{user.name}</b><small>@{user.handle}</small></span><button className="xp-button" onClick={() => { clearSession(); setUser(null) }}>Log out</button></div>
    </aside>
    <main className="main-window window"><div className="titlebar"><span>twis.exe — {activeNav.toLowerCase()}</span><span>_ □ ×</span></div>
      <div className="toolbar"><span>File</span><span>Edit</span><span>View</span><span>Help</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find posts..." /></div>
      <header className="feed-header"><h1>{activeNav}</h1><span className="online">● {db.users.length} users online</span></header>
      {activeNav === 'Home' && <><form className="composer" onSubmit={add}><Avatar initials={user.avatar} /><div className="composer-content"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a short update..." maxLength="280" rows="2" /><div className="composer-footer"><MediaPicker onChange={setMedia} /><span>{draft.length}/280</span><button className="xp-button primary" disabled={!draft.trim() && !media}>Post</button></div>{media && <div className="media-selected">{media.name} <button type="button" onClick={() => setMedia(null)}>remove</button></div>}</div></form><div className="feed-tabs"><button className={tab === 'For you' ? 'selected' : ''} onClick={() => setTab('For you')}>For you</button><button className={tab === 'Following' ? 'selected' : ''} onClick={() => setTab('Following')}>Following</button></div><section className="posts">{posts.filter((post) => tab === 'For you' || post.userId === user.id || db.follows.some((follow) => follow.userId === user.id && follow.targetId === post.userId)).map((post) => <PostCard post={post} db={db} user={user} refresh={refresh} onProfile={(profile) => { setViewProfile(profile); setActiveNav('Profile') }} key={post.id} />)}</section></>}
      {activeNav === 'Explore' && <section className="explore-view"><h2>Explore the network</h2><p className="muted">Search posts, people, and ideas from the twis community.</p><div className="explore-tags">{trends.map(([topic, count]) => <button key={topic} onClick={() => setQuery(topic)}>{topic}<small>{count}</small></button>)}</div><section className="posts">{posts.map((post) => <PostCard post={post} db={db} user={user} refresh={refresh} onProfile={(profile) => { setViewProfile(profile); setActiveNav('Profile') }} key={post.id} />)}</section></section>}
      {activeNav === 'Bookmarks' && <section className="posts">{db.posts.filter((post) => isBookmarked(post.id, user.id)).map((post) => <PostCard post={post} db={db} user={user} refresh={refresh} onProfile={(profile) => { setViewProfile(profile); setActiveNav('Profile') }} key={post.id} />)}{!db.posts.some((post) => isBookmarked(post.id, user.id)) && <div className="empty-panel"><h2>No bookmarks yet</h2><p>Save a post from your timeline to find it here.</p></div>}</section>}
      {activeNav === 'Messages' && <MessagesPanel db={db} user={user} refresh={refresh} />}
      {activeNav === 'Alerts' && <AlertsPanel db={db} user={user} refresh={refresh} />}
      {activeNav === 'Profile' && <ProfilePanel user={viewProfile || user} db={db} refresh={() => { setUser(getSessionUser()); refresh() }} />}
    </main>
    <aside className="right-panel"><div className="panel window"><div className="titlebar"><span>users.exe</span><span>_ □ ×</span></div><div className="panel-content"><h2>People you may know</h2>{suggestions.map((person) => <div className="follow-row" key={person.id}><button className="profile-link" onClick={() => { setViewProfile(person); setActiveNav('Profile') }}><Avatar initials={person.avatar} /></button><span><b>{person.name}</b><small>@{person.handle}</small></span><button className="xp-button" onClick={() => { toggleFollow(person.id, user.id); refresh() }}>{isFollowing(person.id, user.id) ? 'Unfollow' : 'Follow'}</button></div>)}<h2 className="section-title">What's happening</h2>{trends.map(([topic, count]) => <button className="trend trend-button" key={topic} onClick={() => { setQuery(topic); setActiveNav('Explore') }}><b>{topic}</b><small>{count}</small></button>)}</div></div><div className="statusbar">READY · local database</div></aside>
  </div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
