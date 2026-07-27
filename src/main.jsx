import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  Check,
  ChevronLeft,
  CircleUserRound,
  Compass,
  Hash,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Newspaper,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import './styles.css';

const THEMES = [
  { id: 'premium', label: 'Premium Black' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'neon', label: 'Neon Blue' },
  { id: 'purple', label: 'Purple' },
  { id: 'light', label: 'Light' }
];

const NAV = [
  { id: 'chats', label: 'Чаты', icon: MessageCircle },
  { id: 'friends', label: 'Друзья', icon: UserPlus },
  { id: 'groups', label: 'Группы', icon: Users },
  { id: 'channels', label: 'Каналы', icon: Hash },
  { id: 'news', label: 'Новости', icon: Newspaper },
  { id: 'settings', label: 'Настройки', icon: Settings }
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function initials(name = 'M17') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'M';
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('m17-theme') || 'premium');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('m17-theme', theme);
  }, [theme]);

  return [theme, setTheme];
}

function SetupGuide() {
  return (
    <main className="setup-screen">
      <section className="setup-card">
        <div className="brand-mark"><Sparkles size={26} /></div>
        <p className="eyebrow">Messenger17</p>
        <h1>Подключи Supabase, чтобы мессенджер работал онлайн</h1>
        <p>
          Интерфейс и логика готовы. Для настоящих аккаунтов, друзей, сообщений, групп и каналов нужны ключи Supabase.
        </p>
        <ol className="setup-list">
          <li>Создай проект на Supabase.</li>
          <li>Выполни SQL из файла <code>supabase/schema.sql</code>.</li>
          <li>Создай <code>.env.local</code> по примеру <code>.env.example</code>.</li>
          <li>Запусти <code>npm install</code> и <code>npm run dev</code>.</li>
        </ol>
      </section>
    </main>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, full_name: fullName || username }
          }
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username,
            full_name: fullName || username,
            status: 'В сети'
          });
        }
        setMessage('Аккаунт создан. Если включено подтверждение почты — проверь email.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-hero">
        <div className="brand-line">
          <div className="brand-mark"><MessageCircle size={28} /></div>
          <span>Messenger17</span>
        </div>
        <h1>Премиальный мессенджер для друзей, групп и каналов</h1>
        <p>Закрытые личные чаты, заявки в друзья только по согласию, группы, каналы и новости в одном интерфейсе.</p>
        <div className="feature-row">
          <span><Shield size={16} /> Friends approval</span>
          <span><Compass size={16} /> Channels</span>
          <span><Moon size={16} /> Themes</span>
        </div>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{mode === 'login' ? 'Вход' : 'Регистрация'}</p>
        <h2>{mode === 'login' ? 'Вернуться в сеть' : 'Создать аккаунт'}</h2>
        {mode === 'register' && (
          <>
            <label>
              Ник
              <input value={username} onChange={event => setUsername(event.target.value)} placeholder="kans1x" required />
            </label>
            <label>
              Имя
              <input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Артём" />
            </label>
          </>
        )}
        <label>
          Email
          <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@mail.com" required />
        </label>
        <label>
          Пароль
          <input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="••••••••" minLength={6} required />
        </label>
        {message && <p className="form-message">{message}</p>}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? 'Подключаем...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
        <button className="ghost-button" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Создать новый аккаунт' : 'У меня уже есть аккаунт'}
        </button>
      </form>
    </main>
  );
}

