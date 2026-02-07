--
-- PostgreSQL database dump
--

\restrict dMopNlFmoh1bm0e1sFVbLlrTFodFDViPAG76wolbd7siboJjrUAmIwfuxbIaQ8v

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CollaboratorRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CollaboratorRole" AS ENUM (
    'musician',
    'writer',
    'producer',
    'artist',
    'label',
    'vocalist'
);


--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'pending',
    'signed',
    'expired'
);


--
-- Name: ContractType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractType" AS ENUM (
    'digital_master_only',
    'songwriter_publishing',
    'producer_agreement',
    'label_record'
);


--
-- Name: MasterRevenueScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MasterRevenueScope" AS ENUM (
    'digital_only',
    'full'
);


--
-- Name: SplitType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SplitType" AS ENUM (
    'publishing',
    'master'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'admin',
    'collaborator'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "collaboratorId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: AccountRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AccountRequest" (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "setupToken" text,
    "tokenExpiry" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Collaborator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Collaborator" (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "middleName" text,
    "lastName" text NOT NULL,
    email text,
    "emailVerified" timestamp(3) without time zone,
    password text,
    image text,
    role public."UserRole" DEFAULT 'collaborator'::public."UserRole" NOT NULL,
    phone text,
    address text,
    "capableRoles" public."CollaboratorRole"[],
    "proAffiliation" text,
    "ipiNumber" text,
    "taxId" text,
    "publishingCompany" text,
    "managerName" text,
    "managerEmail" text,
    "managerPhone" text,
    "royaltyAccountInfo" text,
    notes text,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "facebookUrl" text,
    "instagramHandle" text,
    "spotifyArtistUrl" text,
    "tiktokHandle" text,
    "twitterHandle" text,
    "youtubeUrl" text
);


