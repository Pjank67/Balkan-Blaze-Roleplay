# 🔥 BLAZE ROLEPLAY — SETUP VODIČ

> ⚡ **NAJBRŽI PUT — 1 minut:**
> 1. Napravi prazan Discord server (ili koristi svoj test server)
> 2. Dodaj bota (link u sekciji 2)
> 3. Ukucaj **`/setup-server potvrdi:True`**
> 4. Bot sam napravi **9 kategorija, 44 kanala, 16 rola i sve panele** 🔥
>
> Ne moraš ručno ništa da praviš ni da kopiraš ID-jeve — bot ih sam sačuva.
>
> 🧹 **Ako želiš da počneš od nule:** prvo `/reset-server sta:Sve potvrdi:True`, pa `/setup-server`.
> Ili direktno: `/setup-server potvrdi:True ocisti:Sve`.

---

## 1️⃣ Šta `/setup-server` napravi

### 📁 Kategorije i kanali (19)

```
📢 OBAVEŠTENJA
├── #dobrodoslica      (read-only, bot piše dobrodošlice)
├── #pravila           (read-only)
├── #objave            (read-only, /objava)
└── #odlasci           (read-only)

🔥 BLAZE
├── #status-servera    (read-only, live FiveM status)
├── #kako-se-povezati  (read-only, /ip)
└── #sugestije         (read-only, panel sa formom)

🛡️ ZAJEDNICA
├── #verifikacija      (read-only, panel sa pravilima)
├── #whitelist-prijava (read-only, panel za prijave)
├── #role              (read-only, role meni)
├── #opsti-caskanje    (svi pišu)
└── #mediji            (svi pišu)

🎫 PODRŠKA       ← kategorija za tiket kanale
└── #tiket-panel       (read-only, meni sa 6 kategorija)

📝 PRIJAVE       ← kategorija za prijava kanale

📋 LOGOVI        (samo staff vidi)
├── #transkripti
├── #mod-log
└── #message-log

🔊 GLASOVNI
├── ➕ Napravi sobu    (temp sobe)
├── 🎮 Gaming
└── 💬 RP soba
```

### 🎭 Role (10, od najniže ka najvišoj)

| Rola | Boja | Čemu služi |
|---|---|---|
| 🕐 Neverifikovan | siva | dobija je svaki nov član (auto-rola) |
| 🔥 Član | crvena | dobija se klikom na verifikaciju |
| 🚗 Igrač | narandžasta | role meni |
| 🎮 Gamer | plava | role meni |
| 🎨 Dizajner | roze | role meni |
| ✅ Whitelisted | zelena | posle odobrene prijave |
| 🤝 Partner | žuta | partneri |
| 🎧 Support | plava (hoist) | vidi tikete, prijave, logove |
| 🛡️ Moderator | narandžasta (hoist) | moderacija + logovi |
| 🔧 Admin | crvena (hoist) | sve |

> Rola **Owner** se ne pravi (Discord ne dozvoljava botu da je dodeli) — ti si vlasnik servera, imaš sve.
> Rola bota je automatski iznad svih ovih (bot ih je napravio), pa sve radi odmah. ✅

### ⚙️ Panele koje bot sam pošalje

- ✅ Verifikacija (pravila + dugme)
- ✅ Whitelist prijave (forma)
- ✅ Tiketi (meni sa 6 kategorija)
- ✅ Sugestije (forma)
- ✅ Role meni (FiveM igrač / Gamer / Dizajner)
- ✅ Ikonica servera = Blaze logo (možeš isključiti sa `postavi_ikonu:False`)
- ⏭️ Live status — čim upišeš `FIVEM_HOST` i restartuješ bota

---

## 2️⃣ (Ako želiš ručno) struktura servera


Napravi kanale i role **tačno ovako** (imena možeš menjati, bitno je da kopiraš ID-jeve):

### 📁 Kategorije i kanali

