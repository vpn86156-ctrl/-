# Messenger17

Премиальный онлайн-мессенджер: аккаунты, друзья по согласию, личные чаты, группы, каналы, новости, профиль и темы оформления.

## Стек

- React + Vite
- Supabase Auth
- Supabase Database + Realtime
- Адаптивный CSS без UI-фреймворков

## Быстрый запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

В `.env.local` нужно вставить ключи проекта Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## Настройка Supabase

1. Создай проект в Supabase.
2. Открой **SQL Editor**.
3. Выполни файл `supabase/schema.sql`.
4. Включи Email Auth в разделе Authentication.
5. Вставь URL и anon key в `.env.local`.

После этого сайт будет работать онлайн: пользователи смогут регистрироваться, искать друг друга, отправлять заявки в друзья, принимать их и переписываться.

## Разделы

- **Чаты** — realtime сообщения.
- **Друзья** — поиск, заявки, принятие/отклонение.
- **Группы** — создание сообществ.
- **Каналы** — создание каналов.
- **Новости** — публикация новостей.
- **Настройки** — профиль и смена темы.

## Темы

- Premium Black
- Graphite
- Neon Blue
- Purple
- Light