--
-- Name: Contract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contract" (
    id text NOT NULL,
    "songId" text NOT NULL,
    "collaboratorId" text NOT NULL,
    "songCollaboratorId" text NOT NULL,
    "templateType" public."ContractType" NOT NULL,
    "pdfPath" text,
    "pdfUrl" text,
    "esignatureStatus" text DEFAULT 'pending'::text,
    "esignatureDocId" text,
    "signerEmail" text,
    "signedAt" timestamp(3) without time zone,
    "revenueScope" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ContractTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContractTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    type public."ContractType" NOT NULL,
    content text NOT NULL,
    "pdfStyling" jsonb,
    "roleRestriction" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FaqSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FaqSubmission" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "readBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PublishingEntity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PublishingEntity" (
    id text NOT NULL,
    name text NOT NULL,
    "isInternal" boolean DEFAULT false NOT NULL,
    "contactName" text,
    "contactEmail" text,
    "contactPhone" text,
    address text,
    "proAffiliation" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "collaboratorId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: Song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Song" (
    id text NOT NULL,
    title text NOT NULL,
    "isrcCode" text,
    "iswcCode" text,
    "catalogNumber" text,
    "releaseDate" timestamp(3) without time zone,
    "proWorkRegistrationNumber" text,
    "publishingAdmin" text,
    "masterOwner" text,
    genre text,
    "subGenre" text,
    duration integer,
    "recordingDate" timestamp(3) without time zone,
    "recordingLocation" text,
    "publishingLocked" boolean DEFAULT false NOT NULL,
    "publishingLockedAt" timestamp(3) without time zone,
    "masterLocked" boolean DEFAULT false NOT NULL,
    "masterLockedAt" timestamp(3) without time zone,
    "labelMasterShare" numeric(5,4),
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    "promoMaterialsFolderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SongCollaborator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SongCollaborator" (
    id text NOT NULL,
    "songId" text NOT NULL,
    "collaboratorId" text NOT NULL,
    "roleInSong" public."CollaboratorRole" NOT NULL,
    "publishingOwnership" numeric(5,4),
    "masterOwnership" numeric(5,4),
    "contractStatus" public."ContractStatus" DEFAULT 'pending'::public."ContractStatus" NOT NULL,
    "contractType" public."ContractType",
    notes text,
    "addedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SongPublishingEntity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SongPublishingEntity" (
    id text NOT NULL,
    "songId" text NOT NULL,
    "publishingEntityId" text NOT NULL,
    "ownershipPercentage" numeric(5,4) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SplitHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SplitHistory" (
    id text NOT NULL,
    "songId" text NOT NULL,
    "splitType" public."SplitType" NOT NULL,
    "previousValues" jsonb NOT NULL,
    "newValues" jsonb NOT NULL,
    "changedBy" text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Account" (id, "collaboratorId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: AccountRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AccountRequest" (id, "firstName", "lastName", email, status, "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "setupToken", "tokenExpiry", "createdAt", "updatedAt") FROM stdin;
cmlbp9yt100005g72akd9o2bb	Bildge	Buldge	joyfuladam@me.com	approved	cmjkkoixw0000joigwemzvc3o	2026-02-07 02:33:56.698	\N	\N	eddf84b8798a910fc3bafb90cb81ade9f85d39a5b695e6867d13e2e0eff69146	2026-02-09 02:33:56.698	2026-02-07 02:33:42.517	2026-02-07 02:33:56.699
\.


--
-- Data for Name: Collaborator; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Collaborator" (id, "firstName", "middleName", "lastName", email, "emailVerified", password, image, role, phone, address, "capableRoles", "proAffiliation", "ipiNumber", "taxId", "publishingCompany", "managerName", "managerEmail", "managerPhone", "royaltyAccountInfo", notes, status, "createdAt", "updatedAt", "facebookUrl", "instagramHandle", "spotifyArtistUrl", "tiktokHandle", "twitterHandle", "youtubeUrl") FROM stdin;
cmjkkoixw0000joigwemzvc3o	Adam	\N	Farrell	adam@adamfarrell.com	\N	$2a$10$ME1SFbPYCFnd7he4C2DZYe4/kE/VH3i2G/VX1AXB4kAgiTMWSguom	\N	admin	7247999303	134 Glade Run Rd. Mars PA 16046	{musician,writer,producer,artist}	SOCAN	446195050	\N	River and Ember	\N	\N	\N	\N	\N	active	2025-12-24 22:15:34.628	2025-12-27 04:15:06.563	\N	\N	\N	\N	\N	\N
cmjnqq6ho00007uxmg2d4cpb9	Jake	\N	Furman	furmanjake@gmail.com	\N	\N	\N	collaborator	\N	\N	{musician,writer,artist}	ASCAP	1061399263	\N	\N	\N	\N	\N	\N	\N	active	2025-12-27 03:28:08.028	2025-12-28 03:27:38.044	\N	\N	\N	\N	\N	\N
cmjnnnf1h0000dtdrp9f9yxj9	Cedric	Charles	Conway	ecede140@gmail.com	\N	$2a$10$vxjFpBxIsgr0PliRXUQE6e//bWehJWlVE3vZTzt/gBZGFpzp/FlDy	\N	collaborator	\N	123 Anicestreet Rd. Wexford, PA, 15090	{musician,writer,producer,artist}	ASCAP	1253171186	\N	\N	\N	\N	\N	\N	\N	active	2025-12-27 02:02:00.293	2025-12-30 19:54:37.63	\N	\N	\N	\N	\N	\N
cmjs0mwxb000110mpzv43herl	Brian	\N	Schultz	bschultzjames@me.com	\N	$2a$10$aMrJtPEDxnwApqf2jlwuhuxwbZ.mtMnqH.ZJIzHB9TYUfEASVoQca	\N	collaborator	\N	\N	{musician}	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2025-12-30 03:16:36.527	2026-01-14 21:43:20.758	\N	\N	\N	\N	\N	\N
cmjqhmgjf0002zwglk82wurab	Test	G	Guy	adam@riverandember.com	\N	$2a$10$ccCrDZmC0SFjxtRMG1RVxuskDu8.0eFjZmPBNdD.Yd/2f48VzbXsa	\N	collaborator	\N	\N	{producer}	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2025-12-29 01:36:36.412	2026-01-15 15:57:08.218	\N	\N	\N	\N	\N	\N
cmjs1umco00044m43sy8ez3mz	Isaac	\N	Adamiak	\N	\N	$2a$10$KRE4eNi43ol6EpwNm1GemORUbtfGFJYOdHY5NfDVjCCzY1tJMu/WS	\N	collaborator	\N	\N	{musician}	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2025-12-30 03:50:35.689	2026-02-07 02:32:41.448	\N	\N	\N	\N	\N	\N
cmjs0m94w000010mpyzcoxne1	Kylie	\N	Tusay	\N	\N	$2a$10$RTRlx9Tq.qlAEFL4pgSRmO5o/FBEB/2ElrMI6.QfUQ9jCVhVAc/wK	\N	collaborator	\N	\N	{artist,vocalist}	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	2025-12-30 03:16:05.696	2026-02-07 03:32:16.839	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Contract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Contract" (id, "songId", "collaboratorId", "songCollaboratorId", "templateType", "pdfPath", "pdfUrl", "esignatureStatus", "esignatureDocId", "signerEmail", "signedAt", "revenueScope", "createdAt", "updatedAt") FROM stdin;
cmjpt0s5z000hblqupgxh02v6	cmjnojuv70006dtdrjl9kocze	cmjnqq6ho00007uxmg2d4cpb9	cmjnsf6ao0001gi0dst24t6iu	digital_master_only	\N	\N	pending	\N	\N	\N	null	2025-12-28 14:07:54.263	2025-12-30 21:31:06.949
cmkejwa5l0001zokde71y7hnh	cmjnojuv70006dtdrjl9kocze	cmjs0mwxb000110mpzv43herl	cmjs1qgnw00014m43s4l8yf9y	digital_master_only	\N	\N	pending	\N	\N	\N	null	2026-01-14 21:46:42.154	2026-01-14 21:48:57.081
cmjpsaclk0003blqu0or1uq8k	cmjnojuv70006dtdrjl9kocze	cmjnnnf1h0000dtdrp9f9yxj9	cmjnok3z60008dtdrgsf6aaq2	digital_master_only	\N	\N	pending	\N	\N	\N	null	2025-12-28 13:47:21.033	2026-02-02 03:36:55.662
cmjptd433000nblquzberp52m	cmjnojuv70006dtdrjl9kocze	cmjnnnf1h0000dtdrp9f9yxj9	cmjnskltf0003gi0di4zplua7	digital_master_only	\N	\N	pending	\N	\N	\N	null	2025-12-28 14:17:29.584	2026-02-04 15:25:20.893
cmjpr1k8e00155jjtk9394hil	cmjnojuv70006dtdrjl9kocze	cmjnnnf1h0000dtdrp9f9yxj9	cmjnok3z7000adtdrwp069kdf	songwriter_publishing	\N	\N	pending	\N	\N	\N	null	2025-12-28 13:12:31.406	2026-02-05 01:14:49.407
cmjp5mjcy000r5jjtkto5redw	cmjnojuv70006dtdrjl9kocze	cmjnqq6ho00007uxmg2d4cpb9	cmjnr1syc0001tmxvp4h5brhd	songwriter_publishing	\N	\N	pending	\N	\N	\N	null	2025-12-28 03:12:58.498	2026-02-05 04:13:03.579
cmjpszxjj0009blqueycxswik	cmjnojuv70006dtdrjl9kocze	cmjkkoixw0000joigwemzvc3o	cmjnq89l1000111yquz01t3ni	digital_master_only	\N	\N	pending	cbbfb22b-54a1-4725-878a-97db3b0a5534	adam@adamfarrell.com	\N	null	2025-12-28 14:07:14.575	2026-02-06 05:14:33.578
cmjslucpj000912qr4l5olrl7	cmjnojuv70006dtdrjl9kocze	cmjs0m94w000010mpyzcoxne1	cmjs1rc3i00034m436pih6q8k	digital_master_only	\N	\N	pending	\N	\N	\N	null	2025-12-30 13:10:15.512	2026-02-07 02:38:37.499
cmjsls5qk000112qrp1nkagn6	cmjnojuv70006dtdrjl9kocze	cmjs1umco00044m43sy8ez3mz	cmjs1v6jn00064m43djlihuzf	digital_master_only	\N	\N	pending	\N	\N	\N	null	2025-12-30 13:08:33.163	2026-02-07 02:47:57.389
\.


--
-- Data for Name: ContractTemplate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContractTemplate" (id, name, type, content, "pdfStyling", "roleRestriction", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FaqSubmission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FaqSubmission" (id, name, email, subject, message, read, "readAt", "readBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PublishingEntity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PublishingEntity" (id, name, "isInternal", "contactName", "contactEmail", "contactPhone", address, "proAffiliation", notes, "createdAt", "updatedAt") FROM stdin;
cmjnp2x930000muacpvfl8b2f	River & Ember Publishing	t	\N	\N	\N	\N	\N	Default internal publishing entity for River & Ember	2025-12-27 02:42:03.352	2025-12-27 02:42:03.352
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "sessionToken", "collaboratorId", expires) FROM stdin;
\.


--
-- Data for Name: Song; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Song" (id, title, "isrcCode", "iswcCode", "catalogNumber", "releaseDate", "proWorkRegistrationNumber", "publishingAdmin", "masterOwner", genre, "subGenre", duration, "recordingDate", "recordingLocation", "publishingLocked", "publishingLockedAt", "masterLocked", "masterLockedAt", "labelMasterShare", status, notes, "promoMaterialsFolderId", "createdAt", "updatedAt") FROM stdin;
cmjnojuv70006dtdrjl9kocze	Behold The Lamb	AUQ9D2614904	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2026-02-07 16:24:42.879	t	2026-02-07 16:24:45.996	0.5000	active	Verse\nWhat kind of King is this? Word of God now in flesh\nTraded glory to be lowly, Bowing to His Father's will\n\nVerse\nHumbly He left His throne, Put on a crown of thorns,\nTook the lashing  bore the beating, Suffered on a sinner's cross\n\nChorus\nJe-sus,  Jesus,\nNo other Name is worthy, No other Name is worthy\n\nVerse\nVeiled in a tomb he laid, Wrapped in my sin and shame,\nThere the weight of all transgressions, Met the One who shatters chains\n\nVerse\nThen on that glorious day, He rose up from that grave,\nHallelujah  holy  holy, Now for - ever He shall reign\n\nBridge\nBehold the Lamb with scars on His hands,\nFrom the nails that He took for me,\nBehold the man who suffered and bled,\nOn a cross that was meant for me\n	1kQNybYcqEB4OaHf7BsQ1kKAm72WHV6JD	2025-12-27 02:27:13.796	2026-02-07 16:24:45.997
\.


--
-- Data for Name: SongCollaborator; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SongCollaborator" (id, "songId", "collaboratorId", "roleInSong", "publishingOwnership", "masterOwnership", "contractStatus", "contractType", notes, "addedDate") FROM stdin;
cmjnok3z60008dtdrgsf6aaq2	cmjnojuv70006dtdrjl9kocze	cmjnnnf1h0000dtdrp9f9yxj9	producer	\N	0.0500	pending	\N	\N	2025-12-27 02:27:25.602
cmjnq89l1000111yquz01t3ni	cmjnojuv70006dtdrjl9kocze	cmjkkoixw0000joigwemzvc3o	producer	\N	0.0500	pending	\N	\N	2025-12-27 03:14:12.23
cmjs1qgnw00014m43s4l8yf9y	cmjnojuv70006dtdrjl9kocze	cmjs0mwxb000110mpzv43herl	musician	\N	0.0150	pending	\N	\N	2025-12-30 03:47:21.691
cmjs1v6jn00064m43djlihuzf	cmjnojuv70006dtdrjl9kocze	cmjs1umco00044m43sy8ez3mz	musician	\N	0.0100	pending	\N	\N	2025-12-30 03:51:01.86
cmjs1rc3i00034m436pih6q8k	cmjnojuv70006dtdrjl9kocze	cmjs0m94w000010mpyzcoxne1	vocalist	\N	0.0150	pending	\N	\N	2025-12-30 03:48:02.43
cmjnok3z7000adtdrwp069kdf	cmjnojuv70006dtdrjl9kocze	cmjnnnf1h0000dtdrp9f9yxj9	writer	0.2500	\N	pending	\N	\N	2025-12-27 02:27:25.602
cmjnr1syc0001tmxvp4h5brhd	cmjnojuv70006dtdrjl9kocze	cmjnqq6ho00007uxmg2d4cpb9	writer	0.2500	\N	pending	\N	\N	2025-12-27 03:37:10.356
cmjnsf6ao0001gi0dst24t6iu	cmjnojuv70006dtdrjl9kocze	cmjnqq6ho00007uxmg2d4cpb9	artist	0.0000	0.1800	pending	\N	\N	2025-12-27 04:15:33.792
cmjnskltf0003gi0di4zplua7	cmjnojuv70006dtdrjl9kocze	cmjnnnf1h0000dtdrp9f9yxj9	artist	0.0000	0.1800	pending	\N	\N	2025-12-27 04:19:47.188
\.


--
-- Data for Name: SongPublishingEntity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SongPublishingEntity" (id, "songId", "publishingEntityId", "ownershipPercentage", notes, "createdAt", "updatedAt") FROM stdin;
cmlciylv30001wyapsbqq416z	cmjnojuv70006dtdrjl9kocze	cmjnp2x930000muacpvfl8b2f	0.5000	\N	2026-02-07 16:24:41.007	2026-02-07 16:24:41.007
\.


--
-- Data for Name: SplitHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SplitHistory" (id, "songId", "splitType", "previousValues", "newValues", "changedBy", "timestamp") FROM stdin;
\.


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.


--
-- Name: AccountRequest AccountRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AccountRequest"
    ADD CONSTRAINT "AccountRequest_pkey" PRIMARY KEY (id);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Collaborator Collaborator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Collaborator"
    ADD CONSTRAINT "Collaborator_pkey" PRIMARY KEY (id);


--
-- Name: ContractTemplate ContractTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContractTemplate"
    ADD CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Contract Contract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_pkey" PRIMARY KEY (id);


--
-- Name: FaqSubmission FaqSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FaqSubmission"
    ADD CONSTRAINT "FaqSubmission_pkey" PRIMARY KEY (id);


--
-- Name: PublishingEntity PublishingEntity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PublishingEntity"
    ADD CONSTRAINT "PublishingEntity_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: SongCollaborator SongCollaborator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SongCollaborator"
    ADD CONSTRAINT "SongCollaborator_pkey" PRIMARY KEY (id);


--
-- Name: SongPublishingEntity SongPublishingEntity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SongPublishingEntity"
    ADD CONSTRAINT "SongPublishingEntity_pkey" PRIMARY KEY (id);


--
-- Name: Song Song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Song"
    ADD CONSTRAINT "Song_pkey" PRIMARY KEY (id);


--
-- Name: SplitHistory SplitHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SplitHistory"
    ADD CONSTRAINT "SplitHistory_pkey" PRIMARY KEY (id);


--
-- Name: AccountRequest_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountRequest_createdAt_idx" ON public."AccountRequest" USING btree ("createdAt");


--
-- Name: AccountRequest_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountRequest_email_idx" ON public."AccountRequest" USING btree (email);


--
-- Name: AccountRequest_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AccountRequest_email_key" ON public."AccountRequest" USING btree (email);


--
-- Name: AccountRequest_setupToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AccountRequest_setupToken_key" ON public."AccountRequest" USING btree ("setupToken");


--
-- Name: AccountRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AccountRequest_status_idx" ON public."AccountRequest" USING btree (status);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Collaborator_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Collaborator_email_key" ON public."Collaborator" USING btree (email);


--
-- Name: ContractTemplate_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ContractTemplate_type_key" ON public."ContractTemplate" USING btree (type);


--
-- Name: Contract_collaboratorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contract_collaboratorId_idx" ON public."Contract" USING btree ("collaboratorId");


--
-- Name: Contract_esignatureStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contract_esignatureStatus_idx" ON public."Contract" USING btree ("esignatureStatus");


--
-- Name: Contract_songCollaboratorId_templateType_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Contract_songCollaboratorId_templateType_key" ON public."Contract" USING btree ("songCollaboratorId", "templateType");


--
-- Name: Contract_songId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contract_songId_idx" ON public."Contract" USING btree ("songId");


--
-- Name: FaqSubmission_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FaqSubmission_createdAt_idx" ON public."FaqSubmission" USING btree ("createdAt");


--
-- Name: FaqSubmission_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FaqSubmission_read_idx" ON public."FaqSubmission" USING btree (read);


--
-- Name: PublishingEntity_isInternal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PublishingEntity_isInternal_idx" ON public."PublishingEntity" USING btree ("isInternal");


--
-- Name: PublishingEntity_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PublishingEntity_name_idx" ON public."PublishingEntity" USING btree (name);


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: SongCollaborator_collaboratorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SongCollaborator_collaboratorId_idx" ON public."SongCollaborator" USING btree ("collaboratorId");


--
-- Name: SongCollaborator_songId_collaboratorId_roleInSong_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SongCollaborator_songId_collaboratorId_roleInSong_key" ON public."SongCollaborator" USING btree ("songId", "collaboratorId", "roleInSong");


--
-- Name: SongCollaborator_songId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SongCollaborator_songId_idx" ON public."SongCollaborator" USING btree ("songId");


--
-- Name: SongPublishingEntity_publishingEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SongPublishingEntity_publishingEntityId_idx" ON public."SongPublishingEntity" USING btree ("publishingEntityId");


--
-- Name: SongPublishingEntity_songId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SongPublishingEntity_songId_idx" ON public."SongPublishingEntity" USING btree ("songId");


--
-- Name: SongPublishingEntity_songId_publishingEntityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SongPublishingEntity_songId_publishingEntityId_key" ON public."SongPublishingEntity" USING btree ("songId", "publishingEntityId");


--
-- Name: Song_isrcCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Song_isrcCode_key" ON public."Song" USING btree ("isrcCode");


--
-- Name: SplitHistory_songId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SplitHistory_songId_idx" ON public."SplitHistory" USING btree ("songId");


--
-- Name: SplitHistory_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SplitHistory_timestamp_idx" ON public."SplitHistory" USING btree ("timestamp");


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_collaboratorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES public."Collaborator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contract Contract_songCollaboratorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_songCollaboratorId_fkey" FOREIGN KEY ("songCollaboratorId") REFERENCES public."SongCollaborator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contract Contract_songId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contract"
    ADD CONSTRAINT "Contract_songId_fkey" FOREIGN KEY ("songId") REFERENCES public."Song"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_collaboratorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES public."Collaborator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SongCollaborator SongCollaborator_collaboratorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SongCollaborator"
    ADD CONSTRAINT "SongCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES public."Collaborator"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SongCollaborator SongCollaborator_songId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SongCollaborator"
    ADD CONSTRAINT "SongCollaborator_songId_fkey" FOREIGN KEY ("songId") REFERENCES public."Song"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SongPublishingEntity SongPublishingEntity_publishingEntityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SongPublishingEntity"
    ADD CONSTRAINT "SongPublishingEntity_publishingEntityId_fkey" FOREIGN KEY ("publishingEntityId") REFERENCES public."PublishingEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SongPublishingEntity SongPublishingEntity_songId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SongPublishingEntity"
    ADD CONSTRAINT "SongPublishingEntity_songId_fkey" FOREIGN KEY ("songId") REFERENCES public."Song"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SplitHistory SplitHistory_songId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SplitHistory"
    ADD CONSTRAINT "SplitHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES public."Song"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dMopNlFmoh1bm0e1sFVbLlrTFodFDViPAG76wolbd7siboJjrUAmIwfuxbIaQ8v