```
📢 OBAVEŠTENJA
├── #dobrodošlica          → WELCOME_CHANNEL_ID
├── #pravila               → RULES_CHANNEL_ID
├── #objave                → ANNOUNCEMENT_CHANNEL_ID
└── #odlasci               → GOODBYE_CHANNEL_ID

🔥 BLAZE
├── #status-servera        → STATUS_CHANNEL_ID
├── #kako-se-povezati      → (za /ip, nije obavezan ID)
└── #sugestije             → SUGGESTION_CHANNEL_ID

🛡️ ZAJEDNICA
├── #verifikacija          → VERIFY_CHANNEL_ID
├── #whitelist-prijava     → APPLY_PANEL_CHANNEL_ID
├── #role                   → (za /reactionroles panel)
└── #opšti-ćaskanje

🔊 GLASOVNI
├── ➕ Napravi sobu        → TEMP_VOICE_CHANNEL_ID (glasovni kanal!)
└── 🎮 Gaming / RP sobe

🎫 PODRŠKA (kategorija, ne kanal)
├── #tiket-panel           → TICKET_PANEL_CHANNEL_ID
└── (bot pravi tiket kanale unutra) → TICKET_CATEGORY_ID

📝 PRIJAVE (kategorija)
└── (bot pravi prijava kanale) → APPLY_CATEGORY_ID

📋 LOGOVI (samo za staff)
├── #transkripti           → TICKET_LOG_CHANNEL_ID + APPLY_LOG_CHANNEL_ID
├── #mod-log               → MOD_LOG_CHANNEL_ID
└── #message-log           → LOG_CHANNEL_ID
```

### 🎭 Role (od NAJVIŠE ka NAJNIŽOJ)

```
👑 Owner          (ti / drugar)
🔧 Admin
🛡️ Moderator
🎧 Support
🤝 Partner
─────────────────
🔥 Član            → VERIFY_ROLE_ID
✅ Whitelisted     → APPLY_ROLE_ID
🚗 Igrač
🎮 Gamer
🎨 Dizajner
🕐 Neverifikovan   → AUTO_ROLE_ID i UNVERIFIED_ROLE_ID
─────────────────
🤖 Blaze Bot  ← MORA BITI IZNAD svih rola koje bot dodeljuje!
@everyone
```

> ⚠️ **Najčešća greška:** bot ne može da dodeli rolu iznad svoje. Prevuci rolu bota ODMAH ISPOD Admin/Moderator.

---

## 2️⃣ Postavi bota na server