function EmptyState({ icon: Icon = Sparkles, title, text, action }) {
  return (
    <div className="empty-state">
      <Icon size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function AppShell({ session }) {
  const [theme, setTheme] = useTheme();
  const [profile, setProfile] = useState(null);
  const [active, setActive] = useState('chats');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
      await supabase.from('profiles').update({ last_seen: new Date().toISOString(), status: 'В сети' }).eq('id', session.user.id);
    }
    loadProfile();
  }, [session.user.id]);

  useEffect(() => {
    async function loadBadge() {
      const { count } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('status', 'pending');
      setBadge(count || 0);
    }

    loadBadge();
    const channel = supabase
      .channel(`requests:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, loadBadge)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session.user.id]);

  async function signOut() {
    await supabase.from('profiles').update({ status: 'Не в сети', last_seen: new Date().toISOString() }).eq('id', session.user.id);
    await supabase.auth.signOut();
  }

  const title = NAV.find(item => item.id === active)?.label || 'Messenger17';

  return (
    <div className="app-shell">
      <aside className={cx('sidebar', sidebarOpen && 'open')}>
        <div className="sidebar-head">
          <div className="brand-line compact">
            <div className="brand-mark"><MessageCircle size={22} /></div>
            <span>Messenger17</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>

        <div className="profile-mini">
          <div className="avatar">{initials(profile?.full_name || profile?.username || session.user.email)}</div>
          <div>
            <strong>{profile?.full_name || profile?.username || 'Профиль'}</strong>
            <span>@{profile?.username || 'username'}</span>
          </div>
        </div>

        <nav className="nav-list">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={cx('nav-item', active === item.id && 'active')} onClick={() => { setActive(item.id); setSidebarOpen(false); }}>
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === 'friends' && badge > 0 && <b>{badge}</b>}
              </button>
            );
          })}
        </nav>

        <button className="logout-button" onClick={signOut}><LogOut size={18} /> Выйти</button>
      </aside>

      <div className="mobile-backdrop" data-visible={sidebarOpen} onClick={() => setSidebarOpen(false)} />

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div>
            <p className="eyebrow">Online workspace</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button"><Bell size={20} /></button>
            <div className="theme-select">
              <select value={theme} onChange={event => setTheme(event.target.value)} aria-label="Тема интерфейса">
                {THEMES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </div>
        </header>

        {active === 'chats' && <Chats user={session.user} />}
        {active === 'friends' && <Friends user={session.user} />}
        {active === 'groups' && <Groups user={session.user} />}
        {active === 'channels' && <Channels user={session.user} />}
        {active === 'news' && <News user={session.user} />}
        {active === 'settings' && <SettingsPanel user={session.user} profile={profile} setProfile={setProfile} theme={theme} setTheme={setTheme} />}
      </main>

      <nav className="bottom-nav">
        {NAV.slice(0, 5).map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={cx(active === item.id && 'active')} onClick={() => setActive(item.id)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Chats({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const messagesRef = useRef(null);

  async function loadConversations() {
    const { data } = await supabase
      .from('conversation_members')
      .select('conversation:conversations(*, members:conversation_members(profile:profiles(*)))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const list = (data || []).map(row => row.conversation).filter(Boolean);
    setConversations(list);
    if (!activeChat && list[0]) setActiveChat(list[0]);
  }

  async function loadMessages(chatId) {
    if (!chatId) return;
    const { data } = await supabase
      .from('messages')
      .select('*, author:profiles(*)')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setTimeout(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' }), 30);
  }

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { loadMessages(activeChat?.id); }, [activeChat?.id]);

  useEffect(() => {
    if (!activeChat?.id) return undefined;
    const channel = supabase
      .channel(`messages:${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeChat.id}` }, () => loadMessages(activeChat.id))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeChat?.id]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!text.trim() || !activeChat) return;
    await supabase.from('messages').insert({ conversation_id: activeChat.id, author_id: user.id, body: text.trim() });
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeChat.id);
    setText('');
  }

  return (
    <section className="panel chat-layout">
      <aside className="list-pane">
        <div className="pane-title"><h2>Диалоги</h2><span>{conversations.length}</span></div>
        {conversations.length === 0 ? (
          <EmptyState icon={MessageCircle} title="Чатов пока нет" text="Добавь друга и начни личный диалог после принятия заявки." />
        ) : conversations.map(chat => (
          <button key={chat.id} className={cx('chat-row', activeChat?.id === chat.id && 'active')} onClick={() => setActiveChat(chat)}>
            <div className="avatar small">{initials(chat.title || 'Чат')}</div>
            <div><strong>{chat.title || 'Личный чат'}</strong><span>{chat.type === 'direct' ? 'личные сообщения' : 'группа'}</span></div>
          </button>
        ))}
      </aside>

      <div className="chat-pane">
        {activeChat ? (
          <>
            <div className="chat-head">
              <button className="icon-button mobile-only" onClick={() => setActiveChat(null)}><ChevronLeft size={21} /></button>
              <div className="avatar">{initials(activeChat.title || 'Чат')}</div>
              <div><h2>{activeChat.title || 'Личный чат'}</h2><span>Realtime сообщения</span></div>
            </div>
            <div className="messages" ref={messagesRef}>
              {messages.map(message => (
                <div key={message.id} className={cx('message-bubble', message.author_id === user.id && 'mine')}>
                  <span>{message.author?.username || 'user'} · {formatTime(message.created_at)}</span>
                  <p>{message.body}</p>
                </div>
              ))}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input value={text} onChange={event => setText(event.target.value)} placeholder="Написать сообщение..." />
              <button className="primary-icon" type="submit"><Send size={19} /></button>
            </form>
          </>
        ) : (
          <EmptyState icon={MessageCircle} title="Выбери чат" text="На мобильном список и чат открываются отдельно для удобства." />
        )}
      </div>
    </section>
  );
}

function Friends({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [friends, setFriends] = useState([]);
  const [notice, setNotice] = useState('');

  async function loadIncoming() {
    const { data } = await supabase
      .from('friend_requests')
      .select('*, sender:profiles!friend_requests_sender_id_fkey(*)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setIncoming(data || []);
  }

  async function loadFriends() {
    const { data } = await supabase.rpc('get_friends', { current_user_id: user.id });
    setFriends(data || []);
  }

  useEffect(() => { loadIncoming(); loadFriends(); }, []);

  async function searchUsers(event) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${value}%,full_name.ilike.%${value}%`)
      .neq('id', user.id)
      .limit(12);
    setResults(data || []);
  }

  async function sendRequest(profileId) {
    const { error } = await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: profileId });
    setNotice(error ? error.message : 'Заявка отправлена. Друг должен принять её.');
  }

  async function answerRequest(request, status) {
    await supabase.from('friend_requests').update({ status }).eq('id', request.id);
    if (status === 'accepted') {
      await supabase.from('friendships').insert({ user_a: request.sender_id, user_b: request.receiver_id });
      const { data: conversation } = await supabase.from('conversations').insert({ type: 'direct', title: request.sender?.username || 'Личный чат' }).select().single();
      if (conversation) {
        await supabase.from('conversation_members').insert([
          { conversation_id: conversation.id, user_id: request.sender_id },
          { conversation_id: conversation.id, user_id: request.receiver_id }
        ]);
      }
    }
    loadIncoming();
    loadFriends();
  }

  return (
    <section className="panel split-grid">
      <div className="content-card">
        <h2>Добавить друга</h2>
        <p>Пользователь получит заявку. Писать можно только после согласия.</p>
        <form className="search-form" onSubmit={searchUsers}>
          <Search size={19} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ник или имя пользователя" />
          <button className="primary-button compact" type="submit">Найти</button>
        </form>
        {notice && <p className="form-message">{notice}</p>}
        <div className="stack-list">
          {results.map(profile => (
            <div className="user-row" key={profile.id}>
              <div className="avatar small">{initials(profile.full_name || profile.username)}</div>
              <div><strong>{profile.full_name || profile.username}</strong><span>@{profile.username}</span></div>
              <button className="ghost-button compact" onClick={() => sendRequest(profile.id)}>Добавить</button>
            </div>
          ))}
        </div>
      </div>

      <div className="content-card">
        <h2>Заявки</h2>
        {incoming.length === 0 ? <EmptyState icon={UserPlus} title="Новых заявок нет" text="Когда тебя добавят, заявка появится здесь." /> : (
          <div className="stack-list">
            {incoming.map(request => (
              <div className="user-row" key={request.id}>
                <div className="avatar small">{initials(request.sender?.full_name || request.sender?.username)}</div>
                <div><strong>{request.sender?.full_name || request.sender?.username}</strong><span>@{request.sender?.username}</span></div>
                <div className="row-actions">
                  <button className="success-button" onClick={() => answerRequest(request, 'accepted')}><Check size={17} /></button>
                  <button className="danger-button" onClick={() => answerRequest(request, 'declined')}><X size={17} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="content-card full-span">
        <h2>Мои друзья</h2>
        {friends.length === 0 ? <EmptyState icon={Users} title="Список пуст" text="Найди людей и отправь заявку в друзья." /> : (
          <div className="people-grid">
            {friends.map(friend => (
              <div className="person-card" key={friend.friend_id}>
                <div className="avatar">{initials(friend.full_name || friend.username)}</div>
                <strong>{friend.full_name || friend.username}</strong>
                <span>@{friend.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Groups({ user }) {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    const { data } = await supabase
      .from('group_members')
      .select('group:groups(*)')
      .eq('user_id', user.id);
    setGroups((data || []).map(row => row.group).filter(Boolean));
  }

  useEffect(() => { load(); }, []);

  async function createGroup(event) {
    event.preventDefault();
    if (!name.trim()) return;
    const { data } = await supabase.from('groups').insert({ owner_id: user.id, name: name.trim(), description }).select().single();
    if (data) await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'owner' });
    setName('');
    setDescription('');
    load();
  }

  return <CommunityPanel type="groups" icon={Users} title="Группы" items={groups} onCreate={createGroup} name={name} setName={setName} description={description} setDescription={setDescription} />;
}

function Channels({ user }) {
  const [channels, setChannels] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    const { data } = await supabase
      .from('channel_members')
      .select('channel:channels(*)')
      .eq('user_id', user.id);
    setChannels((data || []).map(row => row.channel).filter(Boolean));
  }

  useEffect(() => { load(); }, []);

  async function createChannel(event) {
    event.preventDefault();
    if (!name.trim()) return;
    const { data } = await supabase.from('channels').insert({ owner_id: user.id, name: name.trim(), description }).select().single();
    if (data) await supabase.from('channel_members').insert({ channel_id: data.id, user_id: user.id, role: 'owner' });
    setName('');
    setDescription('');
    load();
  }

  return <CommunityPanel type="channels" icon={Hash} title="Каналы" items={channels} onCreate={createChannel} name={name} setName={setName} description={description} setDescription={setDescription} />;
}

function CommunityPanel({ icon: Icon, title, items, onCreate, name, setName, description, setDescription }) {
  return (
    <section className="panel split-grid">
      <form className="content-card" onSubmit={onCreate}>
        <h2>Создать {title.toLowerCase().slice(0, -1)}</h2>
        <label>Название<input value={name} onChange={event => setName(event.target.value)} placeholder={`${title} Messenger17`} required /></label>
        <label>Описание<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="О чём это пространство" rows={4} /></label>
        <button className="primary-button"><Plus size={18} /> Создать</button>
      </form>
      <div className="content-card">
        <h2>Мои {title.toLowerCase()}</h2>
        {items.length === 0 ? <EmptyState icon={Icon} title="Пока пусто" text={`Создай первый раздел «${title}» и приглашай людей.`} /> : (
          <div className="stack-list">
            {items.map(item => (
              <div className="community-row" key={item.id}>
                <div className="avatar small">{initials(item.name)}</div>
                <div><strong>{item.name}</strong><span>{item.description || 'Без описания'}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function News({ user }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function load() {
    const { data } = await supabase.from('news').select('*, author:profiles(*)').order('created_at', { ascending: false }).limit(30);
    setPosts(data || []);
  }

  useEffect(() => { load(); }, []);

  async function publish(event) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await supabase.from('news').insert({ author_id: user.id, title: title.trim(), body: body.trim() });
    setTitle('');
    setBody('');
    load();
  }

  return (
    <section className="panel news-grid">
      <form className="content-card" onSubmit={publish}>
        <h2>Опубликовать новость</h2>
        <label>Заголовок<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Обновление Messenger17" /></label>
        <label>Текст<textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Что нового?" rows={5} /></label>
        <button className="primary-button">Опубликовать</button>
      </form>
      <div className="news-feed">
        {posts.length === 0 ? <EmptyState icon={Newspaper} title="Новостей нет" text="Первый пост появится здесь сразу после публикации." /> : posts.map(post => (
          <article className="news-card" key={post.id}>
            <span>{post.author?.username || 'admin'} · {new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
            <h2>{post.title}</h2>
            <p>{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({ user, profile, setProfile, theme, setTheme }) {
  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [status, setStatus] = useState(profile?.status || 'В сети');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setUsername(profile?.username || '');
    setFullName(profile?.full_name || '');
    setStatus(profile?.status || 'В сети');
  }, [profile]);

  async function save(event) {
    event.preventDefault();
    const payload = { id: user.id, username, full_name: fullName, status, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    setMessage(error ? error.message : 'Профиль сохранён');
    if (data) setProfile(data);
  }

  return (
    <section className="panel settings-grid">
      <form className="content-card" onSubmit={save}>
        <h2>Профиль</h2>
        <label>Ник<input value={username} onChange={event => setUsername(event.target.value)} /></label>
        <label>Имя<input value={fullName} onChange={event => setFullName(event.target.value)} /></label>
        <label>Статус<input value={status} onChange={event => setStatus(event.target.value)} /></label>
        {message && <p className="form-message">{message}</p>}
        <button className="primary-button">Сохранить</button>
      </form>
      <div className="content-card">
        <h2>Темы</h2>
        <div className="theme-grid">
          {THEMES.map(item => (
            <button key={item.id} className={cx('theme-card', theme === item.id && 'active')} onClick={() => setTheme(item.id)}>
              <span data-theme-dot={item.id} />
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Root() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) return <SetupGuide />;
  if (loading) return <div className="loader-screen"><div className="loader" /><span>Загрузка Messenger17...</span></div>;
  return session ? <AppShell session={session} /> : <AuthScreen />;
}

createRoot(document.getElementById('root')).render(<Root />);