Link sa svim potrebnim dozvolama (zameni `TVOJ_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=TVOJ_CLIENT_ID&permissions=1099800374358&scope=bot%20applications.commands
```

**Obavezno u Developer Portalu:**
- ✅ **SERVER MEMBERS INTENT** (Bot → Privileged Gateway Intents)
- ✅ **MESSAGE CONTENT INTENT** — samo ako želiš automod i logove poruka
- (Ako uključiš Message Content, postavi i `ENABLE_MESSAGE_CONTENT=true` u env)

---

## 3️⃣ Popuni `.env` / Render Environment

Sve promenljive su objašnjene u `.env.example`. Najvažnije:

| Promenljiva | Šta je |
|---|---|
| `DISCORD_TOKEN` | token bota |
| `CLIENT_ID` | Application ID |
| `GUILD_ID` | ID servera |
| `TICKET_CATEGORY_ID` | kategorija gde se prave tiketi |
| `APPLY_CATEGORY_ID` | kategorija gde se prave prijave |
| `STAFF_ROLE_ID` | rola osoblja |
| `VERIFY_ROLE_ID` | rola koju dobija verifikovan član |
| `AUTO_ROLE_ID` | rola za nove članove (Neverifikovan) |
| `UNVERIFIED_ROLE_ID` | koja se skida posle verifikacije |
| `APPLY_ROLE_ID` | rola posle odobrene prijave |
| `FIVEM_HOST` | IP tvog FiveM servera (npr. `91.222.111.33`) |
| `FIVEM_CONNECT` | adresa za `/ip` (npr. `cfx.re/join/abcd12`) |
| `TEMP_VOICE_CHANNEL_ID` | glasovni kanal "Napravi sobu" |

---

## 4️⃣ Komande koje pokrećeš JEDNOM (kao Owner)

Kad se bot pokrene, u odgovarajućim kanalima ukucaj redom:

| Gde | Komanda | Šta radi |
|---|---|---|
| `#verifikacija` | `/verifikacija` | panel sa pravilima + dugme |
| `#whitelist-prijava` | `/prijava panel` | panel sa whitelist formom |
| `#tiket-panel` | `/ticket panel` | meni sa 6 kategorija tiketa |
| `#sugestije` | `/sugestije` | panel za sugestije |
| `#status-servera` | `/status panel` | **live** status FiveM servera (osvežava se sam) |
| `#role` | `/reactionroles panel` | meni za samostalno biranje rola |

Ili sve odjednom: **`/setup`** (postavlja panele u kanale koji su podešeni u `.env`).

### Role za meni (primer)
```
/reactionroles dodaj naziv:🚗 FiveM igrač rola:@Igrač emoji:🚗 opis:Tražim ekipu za RP
/reactionroles dodaj naziv:🎮 Gamer rola:@Gamer emoji:🎮 opis:Pinguj me za gejmove
/reactionroles dodaj naziv:🎨 Dizajner rola:@Dizajner emoji:🎨 opis:Za dizajnere i klipove
```

---

## 5️⃣ Giveaway i objave

```
/giveaway start nagrada:"VIP 30 dana" trajanje:2h pobednika:2
/giveaway end id:ID_PORUKE
/giveaway reroll id:ID_PORUKE

/objava naslov:"NOVI UPDATE" tekst:"Dodali smo nove poslove..." ping:@everyone slika:URL
```

---

## 6️⃣ TikTok/YouTube "wow" tura za drugara 🎬

Kad mu budeš pokazivao, uradi ovim redom — svaki korak izgleda kao da je platio 200€:

1. **`/status prikazi`** → pokaži live broj igrača, ping listu i `connect` adresu.
2. **`/verifikacija`** → panel sa pravilima; klikni "Prihvatam" na test nalogu → rola pada sama.
3. **`/prijava panel`** → popuni whitelist prijavu → prijava ide u privatni kanal sa sve odgovorima, tim klikne **Odobri** → korisnik dobija DM *"ČESTITAMO, PRIJAVA ODOBJRENA 🔥"*.
4. **`/ticket panel`** → otvori tiket "Refundacija" → preuzmi ga dugmetom **🙋 Preuzmi** → zatvori → pokaži transkript u `#transkripti` i DM.
5. **Temp soba** → uđi u `➕ Napravi sobu` → dobiješ svoju sobu sa dugmićima (zaključaj, limit, preimenuj, preuzmi).
6. **`/giveaway start`** → pokreni sa `trajanje:1m` → sačekaj 60s → pobednik se sam proglasi.
7. **Automod** → pošalji `discord.gg/test` ili psovku → bot obriše poruku i loguje.
8. **`/stats`** → pokaži brojeve: tiketi, prijave, verifikacije, giveaway.

---

## 7️⃣ Šta sve bot ima (za "prodaju" ideje drugaru)

| Sistem | Kako se vidi |
|---|---|
| 🎫 Tiketi sa 6 RP kategorija | privatni kanal, preuzimanje, transkript, DM |
| 📝 Whitelist prijave | forma od 5 pitanja, privatni kanal, Odobri/Odbij, DM, role |
| 🛡️ Verifikacija | panel sa pravilima, klik = rola, evidencija |
| 🔥 FiveM live status | broj igrača, imena, ping, mapa, connect adresa — sam se osvežava |
| 💡 Sugestije | forma, 👍/👎 glasanje, Prihvati/Odbij |
| 🎉 Giveaway | dugme za učešće, tajmer, više pobednika, reroll |
| 🎭 Reaction roles | meni, korisnici sami biraju role |
| 🔊 Temp sobe | Napravi sobu → zaključaj/limit/preimenuj/preuzmi, briše se sama |
| 🤖 Automod | linkovi, invite, psovke, spam, mass-mention, caps |
| 📋 Logovi | brisanje/izmena poruka, role, nadimci, ulazak u glas |
| 🎨 Brending | narandžasto-crna paleta, baner, logo, sve na srpskom |
| ⚙️ `/setup` | svi paneli jednim klikom |
| 📊 `/stats` | statistika svih sistema |

---

## 8️⃣ Slike

U folderu `assets/`:
- **`balkan-blaze-banner.png`** — baner 1280×400 (za `WELCOME_BANNER_URL` ili server banner)
- **`balkan-blaze-logo.png`** — logo 512×512 (avatar bota / ikonica servera)

Za `WELCOME_BANNER_URL` treba **URL** do slike (Discord ne prima lokalni fajl). Najbrže: pošalji sliku u neki kanal na serveru → desni klik na sliku → **Copy Link**.

---

## 9️⃣ Redosled paljenja (checklist)

- [ ] Kanali i role napravljeni, ID-jevi pokupljeni
- [ ] Bot dodat sa linkom (dozvole iz koraka 2)
- [ ] Rola bota iznad svih role koje dodeljuje
- [ ] Intenti uključeni u Developer Portalu
- [ ] `.env` / Render Environment popunjen
- [ ] Deploy → u logu `✅ Bot je pokrenut!`
- [ ] `/setup` ili pojedinačni paneli poslati
- [ ] `/reactionroles dodaj` za role
- [ ] Test na drugom nalogu: verifikacija → prijava → tiket
- [ ] UptimeRobot ping na `/health` (free Render)

Kad ovo prođe — server izgleda kao da je radio ceo tim. 🔥
